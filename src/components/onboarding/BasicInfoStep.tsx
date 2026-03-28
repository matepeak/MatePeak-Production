
import { useState, useEffect, useCallback } from "react";
import { UseFormReturn } from "react-hook-form";
import { Plus, Trash2, Check, X, Loader2, GraduationCap, Heart, Code, BookOpen, Palette, TrendingUp, Users, Briefcase } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
    ],
    skills: [
      "Communication", "Networking", "Negotiation", "Public Speaking", "Writing",
      "Strategic Planning", "Decision Making", "Problem Solving", "Time Management",
      "Leadership", "Presentation Skills", "Customer Service", "Sales", "Marketing"
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
    ],
    skills: [
      "Critical Thinking", "Research", "Writing", "Analytical Skills", "Problem Solving",
      "Time Management", "Communication", "Presentation Skills", "Technical Writing",
      "Data Analysis", "Adaptability", "Mentoring"
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
    ],
    skills: [
      "Emotional Intelligence", "Communication", "Empathy", "Active Listening",
      "Conflict Resolution", "Mentoring", "Adaptability", "Time Management",
      "Problem Solving", "Leadership", "Public Speaking"
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
    ],
    skills: [
      "Problem Solving", "Analytical Skills", "Critical Thinking", "Technical Writing",
      "Data Analysis", "Project Management", "Team Collaboration", "Communication",
      "Research", "Adaptability", "Quality Assurance", "Process Improvement"
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
    ],
    skills: [
      "Time Management", "Critical Thinking", "Analytical Skills", "Communication",
      "Mentoring", "Problem Solving", "Strategic Planning", "Adaptability",
      "Writing", "Research", "Presentation Skills"
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
    ],
    skills: [
      "Creative Thinking", "Communication", "Problem Solving", "Adaptability",
      "Time Management", "Attention to Detail", "Project Management",
      "Team Collaboration", "Presentation Skills", "Content Creation"
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
    ],
    skills: [
      "Strategic Planning", "Financial Analysis", "Data Analysis", "Decision Making",
      "Leadership", "Negotiation", "Communication", "Problem Solving",
      "Project Management", "Marketing", "Sales", "Analytical Skills",
      "Risk Management", "Budgeting"
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
    ],
    skills: [
      "Leadership", "Communication", "Team Collaboration", "Conflict Resolution",
      "Decision Making", "Public Speaking", "Emotional Intelligence", "Mentoring",
      "Strategic Planning", "Problem Solving", "Time Management", "Adaptability",
      "Networking", "Change Management"
    ]
  },
];

