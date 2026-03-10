import { Badge } from "@/components/ui/badge";
import { Circle, CheckCircle2, Star, Crown } from "lucide-react";

interface TierBadgeProps {
  tier: 'basic' | 'verified' | 'top';
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export default function TierBadge({ tier, size = 'md', showLabel = true }: TierBadgeProps) {
  const tierConfig = {
    basic: {
      icon: Circle,
      label: "Basic Mentor",
      shortLabel: "Basic",
      color: "bg-gray-100 text-gray-700 border-gray-300",
      description: "New to the platform"
    },
    verified: {
      icon: CheckCircle2,
      label: "Verified Mentor",
      shortLabel: "Verified",
      color: "bg-blue-100 text-blue-700 border-blue-400",
      description: "Identity and credentials verified"
    },
    top: {
      icon: Star,
      label: "Top Mentor",
      shortLabel: "Top",
      color: "bg-gradient-to-r from-yellow-100 to-orange-100 text-orange-700 border-orange-400",
      description: "Highly rated with proven track record"
    }
  };

  const config = tierConfig[tier];
  const Icon = config.icon;

  const sizeClasses = {
    sm: "px-2 py-0.5 text-xs",
    md: "px-3 py-1 text-sm",
    lg: "px-4 py-1.5 text-base"
  };

  const iconSizes = {
    sm: "w-3 h-3",
    md: "w-4 h-4",
    lg: "w-5 h-5"
  };

  return (
    <Badge 
      className={`${config.color} border-2 ${sizeClasses[size]} font-semibold flex items-center gap-1.5`}
      title={config.description}
    >
      <Icon className={iconSizes[size]} />
      {showLabel && (size === 'lg' ? config.label : config.shortLabel)}
    </Badge>
  );
}
