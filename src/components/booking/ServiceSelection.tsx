import {
  Video,
  MessageSquare,
  ShoppingBag,
  FileText,
  Clock,
  Gift,
  Star,
  Calendar,
  ArrowRight,
  CheckCircle2,
  Clock3,
  Target,
  FolderOpen,
  FileCheck,
  PlayCircle,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { SelectedService } from "./BookingDialog";
import { useState } from "react";

interface ServiceSelectionProps {
  servicePricing: any; // Unified service_pricing structure
  onServiceSelect: (service: SelectedService) => void;
  averageRating?: number;
  totalReviews?: number;
}

const serviceConfig: Record<string, any> = {
  oneOnOneSession: {
    icon: Video,
    name: "1-on-1 Career Strategy Call",
    shortName: "1-on-1 Career Strategy Call",
    description: "Discuss your goals, blockers & next moves",
    benefits: ["30 min live call", "Personalized action plan after call"],
    durations: [30, 60, 90],
    typeLabel: "Video Meeting",
  },
  chatAdvice: {
    icon: MessageSquare,
    name: "Career Clarity – Ask Anything",
    shortName: "Career Clarity",
    description: "Get clear direction on your next career step",
    benefits: ["24-hour expert responses", "Actionable next steps"],
    durations: [],
    typeLabel: "Text Chat",
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
  },
  notes: {
    icon: FileText,
    name: "Session Notes & Resources",
    shortName: "Notes & Resources",
    description: "Study materials and guides",
    benefits: [],
    durations: [],
    typeLabel: "Study Materials",
  },
};

export default function ServiceSelection({
  servicePricing,
  onServiceSelect,
  averageRating = 0,
  totalReviews = 0,
}: ServiceSelectionProps) {
  const [selectedDurations, setSelectedDurations] = useState<
    Record<string, number>
  >({});
  const [freeDemoEnabled, setFreeDemoEnabled] = useState<
    Record<string, boolean>
  >({});

  // Suggested default prices for services
  const suggestedPrices: { [key: string]: number } = {
    oneOnOneSession: 1500,
    chatAdvice: 500,
    digitalProducts: 2000,
    notes: 300,
  };
  if (!servicePricing) {
    return (
      <div className="text-center py-8 bg-gray-100 rounded-2xl border-0">
        <p className="text-gray-500 text-sm font-medium">
          No services available at the moment
        </p>
      </div>
    );
  }

  // Get all enabled services
  const enabledServices = Object.entries(servicePricing)
    .filter(([_, value]: [string, any]) => value?.enabled)
    .map(([key, value]) => ({ key, ...value }));

  const handleSelect = (serviceKey: string, serviceName: string, servicePrice: number, hasFreeDemo: boolean) => {
    const config = serviceConfig[serviceKey];
    const duration = serviceKey === "oneOnOneSession" ? 
      (selectedDurations[serviceKey] || 30) : 0;

    const isFreeDemo = freeDemoEnabled[serviceKey] && hasFreeDemo;

    // Use actual price if > 0, otherwise use suggested price
    const actualPrice = servicePrice > 0 ? servicePrice : (suggestedPrices[serviceKey] || 500);

    onServiceSelect({
      type: serviceKey as any,
      name: config?.shortName || serviceName,
      duration,
      price: isFreeDemo ? 0 : actualPrice,
      hasFreeDemo: hasFreeDemo,
    });
  };

  const toggleFreeDemo = (serviceKey: string, enabled: boolean) => {
    setFreeDemoEnabled((prev) => ({
      ...prev,
      [serviceKey]: enabled,
    }));
  };

  if (enabledServices.length === 0) {
    return (
      <div className="text-center py-8 bg-gray-100 rounded-2xl border-0">
        <p className="text-gray-500 text-sm font-medium">
          No services available at the moment
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-bold text-gray-900 mb-1">
          What do you want help with?
        </h3>
        <p className="text-sm text-gray-600 mt-1">
          Pick an outcome. Delivery is handled by the expert.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {enabledServices.map((service) => {
          const serviceKey = service.key;
          const isPredefined = serviceConfig[serviceKey];
          const config = isPredefined ? serviceConfig[serviceKey] : {
            icon: Star,
            name: service.name,
            shortName: service.name,
            description: service.description,
            benefits: [],
            durations: [],
            typeLabel: "Custom Service",
          };
          const Icon = config.icon;
          const selectedDuration =
            selectedDurations[serviceKey] || config.durations[0] || 0;
          const isFreeDemo =
            freeDemoEnabled[serviceKey] && service.hasFreeDemo;
          
          // Use actual price if > 0, otherwise use suggested price
          const displayPrice = service.price > 0 ? service.price : (suggestedPrices[serviceKey] || 500);

          return (
            <Card
              key={serviceKey}
              className="bg-gray-100 border-0 rounded-2xl shadow-none"
            >
              <div className="p-7 space-y-4">
                {/* Header with Icon & Title */}
                <div className="flex items-start gap-3.5">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-sm bg-gradient-to-br from-gray-800 to-gray-900 flex-shrink-0">
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-gray-900 text-lg leading-tight mb-1.5">
                      {config.name}
                    </h4>
                    <p className="text-sm text-gray-600 leading-relaxed">
                      {config.description}
                    </p>
                    {totalReviews > 0 && isPredefined && (
                      <div className="flex items-center gap-1.5 mt-2">
                        <div className="inline-flex items-center gap-1 bg-yellow-50 border border-yellow-200 rounded-full px-2.5 py-1">
                          <Star className="w-3.5 h-3.5 fill-yellow-500 text-yellow-500" />
                          <span className="font-semibold text-yellow-700 text-xs">
                            {averageRating.toFixed(1)}
                          </span>
                          <span className="text-xs text-yellow-600">
                            ({totalReviews})
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Benefits */}
                {config.benefits && config.benefits.length > 0 && (
                  <div className="space-y-2.5">
                    {config.benefits.map((benefit: string, index: number) => {
                      const IconComponent = benefit.startsWith("24-hour")
                        ? Clock3
                        : benefit.startsWith("Personalized") ||
                          benefit.startsWith("Actionable")
                        ? Target
                        : benefit.startsWith("Resume")
                        ? FolderOpen
                        : benefit.startsWith("LinkedIn")
                        ? FileCheck
                        : benefit.startsWith("Short") ||
                          benefit.startsWith("guidance")
                        ? PlayCircle
                        : benefit.includes("min")
                        ? Clock3
                        : CheckCircle2;

                      return (
                        <div
                          key={index}
                          className="flex items-center gap-3 bg-white rounded-lg p-3.5 border border-gray-100"
                        >
                          <div className="w-5 h-5 rounded bg-white flex items-center justify-center shadow-sm flex-shrink-0">
                            <IconComponent className="w-3.5 h-3.5 text-gray-700" />
                          </div>
                          <span className="text-sm font-medium text-gray-700">
                            {benefit}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Free Demo Toggle - Only show if service has free demo */}
                {service.hasFreeDemo && (
                  <div
                    className="flex items-center justify-between bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4.5"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex-1 flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shadow-sm">
                        <Sparkles className="w-4 h-4 text-green-600" />
                      </div>
                      <div>
                        <Label
                          htmlFor={`free-demo-${serviceKey}`}
                          className="text-sm font-semibold text-green-800 cursor-pointer block"
                        >
                          Try Free Demo
                        </Label>
                        {isFreeDemo && (
                          <p className="text-xs text-green-700 mt-0.5">
                            Session duration may vary
                          </p>
                        )}
                      </div>
                    </div>
                    <Switch
                      id={`free-demo-${serviceKey}`}
                      checked={isFreeDemo}
                      onCheckedChange={(checked) =>
                        toggleFreeDemo(serviceKey, checked)
                      }
                      className="data-[state=checked]:bg-green-600"
                    />
                  </div>
                )}

                {/* Duration & Type Info */}
                <div className="bg-white rounded-xl p-4 space-y-3 shadow-sm">
                  {/* Service Type Indicator */}
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <Calendar className="w-4 h-4 flex-shrink-0 text-gray-600" />
                    <span className="font-medium">{config.typeLabel}</span>
                  </div>
                </div>

                {/* Pricing & CTA */}
                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                  {/* Price display */}
                  <div className="flex items-baseline gap-2">
                    {service.discount_price !== undefined ? (
                      <>
                        <div className="flex items-baseline gap-1">
                          <span className="text-2xl font-bold text-green-600">
                            ₹{service.discount_price}
                          </span>
                        </div>
                        <div className="flex items-baseline gap-1">
                          <span className="text-sm font-semibold text-gray-400 line-through">
                            ₹{displayPrice.toLocaleString("en-IN")}
                          </span>
                        </div>
                      </>
                    ) : (
                      <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-bold text-gray-900">
                          ₹{displayPrice.toLocaleString("en-IN")}
                        </span>
                      </div>
                    )}
                  </div>
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelect(serviceKey, service.name, service.price, service.hasFreeDemo);
                    }}
                    className={cn(
                      "font-semibold transition-all rounded-lg px-4 py-2 h-auto text-sm group/button",
                      "bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white"
                    )}
                  >
                    {isFreeDemo ? "Try Free" : "Select"}
                    <ArrowRight className="w-4 h-4 ml-1.5 transition-transform duration-300 ease-out group-hover/button:translate-x-1" />
                  </Button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