const COUNTRIES = [
  { name: "Afghanistan", flag: "🇦🇫" },
  { name: "Albania", flag: "🇦🇱" },
  { name: "Algeria", flag: "🇩🇿" },
  { name: "Andorra", flag: "🇦🇩" },
  { name: "Angola", flag: "🇦🇴" },
  { name: "Argentina", flag: "🇦🇷" },
  { name: "Armenia", flag: "🇦🇲" },
  { name: "Australia", flag: "🇦🇺" },
  { name: "Austria", flag: "🇦🇹" },
  { name: "Azerbaijan", flag: "🇦🇿" },
  { name: "Bahamas", flag: "🇧🇸" },
  { name: "Bahrain", flag: "🇧🇭" },
  { name: "Bangladesh", flag: "🇧🇩" },
  { name: "Barbados", flag: "🇧🇧" },
  { name: "Belarus", flag: "🇧🇾" },
  { name: "Belgium", flag: "🇧🇪" },
  { name: "Belize", flag: "🇧🇿" },
  { name: "Benin", flag: "🇧🇯" },
  { name: "Bhutan", flag: "🇧🇹" },
  { name: "Bolivia", flag: "🇧🇴" },
  { name: "Bosnia and Herzegovina", flag: "🇧🇦" },
  { name: "Botswana", flag: "🇧🇼" },
  { name: "Brazil", flag: "🇧🇷" },
  { name: "Brunei", flag: "🇧🇳" },
  { name: "Bulgaria", flag: "🇧🇬" },
  { name: "Burkina Faso", flag: "🇧🇫" },
  { name: "Burundi", flag: "🇧🇮" },
  { name: "Cambodia", flag: "🇰🇭" },
  { name: "Cameroon", flag: "🇨🇲" },
  { name: "Canada", flag: "🇨🇦" },
  { name: "Cape Verde", flag: "🇨🇻" },
  { name: "Central African Republic", flag: "🇨🇫" },
  { name: "Chad", flag: "🇹🇩" },
  { name: "Chile", flag: "🇨🇱" },
  { name: "China", flag: "🇨🇳" },
  { name: "Colombia", flag: "🇨🇴" },
  { name: "Comoros", flag: "🇰🇲" },
  { name: "Congo", flag: "🇨🇬" },
  { name: "Costa Rica", flag: "🇨🇷" },
  { name: "Croatia", flag: "🇭🇷" },
  { name: "Cuba", flag: "🇨🇺" },
  { name: "Cyprus", flag: "🇨🇾" },
  { name: "Czech Republic", flag: "🇨🇿" },
  { name: "Denmark", flag: "🇩🇰" },
  { name: "Djibouti", flag: "🇩🇯" },
  { name: "Dominica", flag: "🇩🇲" },
  { name: "Dominican Republic", flag: "🇩🇴" },
  { name: "DR Congo", flag: "🇨🇩" },
  { name: "Ecuador", flag: "🇪🇨" },
  { name: "Egypt", flag: "🇪🇬" },
  { name: "El Salvador", flag: "🇸🇻" },
  { name: "Equatorial Guinea", flag: "🇬🇶" },
  { name: "Eritrea", flag: "🇪🇷" },
  { name: "Estonia", flag: "🇪🇪" },
  { name: "Eswatini", flag: "🇸🇿" },
  { name: "Ethiopia", flag: "🇪🇹" },
  { name: "Fiji", flag: "🇫🇯" },
  { name: "Finland", flag: "🇫🇮" },
  { name: "France", flag: "🇫🇷" },
  { name: "Gabon", flag: "🇬🇦" },
  { name: "Gambia", flag: "🇬🇲" },
  { name: "Georgia", flag: "🇬🇪" },
  { name: "Germany", flag: "🇩🇪" },
  { name: "Ghana", flag: "🇬🇭" },
  { name: "Greece", flag: "🇬🇷" },
  { name: "Grenada", flag: "🇬🇩" },
  { name: "Guatemala", flag: "🇬🇹" },
  { name: "Guinea", flag: "🇬🇳" },
  { name: "Guinea-Bissau", flag: "🇬🇼" },
  { name: "Guyana", flag: "🇬🇾" },
  { name: "Haiti", flag: "🇭🇹" },
  { name: "Honduras", flag: "🇭🇳" },
  { name: "Hong Kong", flag: "🇭🇰" },
  { name: "Hungary", flag: "🇭🇺" },
  { name: "Iceland", flag: "🇮🇸" },
  { name: "India", flag: "🇮🇳" },
  { name: "Indonesia", flag: "🇮🇩" },
  { name: "Iran", flag: "🇮🇷" },
  { name: "Iraq", flag: "🇮🇶" },
  { name: "Ireland", flag: "🇮🇪" },
  { name: "Israel", flag: "🇮🇱" },
  { name: "Italy", flag: "🇮🇹" },
  { name: "Ivory Coast", flag: "🇨🇮" },
  { name: "Jamaica", flag: "🇯🇲" },
  { name: "Japan", flag: "🇯🇵" },
  { name: "Jordan", flag: "🇯🇴" },
  { name: "Kazakhstan", flag: "🇰🇿" },
  { name: "Kenya", flag: "🇰🇪" },
  { name: "Kiribati", flag: "🇰🇮" },
  { name: "Kosovo", flag: "🇽🇰" },
  { name: "Kuwait", flag: "🇰🇼" },
  { name: "Kyrgyzstan", flag: "🇰🇬" },
  { name: "Laos", flag: "🇱🇦" },
  { name: "Latvia", flag: "🇱🇻" },
  { name: "Lebanon", flag: "🇱🇧" },
  { name: "Lesotho", flag: "🇱🇸" },
  { name: "Liberia", flag: "🇱🇷" },
  { name: "Libya", flag: "🇱🇾" },
  { name: "Liechtenstein", flag: "🇱🇮" },
  { name: "Lithuania", flag: "🇱🇹" },
  { name: "Luxembourg", flag: "🇱🇺" },
  { name: "Madagascar", flag: "🇲🇬" },
  { name: "Malawi", flag: "🇲🇼" },
  { name: "Malaysia", flag: "🇲🇾" },
  { name: "Maldives", flag: "🇲🇻" },
  { name: "Mali", flag: "🇲🇱" },
  { name: "Malta", flag: "🇲🇹" },
  { name: "Marshall Islands", flag: "🇲🇭" },
  { name: "Mauritania", flag: "🇲🇷" },
  { name: "Mauritius", flag: "🇲🇺" },
  { name: "Mexico", flag: "🇲🇽" },
  { name: "Micronesia", flag: "🇫🇲" },
  { name: "Moldova", flag: "🇲🇩" },
  { name: "Monaco", flag: "🇲🇨" },
  { name: "Mongolia", flag: "🇲🇳" },
  { name: "Montenegro", flag: "🇲🇪" },
  { name: "Morocco", flag: "🇲🇦" },
  { name: "Mozambique", flag: "🇲🇿" },
  { name: "Myanmar", flag: "🇲🇲" },
  { name: "Namibia", flag: "🇳🇦" },
  { name: "Nauru", flag: "🇳🇷" },
  { name: "Nepal", flag: "🇳🇵" },
  { name: "Netherlands", flag: "🇳🇱" },
  { name: "New Zealand", flag: "🇳🇿" },
  { name: "Nicaragua", flag: "🇳🇮" },
  { name: "Niger", flag: "🇳🇪" },
  { name: "Nigeria", flag: "🇳🇬" },
  { name: "North Korea", flag: "🇰🇵" },
  { name: "North Macedonia", flag: "🇲🇰" },
  { name: "Norway", flag: "🇳🇴" },
  { name: "Oman", flag: "🇴🇲" },
  { name: "Pakistan", flag: "🇵🇰" },
  { name: "Palau", flag: "🇵🇼" },
  { name: "Palestine", flag: "🇵🇸" },
  { name: "Panama", flag: "🇵🇦" },
  { name: "Papua New Guinea", flag: "🇵🇬" },
  { name: "Paraguay", flag: "🇵🇾" },
  { name: "Peru", flag: "🇵🇪" },
  { name: "Philippines", flag: "🇵🇭" },
  { name: "Poland", flag: "🇵🇱" },
  { name: "Portugal", flag: "🇵🇹" },
  { name: "Qatar", flag: "🇶🇦" },
  { name: "Romania", flag: "🇷🇴" },
  { name: "Russia", flag: "🇷🇺" },
  { name: "Rwanda", flag: "🇷🇼" },
  { name: "Saint Kitts and Nevis", flag: "🇰🇳" },
  { name: "Saint Lucia", flag: "🇱🇨" },
  { name: "Saint Vincent and the Grenadines", flag: "🇻🇨" },
  { name: "Samoa", flag: "🇼🇸" },
  { name: "San Marino", flag: "🇸🇲" },
  { name: "Sao Tome and Principe", flag: "🇸🇹" },
  { name: "Saudi Arabia", flag: "🇸🇦" },
  { name: "Senegal", flag: "🇸🇳" },
  { name: "Serbia", flag: "🇷🇸" },
  { name: "Seychelles", flag: "🇸🇨" },
  { name: "Sierra Leone", flag: "🇸🇱" },
  { name: "Singapore", flag: "🇸🇬" },
  { name: "Slovakia", flag: "🇸🇰" },
  { name: "Slovenia", flag: "🇸🇮" },
  { name: "Solomon Islands", flag: "🇸🇧" },
  { name: "Somalia", flag: "🇸🇴" },
  { name: "South Africa", flag: "🇿🇦" },
  { name: "South Korea", flag: "🇰🇷" },
  { name: "South Sudan", flag: "🇸🇸" },
  { name: "Spain", flag: "🇪🇸" },
  { name: "Sri Lanka", flag: "🇱🇰" },
  { name: "Sudan", flag: "🇸🇩" },
  { name: "Suriname", flag: "🇸🇷" },
  { name: "Sweden", flag: "🇸🇪" },
  { name: "Switzerland", flag: "🇨🇭" },
  { name: "Syria", flag: "🇸🇾" },
  { name: "Taiwan", flag: "🇹🇼" },
  { name: "Tajikistan", flag: "🇹🇯" },
  { name: "Tanzania", flag: "🇹🇿" },
  { name: "Thailand", flag: "🇹🇭" },
  { name: "Timor-Leste", flag: "🇹🇱" },
  { name: "Togo", flag: "🇹🇬" },
  { name: "Tonga", flag: "🇹🇴" },
  { name: "Trinidad and Tobago", flag: "🇹🇹" },
  { name: "Tunisia", flag: "🇹🇳" },
  { name: "Turkey", flag: "🇹🇷" },
  { name: "Turkmenistan", flag: "🇹🇲" },
  { name: "Tuvalu", flag: "🇹🇻" },
  { name: "Uganda", flag: "🇺🇬" },
  { name: "Ukraine", flag: "🇺🇦" },
  { name: "United Arab Emirates", flag: "🇦🇪" },
  { name: "United Kingdom", flag: "🇬🇧" },
  { name: "United States", flag: "🇺🇸" },
  { name: "Uruguay", flag: "🇺🇾" },
  { name: "Uzbekistan", flag: "🇺🇿" },
  { name: "Vanuatu", flag: "🇻🇺" },
  { name: "Vatican City", flag: "🇻🇦" },
  { name: "Venezuela", flag: "🇻🇪" },
  { name: "Vietnam", flag: "🇻🇳" },
  { name: "Yemen", flag: "🇾🇪" },
  { name: "Zambia", flag: "🇿🇲" },
  { name: "Zimbabwe", flag: "🇿🇼" }
].sort((a, b) => a.name.localeCompare(b.name));

