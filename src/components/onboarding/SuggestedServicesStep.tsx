import { UseFormReturn } from "react-hook-form";
import {
  Sparkles,
  Video,
  MessageSquare,
  ShoppingBag,
  IndianRupee,
  Check,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useState, useEffect } from "react";
import { FormField, FormItem, FormControl } from "@/components/ui/form";

interface SuggestedService {
  id: string;
  icon: any;
  name: string;
  description: string;
  defaultPrice: number;
  serviceType: "oneOnOneSession" | "priorityDm" | "digitalProducts";
}

function generateSuggestedServices(formData: any): SuggestedService[] {
  const services: SuggestedService[] = [];

  const hasOutcome = (name: string) => formData.outcomesDelivered?.[name];
  const hasProblem = (name: string) => formData.problemsHelped?.[name];

  // 1-on-1 Career Strategy Call
  if (hasOutcome("clearDirection") || hasProblem("careerConfusion")) {
    services.push({
      id: "careerStrategyCall",
      icon: Video,
      name: "Career Clarity Call",
      description: "Help them decide their next career step",
      defaultPrice: 499,
      serviceType: "oneOnOneSession",
    });
  }

  // Resume/Portfolio Review
  if (hasOutcome("feedback") || hasProblem("resumeRejection")) {
    services.push({
      id: "resumeReview",
      icon: Video,
      name: "Resume Review Session",
      description: "Provide detailed feedback on resume & LinkedIn",
      defaultPrice: 299,
      serviceType: "oneOnOneSession",
    });
  }

  // Interview Preparation
  if (hasProblem("interviewFear")) {
    services.push({
      id: "interviewPrep",
      icon: Video,
      name: "Mock Interview + Feedback",
      description: "Practice interviews with real-time coaching",
      defaultPrice: 599,
      serviceType: "oneOnOneSession",
    });
  }

  // Learning Roadmap
  if (hasOutcome("roadmap") || hasProblem("skillRoadmap")) {
    services.push({
      id: "learningRoadmap",
      icon: Video,
      name: "Personalized Learning Roadmap",
      description: "Create a step-by-step skill development plan",
      defaultPrice: 399,
      serviceType: "oneOnOneSession",
    });
  }

  // Chat Support
  if (hasOutcome("ongoingSupport")) {
    services.push({
      id: "chatSupport",
      icon: MessageSquare,
      name: "7-day Chat Support",
      description: "Ongoing guidance via text for one week",
      defaultPrice: 799,
      serviceType: "priorityDm",
    });
  }

  // Career Clarity - Ask Anything (default chat option)
  if (
    services.length > 0 &&
    !services.some((s) => s.serviceType === "priorityDm")
  ) {
    services.push({
      id: "quickAdvice",
      icon: MessageSquare,
      name: "Career Clarity – Ask Anything",
      description: "Get clear direction on your next step",
      defaultPrice: 99,
      serviceType: "priorityDm",
    });
  }

  // Resource Bundle
  if (
    hasOutcome("feedback") ||
    hasProblem("resumeRejection") ||
    hasProblem("personalBranding")
  ) {
    services.push({
      id: "resourceBundle",
      icon: ShoppingBag,
      name: "Resume & LinkedIn Starter Pack",
      description: "Templates + guidance video",
      defaultPrice: 999,
      serviceType: "digitalProducts",
    });
  }

  return services;
}

