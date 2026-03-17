import { 
  Video, 
  MessageSquare, 
  ShoppingBag 
} from "lucide-react";
import { LucideIcon } from "lucide-react";

export type ServiceType = "oneOnOneSession" | "priorityDm" | "digitalProducts";

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

const SERVICE_KEY_ALIASES: Record<string, ServiceType> = {
  oneononesession: "oneOnOneSession",
  one_on_one_session: "oneOnOneSession",
  oneonone: "oneOnOneSession",
  chatadvice: "priorityDm",
  prioritydm: "priorityDm",
  priority_dm: "priorityDm",
  digitalproducts: "digitalProducts",
  digitalproduct: "digitalProducts",
  digital_products: "digitalProducts",
  digital_product: "digitalProducts",
};

export const normalizeServiceType = (serviceKey: string): ServiceType | null => {
  const direct = SERVICE_CONFIG[serviceKey] ? (serviceKey as ServiceType) : null;
  if (direct) return direct;

  const normalizedKey = serviceKey.replace(/[^a-zA-Z0-9_]/g, "").toLowerCase();
  return SERVICE_KEY_ALIASES[normalizedKey] || null;
};

export const serviceRequiresScheduling = (serviceKey: string): boolean => {
  const normalized = normalizeServiceType(serviceKey);
  if (!normalized) return true;
  return SERVICE_CONFIG[normalized].requiresScheduling;
};

/**
 * Shared service configuration used across the app
 * This ensures consistency between mentor public page and booking flow
 * 
 * Services that requiresScheduling=true: Need availability slots (oneOnOneSession)
 * Services that requiresScheduling=false: Direct access without booking (priorityDm, digitalProducts)
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
  priorityDm: {
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