const LANGUAGES = [
  "English", "Spanish", "French", "German", "Italian", "Portuguese", "Russian", "Chinese",
  "Japanese", "Korean", "Arabic", "Hindi", "Bengali", "Urdu", "Indonesian", "Turkish",
  "Vietnamese", "Thai", "Dutch", "Swedish", "Polish", "Greek", "Hebrew"
].sort();

const LANGUAGE_LEVELS = ["Native", "Fluent", "Advanced", "Intermediate", "Basic"];

const COUNTRY_CODES = [
  { code: "+1", country: "US/Canada", flag: "🇺🇸" },
  { code: "+44", country: "United Kingdom", flag: "🇬🇧" },
  { code: "+91", country: "India", flag: "🇮🇳" },
  { code: "+86", country: "China", flag: "🇨🇳" },
  { code: "+81", country: "Japan", flag: "🇯🇵" },
  { code: "+49", country: "Germany", flag: "🇩🇪" },
  { code: "+33", country: "France", flag: "🇫🇷" },
  { code: "+39", country: "Italy", flag: "🇮🇹" },
  { code: "+34", country: "Spain", flag: "🇪🇸" },
  { code: "+61", country: "Australia", flag: "🇦🇺" },
  { code: "+7", country: "Russia", flag: "🇷🇺" },
  { code: "+82", country: "South Korea", flag: "🇰🇷" },
  { code: "+55", country: "Brazil", flag: "🇧🇷" },
  { code: "+52", country: "Mexico", flag: "🇲🇽" },
  { code: "+27", country: "South Africa", flag: "🇿🇦" },
  { code: "+234", country: "Nigeria", flag: "🇳🇬" },
  { code: "+20", country: "Egypt", flag: "🇪🇬" },
  { code: "+254", country: "Kenya", flag: "🇰🇪" },
  { code: "+65", country: "Singapore", flag: "🇸🇬" },
  { code: "+60", country: "Malaysia", flag: "🇲🇾" },
  { code: "+66", country: "Thailand", flag: "🇹🇭" },
  { code: "+62", country: "Indonesia", flag: "🇮🇩" },
  { code: "+63", country: "Philippines", flag: "🇵🇭" },
  { code: "+84", country: "Vietnam", flag: "🇻🇳" },
  { code: "+92", country: "Pakistan", flag: "🇵🇰" },
  { code: "+880", country: "Bangladesh", flag: "🇧🇩" },
  { code: "+64", country: "New Zealand", flag: "🇳🇿" },
  { code: "+353", country: "Ireland", flag: "🇮🇪" },
  { code: "+351", country: "Portugal", flag: "🇵🇹" },
  { code: "+30", country: "Greece", flag: "🇬🇷" },
  { code: "+420", country: "Czech Republic", flag: "🇨🇿" },
  { code: "+31", country: "Netherlands", flag: "🇳🇱" },
  { code: "+32", country: "Belgium", flag: "🇧🇪" },
  { code: "+41", country: "Switzerland", flag: "🇨🇭" },
  { code: "+43", country: "Austria", flag: "🇦🇹" },
  { code: "+46", country: "Sweden", flag: "🇸🇪" },
  { code: "+47", country: "Norway", flag: "🇳🇴" },
  { code: "+45", country: "Denmark", flag: "🇩🇰" },
  { code: "+358", country: "Finland", flag: "🇫🇮" },
  { code: "+48", country: "Poland", flag: "🇵🇱" },
  { code: "+90", country: "Turkey", flag: "🇹🇷" },
  { code: "+972", country: "Israel", flag: "🇮🇱" },
  { code: "+971", country: "UAE", flag: "🇦🇪" },
  { code: "+966", country: "Saudi Arabia", flag: "🇸🇦" },
];