export default function SuggestedServicesStep({
  form,
}: {
  form: UseFormReturn<any>;
}) {
  const [services, setServices] = useState<SuggestedService[]>([]);
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [enabledServices, setEnabledServices] = useState<
    Record<string, boolean>
  >({});
  const [editingDescriptions, setEditingDescriptions] = useState<
    Record<string, boolean>
  >({});
  const [descriptions, setDescriptions] = useState<Record<string, string>>({});

  useEffect(() => {
    const formData = form.getValues();
    const suggested = generateSuggestedServices(formData);
    setServices(suggested);

    // Initialize prices, enabled state, and descriptions
    const initialPrices: Record<string, number> = {};
    const initialEnabled: Record<string, boolean> = {};
    const initialDescriptions: Record<string, string> = {};

    suggested.forEach((service) => {
      initialPrices[service.id] = service.defaultPrice;
      initialEnabled[service.id] = true; // All enabled by default
      initialDescriptions[service.id] = service.description;
    });

    setPrices(initialPrices);
    setEnabledServices(initialEnabled);
    setDescriptions(initialDescriptions);

    // Update form with suggested services
    form.setValue(
      "suggestedServices",
      suggested.map((s) => ({
        ...s,
        price: s.defaultPrice,
        enabled: true,
        description: s.description,
      }))
    );
  }, []);

  const handlePriceChange = (serviceId: string, newPrice: string) => {
    const price = parseInt(newPrice) || 0;
    setPrices((prev) => ({ ...prev, [serviceId]: price }));

    // Update form
    const currentServices = form.getValues("suggestedServices") || [];
    const updated = currentServices.map((s: any) =>
      s.id === serviceId ? { ...s, price } : s
    );
    form.setValue("suggestedServices", updated);
  };

  const handleDescriptionChange = (
    serviceId: string,
    newDescription: string
  ) => {
    setDescriptions((prev) => ({ ...prev, [serviceId]: newDescription }));
  };

  const saveDescription = (serviceId: string) => {
    // Update form
    const currentServices = form.getValues("suggestedServices") || [];
    const updated = currentServices.map((s: any) =>
      s.id === serviceId ? { ...s, description: descriptions[serviceId] } : s
    );
    form.setValue("suggestedServices", updated);
    setEditingDescriptions((prev) => ({ ...prev, [serviceId]: false }));
  };

  const toggleEditDescription = (serviceId: string) => {
    setEditingDescriptions((prev) => ({
      ...prev,
      [serviceId]: !prev[serviceId],
    }));
  };

  const toggleService = (serviceId: string) => {
    setEnabledServices((prev) => {
      const newState = { ...prev, [serviceId]: !prev[serviceId] };

      // Update form
      const currentServices = form.getValues("suggestedServices") || [];
      const updated = currentServices.map((s: any) =>
        s.id === serviceId ? { ...s, enabled: newState[serviceId] } : s
      );
      form.setValue("suggestedServices", updated);

      // Also update the main service toggles
      const service = services.find((s) => s.id === serviceId);
      if (service) {
        form.setValue(service.serviceType, newState[serviceId]);
      }

      return newState;
    });
  };

  if (services.length === 0) {
    return (
      <div className="space-y-8 animate-fade-in">
        <div className="text-center py-12">
          <Sparkles className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            No services to suggest yet
          </h3>
          <p className="text-gray-600">
            Please go back and select your target audience, problems, and
            outcomes.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-matepeak-primary to-matepeak-secondary flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900">
              Suggested Services
            </h3>
          </div>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 pl-13">
          <p className="text-xs text-blue-900">
            <strong>
              ✨ Based on your profile, we suggest these services.
            </strong>{" "}
            Adjust pricing, toggle services, or edit descriptions.
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {services.map((service) => {
          const Icon = service.icon;
          const isEnabled = enabledServices[service.id];
          const isEditingDescription = editingDescriptions[service.id];

          return (
            <Card
              key={service.id}
              className={cn(
                "border transition-all duration-200",
                isEnabled
                  ? "border-gray-200 bg-white"
                  : "border-gray-200 bg-gray-50 opacity-60"
              )}
            >
              <div className="p-3.5 space-y-3">
                {/* Header */}
                <div className="flex items-start gap-3">
                  <div
                    className={cn(
                      "flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center transition-all",
                      isEnabled ? "bg-gray-900" : "bg-gray-300"
                    )}
                  >
                    <Icon className="w-5 h-5 text-white" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-semibold text-gray-900 mb-1">
                      {service.name}
                    </h4>
                    {!isEditingDescription ? (
                      <p className="text-xs text-gray-600 leading-snug">
                        {descriptions[service.id]}
                      </p>
                    ) : (
                      <Textarea
                        value={descriptions[service.id]}
                        onChange={(e) =>
                          handleDescriptionChange(service.id, e.target.value)
                        }
                        className="text-xs min-h-[60px] resize-none"
                        placeholder="Enter service description"
                      />
                    )}
                  </div>

                  {/* Toggle Switch */}
                  <button
                    type="button"
                    onClick={() => toggleService(service.id)}
                    className={cn(
                      "flex-shrink-0 w-11 h-6 rounded-full transition-colors relative",
                      isEnabled ? "bg-gray-900" : "bg-gray-300"
                    )}
                  >
                    <span
                      className={cn(
                        "absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform",
                        isEnabled ? "right-0.5" : "left-0.5"
                      )}
                    />
                  </button>
                </div>

                {/* Pricing & Edit Actions */}
                {isEnabled && (
                  <div className="flex items-end gap-3 pt-2 border-t border-gray-100">
                    <div className="flex-1 max-w-[200px]">
                      <Label
                        htmlFor={`price-${service.id}`}
                        className="text-xs font-medium text-gray-600 mb-1.5 block"
                      >
                        Price (₹)
                      </Label>
                      <div className="relative">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500 text-xs">
                          ₹
                        </span>
                        <Input
                          id={`price-${service.id}`}
                          type="number"
                          value={prices[service.id] || service.defaultPrice}
                          onChange={(e) =>
                            handlePriceChange(service.id, e.target.value)
                          }
                          className="pl-6 h-9 text-sm"
                          min="0"
                          step="50"
                        />
                      </div>
                    </div>

                    <div className="flex gap-2">
                      {!isEditingDescription ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => toggleEditDescription(service.id)}
                          className="h-9 text-xs"
                        >
                          Edit Description
                        </Button>
                      ) : (
                        <>
                          <Button
                            type="button"
                            variant="default"
                            size="sm"
                            onClick={() => saveDescription(service.id)}
                            className="h-9 text-xs bg-gray-900 hover:bg-gray-800"
                          >
                            <Check className="w-3.5 h-3.5 mr-1" />
                            Save
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setDescriptions((prev) => ({
                                ...prev,
                                [service.id]: service.description,
                              }));
                              toggleEditDescription(service.id);
                            }}
                            className="h-9 text-xs"
                          >
                            <X className="w-3.5 h-3.5" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
