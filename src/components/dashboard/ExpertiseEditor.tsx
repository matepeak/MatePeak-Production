import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { Loader2, Save, Check, Tag, Briefcase, GraduationCap, Heart, Code, BookOpen, Palette, TrendingUp, Users } from "lucide-react";
import { cn } from "@/lib/utils";

// Define expertise options with icons and specialized tags
const expertiseOptions = [
  { 
    value: "Career Coaching", 
    icon: Briefcase, 
    description: "Resume, interviews, and job search tips",
    borderColor: "border-blue-300",
    hoverBg: "hover:bg-blue-50",
    iconColor: "text-blue-500",
    tags: [
      "Resume Writing", "Interview Preparation", "LinkedIn Optimization", 
      "Career Transition", "Salary Negotiation", "Personal Branding",
      "Job Search Strategy", "Networking", "Professional Development"
    ]
  },
  { 
    value: "Academic Support", 
    icon: GraduationCap, 
    description: "Study skills, tutoring, and academic guidance",
    borderColor: "border-purple-300",
    hoverBg: "hover:bg-purple-50",
    iconColor: "text-purple-500",
    tags: [
      "Mathematics", "Science", "English Literature", "Essay Writing",
      "Study Skills", "Time Management", "Exam Preparation", "Homework Help",
      "Critical Thinking", "Research Methods"
    ]
  },
  { 
    value: "Mental Health", 
    icon: Heart, 
    description: "Wellness coaching and emotional support",
    borderColor: "border-pink-300",
    hoverBg: "hover:bg-pink-50",
    iconColor: "text-pink-500",
    tags: [
      "Stress Management", "Anxiety Support", "Mindfulness", "Self-Care",
      "Work-Life Balance", "Confidence Building", "Goal Setting",
      "Emotional Intelligence", "Resilience Training"
    ]
  },
  { 
    value: "Programming & Tech", 
    icon: Code, 
    description: "Coding, software development, and tech skills",
    borderColor: "border-green-300",
    hoverBg: "hover:bg-green-50",
    iconColor: "text-green-500",
    tags: [
      "Web Development", "Python", "JavaScript", "React", "Data Science",
      "Machine Learning", "Mobile Development", "DevOps", "Database Design",
      "Algorithms", "System Design", "Cloud Computing", "Cybersecurity"
    ]
  },
  { 
    value: "Test Preparation", 
    icon: BookOpen, 
    description: "SAT, GRE, and standardized test prep",
    borderColor: "border-teal-300",
    hoverBg: "hover:bg-teal-50",
    iconColor: "text-teal-500",
    tags: [
      "SAT Prep", "GRE Prep", "GMAT Prep", "IELTS", "TOEFL",
      "ACT Prep", "MCAT", "LSAT", "Test Strategy", "Time Management"
    ]
  },
  { 
    value: "Creative Arts", 
    icon: Palette, 
    description: "Design, music, writing, and creative skills",
    borderColor: "border-indigo-300",
    hoverBg: "hover:bg-indigo-50",
    iconColor: "text-indigo-500",
    tags: [
      "Graphic Design", "UI/UX Design", "Creative Writing", "Music Theory",
      "Photography", "Video Editing", "Digital Art", "Animation",
      "Content Creation", "Storytelling"
    ]
  },
  { 
    value: "Business & Finance", 
    icon: TrendingUp, 
    description: "Entrepreneurship, investing, and business strategy",
    borderColor: "border-orange-300",
    hoverBg: "hover:bg-orange-50",
    iconColor: "text-orange-500",
    tags: [
      "Entrepreneurship", "Business Strategy", "Financial Planning",
      "Investment Basics", "Marketing", "Sales", "Accounting",
      "Business Analytics", "Startup Advice", "Fundraising"
    ]
  },
  { 
    value: "Leadership & Development", 
    icon: Users, 
    description: "Personal growth and leadership coaching",
    borderColor: "border-yellow-300",
    hoverBg: "hover:bg-yellow-50",
    iconColor: "text-yellow-600",
    tags: [
      "Leadership Skills", "Team Management", "Public Speaking",
      "Communication Skills", "Conflict Resolution", "Decision Making",
      "Personal Growth", "Productivity", "Coaching Skills"
    ]
  },
];

interface ExpertiseEditorProps {
  mentorProfile: any;
  onProfileUpdate: (profile: any) => void;
  isEditing: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSaveSuccess: () => void;
}

