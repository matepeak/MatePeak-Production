import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Info, 
  Globe,
  Clock,
  Heart,
  Palette,
  Briefcase,
  GraduationCap,
  Code,
  BookOpen,
  TrendingUp,
  Users,
  CheckCircle2,
  Sparkles
} from "lucide-react";

interface ProfileAboutProps {
  mentor: any;
}

export default function ProfileAbout({ mentor }: ProfileAboutProps) {
  // Map categories to their icons
  const categoryIcons: Record<string, any> = {
    "Mental Health": Heart,
    "Creative Arts": Palette,
    "Career Coaching": Briefcase,
    "Academic Support": GraduationCap,
    "Programming & Tech": Code,
    "Test Preparation": BookOpen,
    "Business & Finance": TrendingUp,
    "Leadership & Development": Users,
  };

  const getIconForCategory = (category: string) => {
    return categoryIcons[category] || Briefcase;
  };

  return (
    <div className="space-y-6">
      {/* Full Bio */}
      {mentor.bio && (
        <Card className="shadow-sm border-0 bg-gray-50 rounded-2xl">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Info className="h-5 w-5 text-gray-600" />
              <h2 className="text-lg font-semibold text-gray-900">About Me</h2>
            </div>
            <p className="text-gray-700 leading-relaxed whitespace-pre-line text-sm">
              {mentor.bio}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Categories/Expertise */}
      {mentor.categories && mentor.categories.length > 0 && (
        <Card className="shadow-sm border-0 bg-gray-50 rounded-2xl">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="h-5 w-5 text-gray-600" />
              <h2 className="text-lg font-semibold text-gray-900">Primary Expertise</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {mentor.categories.map((category: string) => {
                const IconComponent = getIconForCategory(category);
                return (
                  <div
                    key={category}
                    className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 bg-white text-gray-900 text-sm hover:border-gray-300 transition-colors"
                  >
                    <div className="flex-shrink-0 h-8 w-8 rounded-lg bg-gray-100 flex items-center justify-center">
                      <IconComponent className="h-4 w-4 text-gray-700" />
                    </div>
                    <span className="font-medium">{category}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Skills */}
      {((mentor.skills && mentor.skills.length > 0) || (mentor.expertise_tags && mentor.expertise_tags.length > 0)) && (
        <Card className="shadow-sm border-0 bg-gray-50 rounded-2xl">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Code className="h-5 w-5 text-gray-600" />
              <h2 className="text-lg font-semibold text-gray-900">Skills</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {/* Show skills field (from current onboarding) or fallback to expertise_tags (from old onboarding) */}
              {(mentor.skills && mentor.skills.length > 0 ? mentor.skills : mentor.expertise_tags).map((skill: string) => (
                <Badge
                  key={skill}
                  variant="secondary"
                  className="px-3 py-1 bg-white text-gray-700 border border-gray-200 font-normal text-xs"
                >
                  {skill}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Professional Details */}
      {(mentor.experience > 0 || (mentor.services && Object.keys(mentor.services).length > 0)) && (
        <Card className="shadow-sm border-0 bg-gray-50 rounded-2xl">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Briefcase className="h-5 w-5 text-gray-600" />
              <h2 className="text-lg font-semibold text-gray-900">Professional Details</h2>
            </div>

            <div className="space-y-4">
              {/* Experience */}
              {mentor.experience > 0 && (
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 h-8 w-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center mt-0.5">
                    <Clock className="h-4 w-4 text-gray-600" />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900 text-sm mb-1">Experience</h3>
                    <p className="text-gray-600 text-sm">{mentor.experience}+ years of professional experience</p>
                  </div>
                </div>
              )}

              {/* Services Offered */}
              {mentor.services && Object.keys(mentor.services).length > 0 && (
                <>
                  {mentor.experience > 0 && <Separator />}
                  <div>
                    <h3 className="font-medium text-gray-900 text-sm mb-3">Available Services</h3>
                    <div className="grid gap-2">
                      {mentor.services.oneOnOneSession && (
                        <div className="flex items-center gap-2 text-gray-700 text-sm">
                          <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                          <span>One-on-One Mentoring Sessions</span>
                        </div>
                      )}
                      {mentor.services.chatAdvice && (
                        <div className="flex items-center gap-2 text-gray-700 text-sm">
                          <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                          <span>Chat-Based Advice</span>
                        </div>
                      )}
                      {mentor.services.digitalProducts && (
                        <div className="flex items-center gap-2 text-gray-700 text-sm">
                          <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                          <span>Digital Products & Resources</span>
                        </div>
                      )}
                      {mentor.services.notes && (
                        <div className="flex items-center gap-2 text-gray-700 text-sm">
                          <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                          <span>Notes & Study Materials</span>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Social Links */}
      {mentor.social_links && Object.keys(mentor.social_links).some(key => mentor.social_links[key]) && (
        <Card className="shadow-sm border-0 bg-gray-50 rounded-2xl">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Globe className="h-5 w-5 text-gray-600" />
              <h2 className="text-lg font-semibold text-gray-900">Connect Online</h2>
            </div>

            <div className="grid gap-3">
              {mentor.social_links.linkedin && (
                <a
                  href={mentor.social_links.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200 hover:border-gray-300 transition-colors group"
                >
                  <div className="h-9 w-9 rounded-lg bg-gray-100 flex items-center justify-center group-hover:bg-gray-200 transition-colors">
                    <Globe className="h-4 w-4 text-gray-600" />
                  </div>
                  <div className="flex-grow">
                    <p className="font-medium text-gray-900 text-sm">LinkedIn</p>
                    <p className="text-xs text-gray-500">Professional profile</p>
                  </div>
                  <div className="text-gray-400 group-hover:text-gray-600 transition-colors">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </a>
              )}

              {mentor.social_links.twitter && (
                <a
                  href={mentor.social_links.twitter}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200 hover:border-gray-300 transition-colors group"
                >
                  <div className="h-9 w-9 rounded-lg bg-gray-100 flex items-center justify-center group-hover:bg-gray-200 transition-colors">
                    <Globe className="h-4 w-4 text-gray-600" />
                  </div>
                  <div className="flex-grow">
                    <p className="font-medium text-gray-900 text-sm">Twitter</p>
                    <p className="text-xs text-gray-500">Follow for updates</p>
                  </div>
                  <div className="text-gray-400 group-hover:text-gray-600 transition-colors">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </a>
              )}

              {mentor.social_links.website && (
                <a
                  href={mentor.social_links.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200 hover:border-gray-300 transition-colors group"
                >
                  <div className="h-9 w-9 rounded-lg bg-gray-100 flex items-center justify-center group-hover:bg-gray-200 transition-colors">
                    <Globe className="h-4 w-4 text-gray-600" />
                  </div>
                  <div className="flex-grow">
                    <p className="font-medium text-gray-900 text-sm">Website</p>
                    <p className="text-xs text-gray-500">Visit my website</p>
                  </div>
                  <div className="text-gray-400 group-hover:text-gray-600 transition-colors">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </a>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}