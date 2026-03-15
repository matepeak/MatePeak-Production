import { 
  Video, 
  MessageSquare, 
  ShoppingBag, 
  FileText 
} from "lucide-react";
import { LucideIcon } from "lucide-react";

export interface ServiceConfigItem {
  icon: LucideIcon;
  name: string;
  shortName: string;
  description: string;
  benefits: string[];
  durations: number[];
  typeLabel: string;
  suggestedPrice: number;
  requiresScheduling: boolean; // Whether this service needs availability/booking slots
}

/**
 * Shared service configuration used across the app
 * This ensures consistency between mentor public page and booking flow
 * 
 * Services that requiresScheduling=true: Need availability slots (oneOnOneSession)
 * Services that requiresScheduling=false: Direct access without booking (chatAdvice, digitalProducts, notes)
 */
export const SERVICE_CONFIG: Record<string, ServiceConfigItem> = {
  oneOnOneSession: {
    icon: Video,
    name: "1-on-1 Career Strategy Call",
    shortName: "1-on-1 Career Strategy Call",
    description: "Discuss your goals, blockers & next moves",
    benefits: ["30 min live call", "Personalized action plan after call"],
    durations: [30, 60, 90],
    typeLabel: "Video Meeting",
    suggestedPrice: 1500,
    requiresScheduling: true,
  },
  chatAdvice: {
    icon: MessageSquare,
    name: "Career Clarity – Ask Anything",
    shortName: "Career Clarity",
    description: "Get clear direction on your next career step",
    benefits: ["24-hour expert responses", "Actionable next steps"],
    durations: [],
    typeLabel: "Text Chat",
    suggestedPrice: 500,
    requiresScheduling: false,
  },
  digitalProducts: {
    icon: ShoppingBag,
    name: "Resume & LinkedIn Starter Pack",
    shortName: "Resource Bundle",
    description: "Proven templates + expert guidance",
    benefits: [
      "Resume templates",
      "LinkedIn checklist",
      "Short guidance video",
    ],
    durations: [],
    typeLabel: "Digital Download",
    suggestedPrice: 2000,
    requiresScheduling: false,
  },
  notes: {
    icon: FileText,
    name: "Session Notes & Resources",
    shortName: "Notes & Resources",
    description: "Study materials and guides",
    benefits: [],
    durations: [],
    typeLabel: "Study Materials",
    suggestedPrice: 300,
    requiresScheduling: false,
  },
};

/**
 * Get suggested default prices for services
 */
export const getSuggestedPrices = (): Record<string, number> => {
  return Object.entries(SERVICE_CONFIG).reduce((acc, [key, config]) => {
    acc[key] = config.suggestedPrice;
    return acc;
  }, {} as Record<string, number>);
};