const ExpertiseEditor = ({
  mentorProfile,
  onProfileUpdate,
  isEditing,
  onStartEdit,
  onCancelEdit,
  onSaveSuccess,
}: ExpertiseEditorProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [showDiscardDialog, setShowDiscardDialog] = useState(false);

  const mapProfileToCategories = (profile: any): string[] =>
    profile.categories || (profile.category ? [profile.category] : []);

  const mapProfileToTags = (profile: any): string[] => profile.expertise_tags || [];
  
  // Initialize state with existing data
  const [selectedCategories, setSelectedCategories] = useState<string[]>(mapProfileToCategories(mentorProfile));
  const [selectedTags, setSelectedTags] = useState<string[]>(mapProfileToTags(mentorProfile));
  const [baselineCategories, setBaselineCategories] = useState<string[]>(mapProfileToCategories(mentorProfile));
  const [baselineTags, setBaselineTags] = useState<string[]>(mapProfileToTags(mentorProfile));

  const hasUnsavedChanges = () => {
    const sortedSelectedCategories = [...selectedCategories].sort();
    const sortedBaselineCategories = [...baselineCategories].sort();
    const sortedSelectedTags = [...selectedTags].sort();
    const sortedBaselineTags = [...baselineTags].sort();

    return (
      JSON.stringify(sortedSelectedCategories) !== JSON.stringify(sortedBaselineCategories) ||
      JSON.stringify(sortedSelectedTags) !== JSON.stringify(sortedBaselineTags)
    );
  };

  useEffect(() => {
    const categories = mapProfileToCategories(mentorProfile);
    const tags = mapProfileToTags(mentorProfile);
    setBaselineCategories(categories);
    setBaselineTags(tags);

    if (!isEditing) {
      setSelectedCategories(categories);
      setSelectedTags(tags);
    }
  }, [mentorProfile, isEditing]);

  // Get available tags based on selected categories
  const availableTags = selectedCategories.length > 0 
    ? expertiseOptions
        .filter(opt => selectedCategories.includes(opt.value))
        .flatMap(opt => opt.tags)
    : [];

  const toggleCategory = (category: string) => {
    if (!isEditing) return;

    setSelectedCategories(prev => {
      const newCategories = prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category];
      
      // Remove tags that are no longer available
      if (prev.includes(category)) {
        const removedOption = expertiseOptions.find(opt => opt.value === category);
        if (removedOption) {
          setSelectedTags(currentTags => 
            currentTags.filter(tag => !removedOption.tags.includes(tag))
          );
        }
      }
      
      return newCategories;
    });
  };

  const toggleTag = (tag: string) => {
    if (!isEditing) return;

    setSelectedTags(prev =>
      prev.includes(tag)
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  const handleCancel = () => {
    if (!hasUnsavedChanges()) {
      onCancelEdit();
      return;
    }

    setShowDiscardDialog(true);
  };

  const confirmDiscard = () => {
    setSelectedCategories(baselineCategories);
    setSelectedTags(baselineTags);
    setShowDiscardDialog(false);
    onCancelEdit();
  };

  const handleSave = async () => {
    if (!isEditing) {
      return;
    }

    if (selectedCategories.length === 0) {
      toast({
        title: "Expertise required",
        description: "Please select at least one area of expertise",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);

      const { data, error } = await supabase
        .from("expert_profiles")
        .update({
          categories: selectedCategories,
          category: selectedCategories[0], // Keep for backward compatibility
          expertise_tags: selectedTags,
          updated_at: new Date().toISOString(),
        })
        .eq("id", mentorProfile.id)
        .select()
        .single();

      if (error) throw error;

      onProfileUpdate(data);
      const nextCategories = mapProfileToCategories(data);
      const nextTags = mapProfileToTags(data);
      setBaselineCategories(nextCategories);
      setBaselineTags(nextTags);
      setSelectedCategories(nextCategories);
      setSelectedTags(nextTags);
      onSaveSuccess();

      toast({
        title: "Expertise updated",
        description: "Your areas of expertise have been updated successfully",
      });
    } catch (error: any) {
      console.error("Error updating expertise:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update expertise. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-gray-200 shadow-sm">
      <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-white rounded-lg shadow-sm">
              <Briefcase className="w-5 h-5 text-gray-700" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Areas of Expertise
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                Select your expertise areas and specific skills to help students find you
              </p>
            </div>
          </div>
          {!isEditing && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onStartEdit}
              className="border-gray-300 hover:border-gray-400"
            >
              Edit
            </Button>
          )}
        </div>
      </div>
      <CardContent className="p-6 space-y-6">
        {/* Expertise Categories */}
        <div className="space-y-4">
          <div>
            <Label className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              Expertise Areas 
              <span className="text-red-500 text-xs">*</span>
            </Label>
            <p className="text-xs text-gray-500 mt-1.5">
              Choose all areas where you can provide mentorship
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {expertiseOptions.map((option) => {
              const Icon = option.icon;
              const isSelected = selectedCategories.includes(option.value);
              
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => toggleCategory(option.value)}
                  disabled={!isEditing || loading}
                  className={cn(
                    "relative p-4 rounded-xl border-2 text-left transition-all duration-200 group",
                    !isEditing && "cursor-not-allowed opacity-85",
                    isSelected
                      ? "bg-gray-50 border-gray-900 shadow-md hover:shadow-lg"
                      : "bg-white border-gray-200 hover:border-gray-300 hover:shadow-sm"
                  )}
                >
                  {isSelected && (
                    <div className="absolute top-3 right-3">
                      <div className="w-6 h-6 bg-gray-900 rounded-full flex items-center justify-center shadow-sm">
                        <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />
                      </div>
                    </div>
                  )}
                  <div className="flex items-start gap-3 pr-8">
                    <div className={cn(
                      "p-2.5 rounded-lg transition-colors",
                      isSelected ? "bg-white shadow-sm" : "bg-gray-50 group-hover:bg-gray-100"
                    )}>
                      <Icon className={cn("w-5 h-5", option.iconColor)} />
                    </div>
                    <div className="flex-1 min-w-0 pt-0.5">
                      <p className="font-semibold text-gray-900 text-sm mb-1">
                        {option.value}
                      </p>
                      <p className="text-xs text-gray-600 leading-relaxed">
                        {option.description}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Expertise Tags */}
        {availableTags.length > 0 && (
          <div className="space-y-4 pt-6 border-t border-gray-100">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <Label className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                  <Tag className="w-4 h-4 text-gray-600" />
                  Specific Skills & Specializations
                </Label>
                <p className="text-xs text-gray-500 mt-1.5">
                  Highlight your specific skills to attract the right students
                </p>
              </div>
              {selectedTags.length > 0 && (
                <Badge 
                  variant="secondary" 
                  className="bg-gray-900 text-white hover:bg-gray-800 px-3 py-1 text-xs font-medium"
                >
                  {selectedTags.length} selected
                </Badge>
              )}
            </div>
            
            <div className="flex flex-wrap gap-2">
              {availableTags.map((tag) => {
                const isSelected = selectedTags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    disabled={!isEditing || loading}
                    className={cn(
                      "px-4 py-2 rounded-lg text-xs font-medium transition-all duration-200",
                      "border",
                      !isEditing && "cursor-not-allowed opacity-85",
                      isSelected
                        ? "bg-gray-900 text-white border-gray-900 shadow-sm hover:shadow-md hover:bg-gray-800"
                        : "bg-white text-gray-700 border-gray-200 hover:border-gray-300 hover:bg-gray-50 hover:shadow-sm"
                    )}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Summary & Save Section */}
        <div className="pt-6 border-t border-gray-100">
          {selectedCategories.length > 0 && (
            <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex items-center gap-2 mb-2">
                <Check className="w-4 h-4 text-green-600" />
                <p className="text-sm font-semibold text-gray-900">Your Expertise Summary</p>
              </div>
              <div className="space-y-1.5">
                <p className="text-xs text-gray-600">
                  <span className="font-medium text-gray-900">{selectedCategories.length}</span> expertise area{selectedCategories.length !== 1 ? 's' : ''} selected
                </p>
                {selectedTags.length > 0 && (
                  <p className="text-xs text-gray-600">
                    <span className="font-medium text-gray-900">{selectedTags.length}</span> specific skill{selectedTags.length !== 1 ? 's' : ''} highlighted
                  </p>
                )}
              </div>
            </div>
          )}
          
          {isEditing ? (
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                disabled={loading}
                className="border-gray-300 hover:border-gray-400"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={loading || selectedCategories.length === 0}
                size="lg"
                className="bg-gray-900 hover:bg-gray-800 text-white shadow-sm hover:shadow-md transition-all duration-200"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving Changes...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Expertise
                  </>
                )}
              </Button>
            </div>
          ) : (
            <p className="text-xs text-gray-500 text-right">Click Edit to update your expertise settings.</p>
          )}
        </div>
      </CardContent>

      <ConfirmationDialog
        open={showDiscardDialog}
        onOpenChange={setShowDiscardDialog}
        onConfirm={confirmDiscard}
        title="Discard unsaved changes?"
        description="You have unsaved expertise changes. Discard them and exit edit mode?"
        confirmText="Discard"
        cancelText="Keep Editing"
      />
    </Card>
  );
};

export default ExpertiseEditor;