const getIsoCodeFromFlagEmoji = (flagEmoji: string): string | null => {
  if (!flagEmoji) return null;

  const codePoints = Array.from(flagEmoji).map((char) => char.codePointAt(0));
  if (codePoints.length !== 2 || codePoints.some((point) => !point)) return null;

  const iso = codePoints
    .map((point) => {
      const safePoint = point as number;
      if (safePoint < 0x1f1e6 || safePoint > 0x1f1ff) return "";
      return String.fromCharCode(safePoint - 0x1f1e6 + 65);
    })
    .join("");

  return iso.length === 2 ? iso.toLowerCase() : null;
};

const getFlagImageUrl = (flagEmoji: string): string | null => {
  const iso = getIsoCodeFromFlagEmoji(flagEmoji);
  return iso ? `https://flagcdn.com/${iso}.svg` : null;
};

export default function BasicInfoStep({ form }: { form: UseFormReturn<any> }) {
  const languages = form.watch("languages") || [];
  const [searchQuery, setSearchQuery] = useState("");
  const [showAllExpertise, setShowAllExpertise] = useState(false);
  const [showAllSkills, setShowAllSkills] = useState(false);
  const [countryCode, setCountryCode] = useState("+91");
  const [countrySearchTerm, setCountrySearchTerm] = useState("");
  const [countryCodeSearchTerm, setCountryCodeSearchTerm] = useState("");
  const [customExpertise, setCustomExpertise] = useState("");
  const [customSkill, setCustomSkill] = useState("");
  const selectedCategories = form.watch("category") || [];
  const selectedSkills = form.watch("skills") || [];
  const expertiseTags = form.watch("expertiseTags") || [];
  const filteredCountries = COUNTRIES.filter((country) =>
    country.name.toLowerCase().includes(countrySearchTerm.toLowerCase())
  );
  const filteredCountryCodes = COUNTRY_CODES.filter((item) =>
    item.country.toLowerCase().includes(countryCodeSearchTerm.toLowerCase()) ||
    item.code.toLowerCase().includes(countryCodeSearchTerm.toLowerCase())
  );
  const selectedCountryCodeItem = COUNTRY_CODES.find((item) => item.code === countryCode);
  
  // Get available tags based on selected categories
  const availableTags = selectedCategories.length > 0 
    ? expertiseOptions
        .filter(opt => selectedCategories.includes(opt.value))
        .flatMap(opt => opt.tags)
    : [];
  
  // Username availability state
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
  const [suggestedUsernames, setSuggestedUsernames] = useState<string[]>([]);
  const username = form.watch("username");
  
  // Get form errors for visual feedback
  const errors = form.formState.errors;
  
  // Debounced username check
  useEffect(() => {
    if (!username || username.length < 3) {
      setUsernameStatus('idle');
      setSuggestedUsernames([]);
      return;
    }
    
    // Validate username format first
    const usernameRegex = /^[a-z0-9_-]+$/;
    if (!usernameRegex.test(username)) {
      setUsernameStatus('idle');
      setSuggestedUsernames([]);
      return;
    }
    
    const timeoutId = setTimeout(() => {
      checkUsernameAvailability(username);
    }, 500);
    
    return () => clearTimeout(timeoutId);
  }, [username]);
  
  // Reset skills view when categories change
  useEffect(() => {
    setShowAllSkills(false);
  }, [selectedCategories]);
  
  const checkUsernameAvailability = async (username: string) => {
    setUsernameStatus('checking');
    
    try {
      const { data, error } = await supabase
        .from('expert_profiles')
        .select('username')
        .eq('username', username.toLowerCase())
        .maybeSingle();
      
      if (error && error.code !== 'PGRST116') {
        console.error('Error checking username:', error);
        setUsernameStatus('idle');
        return;
      }
      
      if (data) {
        setUsernameStatus('taken');
        generateUsernameSuggestions(username);
      } else {
        setUsernameStatus('available');
        setSuggestedUsernames([]);
      }
    } catch (error) {
      console.error('Error checking username:', error);
      setUsernameStatus('idle');
    }
  };
  
  const generateUsernameSuggestions = (baseUsername: string) => {
    const suggestions: string[] = [];
    const randomNum = Math.floor(Math.random() * 999) + 1;
    const year = new Date().getFullYear();
    
    suggestions.push(`${baseUsername}${randomNum}`);
    suggestions.push(`${baseUsername}_${randomNum}`);
    suggestions.push(`${baseUsername}${year}`);
    suggestions.push(`${baseUsername}_official`);
    suggestions.push(`the_${baseUsername}`);
    
    setSuggestedUsernames(suggestions.slice(0, 3));
  };
  
  const handleSuggestionClick = (suggestion: string) => {
    form.setValue('username', suggestion);
  };
  
  const addLanguage = () => {
    const currentLanguages = form.getValues("languages") || [];
    form.setValue("languages", [...currentLanguages, { language: "", level: "" }]);
  };
  
  const removeLanguage = (index: number) => {
    const currentLanguages = form.getValues("languages");
    form.setValue("languages", currentLanguages.filter((_: any, i: number) => i !== index));
  };
  
  const addCustomExpertise = () => {
    if (customExpertise.trim()) {
      const currentValues = form.getValues("category") || [];
      if (!currentValues.includes(customExpertise.trim())) {
        form.setValue("category", [...currentValues, customExpertise.trim()]);
        setCustomExpertise("");
      }
    }
  };
  
  const addCustomSkill = () => {
    if (customSkill.trim()) {
      const currentValues = form.getValues("skills") || [];
      if (!currentValues.includes(customSkill.trim())) {
        form.setValue("skills", [...currentValues, customSkill.trim()]);
        setCustomSkill("");
      }
    }
  };

  return (
    <div className="space-y-8">
      {/* Name fields in 2-column grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FormField
          control={form.control}
          name="firstName"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm font-medium text-gray-700">
                First name*
              </FormLabel>
              <FormControl>
                <Input 
                  placeholder="John" 
                  {...field} 
                  className="h-11 border-gray-200 focus:border-gray-400 focus:ring-1 focus:ring-gray-400 rounded-lg transition-colors"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="lastName"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm font-medium text-gray-700">
                Last name*
              </FormLabel>
              <FormControl>
                <Input 
                  placeholder="Doe" 
                  {...field} 
                  className="h-11 border-gray-200 focus:border-gray-400 focus:ring-1 focus:ring-gray-400 rounded-lg transition-colors"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
      
      <FormField
        control={form.control}
        name="email"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-sm font-medium text-gray-700">
              Email*
            </FormLabel>
            <FormControl>
              <Input 
                type="email"
                placeholder="you@example.com" 
                {...field} 
                readOnly
                className="h-11 border-gray-200 bg-gray-50 text-gray-600 focus:border-gray-200 focus:ring-0 rounded-lg transition-colors cursor-not-allowed"
              />
            </FormControl>
            <p className="text-xs text-gray-500">Email is linked to your account and can’t be changed here.</p>
            <FormMessage />
          </FormItem>
        )}
      />
      
      <FormField
        control={form.control}
        name="username"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-sm font-medium text-gray-700">
              Username*
            </FormLabel>
            <FormControl>
              <div className="relative">
                <Input 
                  placeholder="johndoe" 
                  {...field} 
                  onChange={(e) => {
                    const value = e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '');
                    field.onChange(value);
                  }}
                  className={cn(
                    "h-11 border-gray-200 focus:border-gray-400 focus:ring-1 focus:ring-gray-400 pr-10 rounded-lg transition-colors",
                    usernameStatus === 'available' && "border-emerald-500 focus:border-emerald-500 focus:ring-emerald-500",
                    usernameStatus === 'taken' && "border-red-500 focus:border-red-500 focus:ring-red-500"
                  )}
                />
                {/* Status indicator */}
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {usernameStatus === 'checking' && (
                    <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
                  )}
                  {usernameStatus === 'available' && (
                    <Check className="w-4 h-4 text-emerald-600" strokeWidth={2.5} />
                  )}
                  {usernameStatus === 'taken' && (
                    <X className="w-4 h-4 text-red-600" strokeWidth={2.5} />
                  )}
                </div>
              </div>
            </FormControl>
            
            {/* Status messages */}
            {usernameStatus === 'available' && field.value && field.value.length >= 3 && (
              <p className="text-xs text-emerald-600 mt-1.5">
                Username is available
              </p>
            )}
            
            {usernameStatus === 'taken' && (
              <div className="space-y-2 mt-1.5">
                <p className="text-xs text-red-600">
                  Username is already taken
                </p>
                
                {suggestedUsernames.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {suggestedUsernames.map((suggestion) => (
                      <button
                        key={suggestion}
                        type="button"
                        onClick={() => handleSuggestionClick(suggestion)}
                        className="text-xs px-2.5 py-1.5 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="countryOfBirth"
        render={({ field }) => {
          const selectedCountry = COUNTRIES.find(c => c.name === field.value);
          
          return (
            <FormItem>
              <FormLabel className="text-sm font-medium text-gray-700">
                Country of Birth*
              </FormLabel>
              <Select
                modal={false}
                onValueChange={field.onChange}
                value={field.value}
                onOpenChange={(open) => {
                  if (!open) setCountrySearchTerm("");
                }}
              >
                <FormControl>
                  <SelectTrigger className="h-11 border-gray-200 focus:border-gray-400 focus:ring-1 focus:ring-gray-400 rounded-lg transition-colors">
                    <SelectValue placeholder="Select your country" className="flex items-center gap-2">
                      {selectedCountry ? (
                        <span className="inline-flex items-center gap-2">
                          <span className="relative inline-flex h-4 w-5 items-center justify-center overflow-hidden rounded-sm bg-gray-100">
                            <span className="text-[10px] leading-none">{selectedCountry.flag}</span>
                            <img
                              src={getFlagImageUrl(selectedCountry.flag) || undefined}
                              alt={`${selectedCountry.name} flag`}
                              className="absolute inset-0 h-full w-full object-contain"
                              loading="lazy"
                            />
                          </span>
                          <span>{selectedCountry.name}</span>
                        </span>
                      ) : "Select your country"}
                    </SelectValue>
                  </SelectTrigger>
                </FormControl>
                <SelectContent className="max-h-60">
                  <div className="p-1.5 pb-2">
                    <Input
                      value={countrySearchTerm}
                      onChange={(event) => setCountrySearchTerm(event.target.value)}
                      onKeyDown={(event) => event.stopPropagation()}
                      placeholder="Search country"
                      className="h-9 text-sm"
                    />
                  </div>
                  {filteredCountries.length > 0 ? (
                    filteredCountries.map((country) => (
                      <SelectItem key={country.name} value={country.name} className="cursor-pointer">
                        <span className="inline-flex items-center gap-2">
                          <span className="relative inline-flex h-4 w-5 items-center justify-center overflow-hidden rounded-sm bg-gray-100">
                            <span className="text-[10px] leading-none">{country.flag}</span>
                            <img
                              src={getFlagImageUrl(country.flag) || undefined}
                              alt={`${country.name} flag`}
                              className="absolute inset-0 h-full w-full object-contain"
                              loading="lazy"
                            />
                          </span>
                          <span>{country.name}</span>
                        </span>
                      </SelectItem>
                    ))
                  ) : (
                    <div className="px-3 py-2 text-sm text-gray-500">No country found</div>
                  )}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          );
        }}
      />
      
      <FormField
        control={form.control}
        name="category"
        render={({ field }) => (
          <FormItem data-field="category">
            <FormLabel className="text-sm font-medium text-gray-700 mb-3 block">
              Choose Your Expertise Areas*
            </FormLabel>

            <div className="flex flex-wrap gap-2.5">
              {expertiseOptions.map((option) => {
                const isSelected = field.value?.includes(option.value);
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      const currentValues = field.value || [];
                      if (isSelected) {
                        field.onChange(currentValues.filter((v: string) => v !== option.value));
                      } else {
                        field.onChange([...currentValues, option.value]);
                      }
                    }}
                    className={cn(
                      "px-4 py-2.5 rounded-full border text-sm font-medium transition-all",
                      isSelected 
                        ? "border-gray-900 bg-gray-900 text-white shadow-sm" 
                        : "border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50"
                    )}
                  >
                    {option.value}
                  </button>
                );
              })}
              
              {/* Display custom expertise areas */}
              {field.value?.filter((cat: string) => 
                !expertiseOptions.some(opt => opt.value === cat)
              ).map((customCat: string) => (
                <button
                  key={customCat}
                  type="button"
                  onClick={() => {
                    const currentValues = field.value || [];
                    field.onChange(currentValues.filter((v: string) => v !== customCat));
                  }}
                  className="px-4 py-2.5 rounded-full border border-gray-900 bg-gray-900 text-white shadow-sm text-sm font-medium transition-all group"
                >
                  {customCat}
                  <X className="w-3.5 h-3.5 ml-1.5 inline-block group-hover:scale-110 transition-transform" />
                </button>
              ))}
            </div>
            
            {/* Add custom expertise area */}
            <div className="mt-3 flex gap-2">
              <Input
                type="text"
                placeholder="Add custom expertise area"
                value={customExpertise}
                onChange={(e) => setCustomExpertise(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addCustomExpertise();
                  }
                }}
                className="h-10 text-sm border-gray-200 focus:border-gray-400 focus:ring-1 focus:ring-gray-400 rounded-lg transition-colors"
              />
              <Button
                type="button"
                onClick={addCustomExpertise}
                variant="outline"
                size="sm"
                className="h-10 px-4 border-gray-200 hover:bg-gray-50"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>

            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="skills"
        render={({ field }) => {
          // Get available skills based on selected categories
          const availableSkills = selectedCategories.length > 0 
            ? Array.from(new Set(
                expertiseOptions
                  .filter(opt => selectedCategories.includes(opt.value))
                  .flatMap(opt => opt.skills || [])
              )).sort()
            : [];
          
          const skillsToShow = showAllSkills ? availableSkills : availableSkills.slice(0, 12);
          
          return (
            <FormItem data-field="skills">
              <FormLabel className="text-sm font-medium text-gray-700 mb-3 block">
                Select Your Skills*
              </FormLabel>

              {selectedCategories.length === 0 ? (
                <p className="text-sm text-gray-500 italic">
                  Please select at least one expertise area above to see relevant skills
                </p>
              ) : (
                <>
                  <div className="flex flex-wrap gap-2.5">
                    {skillsToShow.map((skill) => {
                      const isSelected = field.value?.includes(skill);
                      return (
                        <button
                          key={skill}
                          type="button"
                          onClick={() => {
                            const currentValues = field.value || [];
                            if (isSelected) {
                              field.onChange(currentValues.filter((v: string) => v !== skill));
                            } else {
                              field.onChange([...currentValues, skill]);
                            }
                          }}
                          className={cn(
                            "px-4 py-2.5 rounded-full border text-sm font-medium transition-all",
                            isSelected 
                              ? "border-gray-900 bg-gray-900 text-white shadow-sm" 
                              : "border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50"
                          )}
                        >
                          {skill}
                        </button>
                      );
                    })}
                    
                    {/* Display custom skills */}
                    {field.value?.filter((skill: string) => 
                      !availableSkills.includes(skill)
                    ).map((customSkill: string) => (
                      <button
                        key={customSkill}
                        type="button"
                        onClick={() => {
                          const currentValues = field.value || [];
                          field.onChange(currentValues.filter((v: string) => v !== customSkill));
                        }}
                        className="px-4 py-2.5 rounded-full border border-gray-900 bg-gray-900 text-white shadow-sm text-sm font-medium transition-all group"
                      >
                        {customSkill}
                        <X className="w-3.5 h-3.5 ml-1.5 inline-block group-hover:scale-110 transition-transform" />
                      </button>
                    ))}
                  </div>

                  {availableSkills.length > 12 && (
                    <div className="mt-4 text-center">
                      <button
                        type="button"
                        onClick={() => setShowAllSkills(!showAllSkills)}
                        className="text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors underline"
                      >
                        {showAllSkills ? "Show Less" : `Show More (${availableSkills.length - 12} more)`}
                      </button>
                    </div>
                  )}
                  
                  {/* Add custom skill */}
                  <div className="mt-3 flex gap-2">
                    <Input
                      type="text"
                      placeholder="Add custom skill"
                      value={customSkill}
                      onChange={(e) => setCustomSkill(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addCustomSkill();
                        }
                      }}
                      className="h-10 text-sm border-gray-200 focus:border-gray-400 focus:ring-1 focus:ring-gray-400 rounded-lg transition-colors"
                    />
                    <Button
                      type="button"
                      onClick={addCustomSkill}
                      variant="outline"
                      size="sm"
                      className="h-10 px-4 border-gray-200 hover:bg-gray-50"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </>
              )}

              <FormMessage />
            </FormItem>
          );
        }}
      />

      <div className="space-y-4" data-field="languages">
        <FormLabel className="text-sm font-medium text-gray-700">
          Languages You Speak*
        </FormLabel>

        <div className="space-y-3">
          {languages.map((_, index: number) => (
            <div key={index} className="flex gap-3 items-center">
              <FormField
                control={form.control}
                name={`languages.${index}.language`}
                render={({ field }) => (
                  <FormItem className="flex-1 space-y-1">
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-11 border-gray-200 focus:border-gray-400 focus:ring-1 focus:ring-gray-400 rounded-lg transition-colors">
                          <SelectValue placeholder="Select language" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="max-h-60">
                        {LANGUAGES.map((lang) => (
                          <SelectItem key={lang} value={lang}>
                            {lang}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name={`languages.${index}.level`}
                render={({ field }) => (
                  <FormItem className="flex-1 space-y-1">
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-11 border-gray-200 focus:border-gray-400 focus:ring-1 focus:ring-gray-400 rounded-lg transition-colors">
                          <SelectValue placeholder="Proficiency level" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {LANGUAGE_LEVELS.map((level) => (
                          <SelectItem key={level} value={level}>
                            {level}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeLanguage(index)}
                className="h-11 w-11 flex-shrink-0 hover:bg-red-50 hover:text-red-600 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
        
        <div className="border border-dashed border-gray-200 rounded-lg py-5 px-4 text-center space-y-2">
          {languages.length === 0 && (
            <p className="text-sm text-gray-400">
              Add languages you speak to help students find you easily
            </p>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addLanguage}
            className="h-9 text-xs border-gray-200 hover:bg-gray-50"
          >
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            Add Language
          </Button>
        </div>
      </div>

      <FormField
        control={form.control}
        name="phoneNumber"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-sm font-medium text-gray-700">
              Phone number
            </FormLabel>
            <div className="flex gap-3">
              <Select
                modal={false}
                value={countryCode}
                onValueChange={setCountryCode}
                onOpenChange={(open) => {
                  if (!open) setCountryCodeSearchTerm("");
                }}
              >
                <SelectTrigger className="w-28 h-11 border-gray-200 focus:border-gray-400 focus:ring-1 focus:ring-gray-400 rounded-lg transition-colors">
                  <SelectValue>
                    {selectedCountryCodeItem ? (
                      <span className="inline-flex items-center gap-2">
                        <span className="relative inline-flex h-4 w-5 items-center justify-center overflow-hidden rounded-sm bg-gray-100">
                          <span className="text-[10px] leading-none">{selectedCountryCodeItem.flag}</span>
                          <img
                            src={getFlagImageUrl(selectedCountryCodeItem.flag) || undefined}
                            alt={`${selectedCountryCodeItem.country} flag`}
                            className="absolute inset-0 h-full w-full object-contain"
                            loading="lazy"
                          />
                        </span>
                        <span className="font-medium">{selectedCountryCodeItem.code}</span>
                      </span>
                    ) : (
                      countryCode
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  <div className="p-1.5 pb-2">
                    <Input
                      value={countryCodeSearchTerm}
                      onChange={(event) => setCountryCodeSearchTerm(event.target.value)}
                      onKeyDown={(event) => event.stopPropagation()}
                      placeholder="Search code"
                      className="h-9 text-sm"
                    />
                  </div>
                  {filteredCountryCodes.length > 0 ? (
                    filteredCountryCodes.map((item) => (
                      <SelectItem key={`${item.code}-${item.country}`} value={item.code}>
                        <span className="inline-flex items-center gap-2">
                          <span className="relative inline-flex h-4 w-5 items-center justify-center overflow-hidden rounded-sm bg-gray-100">
                            <span className="text-[10px] leading-none">{item.flag}</span>
                            <img
                              src={getFlagImageUrl(item.flag) || undefined}
                              alt={`${item.country} flag`}
                              className="absolute inset-0 h-full w-full object-contain"
                              loading="lazy"
                            />
                          </span>
                          <span className="font-medium">{item.code}</span>
                          <span className="text-xs text-gray-500">{item.country}</span>
                        </span>
                      </SelectItem>
                    ))
                  ) : (
                    <div className="px-3 py-2 text-sm text-gray-500">No code found</div>
                  )}
                </SelectContent>
              </Select>
              <FormControl>
                <Input 
                  type="tel"
                  placeholder="98765XXXXX" 
                  {...field}
                  value={field.value?.replace(/^\+\d+\s*/, '') || ''}
                  onChange={(e) => {
                    const phoneNumber = e.target.value.replace(/[^\d\s()-]/g, '');
                    field.onChange(`${countryCode} ${phoneNumber}`);
                  }}
                  className="flex-1 h-11 border-gray-200 focus:border-gray-400 focus:ring-1 focus:ring-gray-400 rounded-lg transition-colors"
                />
              </FormControl>
            </div>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="ageConfirmation"
        render={({ field }) => (
          <FormItem data-field="ageConfirmation" className="flex flex-row items-start space-x-3 space-y-0">
            <FormControl>
              <Checkbox
                checked={field.value}
                onCheckedChange={field.onChange}
                className="mt-0.5"
              />
            </FormControl>
            <div className="space-y-1 leading-none">
              <FormLabel className="text-sm font-medium cursor-pointer text-gray-900">
                I confirm I'm over 18*
              </FormLabel>
              <FormMessage />
            </div>
          </FormItem>
        )}
      />
    </div>
  );
}
