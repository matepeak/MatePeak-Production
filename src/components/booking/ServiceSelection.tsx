import {
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
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { SelectedService } from "./BookingDialog";
import { useState } from "react";
import { SERVICE_CONFIG, normalizeServiceType } from "@/config/serviceConfig";

interface ServiceSelectionProps {
  servicePricing: any; // Unified service_pricing structure
  onServiceSelect: (service: SelectedService) => void;
  averageRating?: number;
  totalReviews?: number;
  oneOnOneOnly?: boolean;
}

// Use shared SERVICE_CONFIG for consistency across the app

export default function ServiceSelection({
  servicePricing,
  onServiceSelect,
  averageRating = 0,
  totalReviews = 0,
  oneOnOneOnly = false,
}: ServiceSelectionProps) {
  const isServiceEnabled = (value: any) =>
    value === true || value === "true" || value === 1 || value === "1";

  const [selectedDurations, setSelectedDurations] = useState<
    Record<string, number>
  >({});
  const [freeDemoEnabled, setFreeDemoEnabled] = useState<
    Record<string, boolean>
  >({});
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
    .filter(
      ([_, value]: [string, any]) =>
        isServiceEnabled(value?.enabled) && value?.deleted !== true
    )
    .filter(([key]) => (oneOnOneOnly ? key === "oneOnOneSession" : true))
    .map(([key, value]) => ({ key, ...value }));

  const resolveServiceType = (serviceKey: string, rawType?: string) => {
    return (
      (rawType ? normalizeServiceType(rawType) : null) ||
      normalizeServiceType(serviceKey) ||
      "oneOnOneSession"
    );
  };

  const handleSelect = (
    serviceKey: string,
    rawType: string | undefined,
    serviceName: string,
    servicePrice: number,
    hasFreeDemo: boolean,
    serviceDuration?: number,
    serviceDiscountPrice?: number
  ) => {
    const normalizedServiceType = resolveServiceType(serviceKey, rawType);
    const config = SERVICE_CONFIG[normalizedServiceType] || SERVICE_CONFIG.oneOnOneSession;
    // Use the mentor's configured duration for all service types.
    const duration =
      serviceDuration ||
      (normalizedServiceType === "oneOnOneSession"
        ? selectedDurations[serviceKey] || 60
        : 30);

    const isFreeDemo = freeDemoEnabled[serviceKey] && hasFreeDemo;

    // Use the exact price set by the mentor (even if it's 0)
    const actualPrice = servicePrice !== undefined && servicePrice !== null ? servicePrice : 0;

    onServiceSelect({
      type: normalizedServiceType,
      serviceKey,
      name: serviceName || config?.shortName || serviceKey, // Prioritize custom name
      duration,
      price: isFreeDemo ? 0 : actualPrice,
      discountPrice: isFreeDemo ? undefined : serviceDiscountPrice,
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
          {oneOnOneOnly
            ? "No 1-on-1 session service is available right now"
            : "No services available at the moment"}
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
          {oneOnOneOnly
            ? "Pick your 1-on-1 session service for this selected timeslot."
            : "Pick an outcome. Delivery is handled by the expert."}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {enabledServices.map((service) => {
          const serviceKey = service.key;
          const resolvedServiceType = resolveServiceType(serviceKey, service.type);
          const isPredefined = SERVICE_CONFIG[resolvedServiceType];
          
          // Allow mentors to customize predefined service names/descriptions
          // Use custom name/description if provided, otherwise fall back to SERVICE_CONFIG
          const config = isPredefined ? {
            ...SERVICE_CONFIG[resolvedServiceType],
            name: service.name || SERVICE_CONFIG[resolvedServiceType].name,
            shortName: service.name || SERVICE_CONFIG[resolvedServiceType].shortName,
            description: service.description || SERVICE_CONFIG[resolvedServiceType].description,
          } : {
            icon: Star,
            name: service.name,
            shortName: service.name,
            description: service.description,
            benefits: [],
            durations: [],
            typeLabel: "Custom Service",
            suggestedPrice: 500,
          };
          const Icon = config.icon;
          const isFreeDemo =
            freeDemoEnabled[serviceKey] && service.hasFreeDemo;
          
          // Use the exact price set by the mentor (even if it's 0)
          const displayPrice = service.price !== undefined && service.price !== null ? service.price : 0;

          return (
            <Card
              key={serviceKey}
              className="bg-white border border-gray-200 rounded-2xl shadow-sm h-full overflow-hidden"
            >
              <div className="p-7 h-full flex flex-col gap-4">
                {/* Header with Icon & Title */}
                <div className="flex items-start gap-3.5">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-sm bg-gradient-to-br from-gray-800 to-gray-900 flex-shrink-0">
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-gray-900 text-lg leading-tight mb-1.5 line-clamp-2 break-words">
                      {config.name}
                    </h4>
                    <p className="text-sm text-gray-600 leading-relaxed line-clamp-2 break-words">
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
                    className="flex items-center justify-between bg-white rounded-lg p-3.5 border border-gray-100"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex-1 flex items-center gap-3">
                      <div className="w-5 h-5 rounded bg-white flex items-center justify-center shadow-sm flex-shrink-0">
                        <Sparkles className="w-3.5 h-3.5 text-matepeak-primary" />
                      </div>
                      <div>
                        <Label
                          htmlFor={`free-demo-${serviceKey}`}
                          className="text-sm font-medium text-gray-700 cursor-pointer block"
                        >
                          Try Free Demo
                        </Label>
                        {isFreeDemo && (
                          <p className="text-xs text-gray-500 mt-0.5">
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
                      className="scale-90 origin-right data-[state=checked]:bg-matepeak-primary"
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
                  {/* Session Duration */}
                  {service.duration && (
                    <div className="flex items-center gap-2 text-sm text-gray-700">
                      <Clock3 className="w-4 h-4 flex-shrink-0 text-gray-600" />
                      <span className="font-medium">{service.duration} min session</span>
                    </div>
                  )}
                </div>

                {/* Pricing & CTA */}
                <div className="flex items-center justify-between pt-4 mt-auto border-t border-gray-100">
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
                      handleSelect(
                        serviceKey,
                        service.type,
                        service.name,
                        service.price,
                        service.hasFreeDemo,
                        service.duration,
                        service.discount_price
                      );
                    }}
                    className={cn(
                      "font-semibold transition-all rounded-lg px-4 py-2 h-auto text-sm group/button shrink-0",
                      "bg-gradient-to-r from-matepeak-primary to-matepeak-secondary hover:from-matepeak-secondary hover:to-matepeak-primary text-white"
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
