import { UseFormReturn } from "react-hook-form";
import {
  Video,
  MessageSquare,
  ShoppingBag,
  Sparkles,
  IndianRupee,
  Gift,
  Plus,
  Trash2,
  Check,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { SERVICE_CONFIG } from "@/config/serviceConfig";
import { toast } from "@/components/ui/sonner";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

interface ServiceConfig {
  key: string;
  icon: any;
  name: string;
  description: string;
  type: "predefined" | "custom";
  suggestedPrice: number;
}

const predefinedServices: ServiceConfig[] = [
  {
    key: "oneOnOneSession",
    icon: SERVICE_CONFIG.oneOnOneSession.icon,
    name: SERVICE_CONFIG.oneOnOneSession.name,
    description: SERVICE_CONFIG.oneOnOneSession.description,
    type: "predefined",
    suggestedPrice: SERVICE_CONFIG.oneOnOneSession.suggestedPrice,
  },
  {
    key: "priorityDm",
    icon: SERVICE_CONFIG.priorityDm.icon,
    name: SERVICE_CONFIG.priorityDm.name,
    description: SERVICE_CONFIG.priorityDm.description,
    type: "predefined",
    suggestedPrice: SERVICE_CONFIG.priorityDm.suggestedPrice,
  },
  {
    key: "digitalProducts",
    icon: SERVICE_CONFIG.digitalProducts.icon,
    name: SERVICE_CONFIG.digitalProducts.name,
    description: SERVICE_CONFIG.digitalProducts.description,
    type: "predefined",
    suggestedPrice: SERVICE_CONFIG.digitalProducts.suggestedPrice,
  },
];

// Generate AI-suggested custom services based on form data
function generateCustomServices(formData: any): ServiceConfig[] {
  const services: ServiceConfig[] = [];
  
  const hasOutcome = (name: string) => formData.outcomesDelivered?.[name];
  const hasProblem = (name: string) => formData.problemsHelped?.[name];

  if (hasOutcome("clearDirection") || hasProblem("careerConfusion")) {
    services.push({
      key: "careerClarityCall",
      icon: Video,
      name: "Career Clarity Call",
      description: "Help students decide their next career step with personalized guidance",
      type: "custom",
      suggestedPrice: 499,
    });
  }

  if (hasOutcome("feedback") || hasProblem("resumeRejection")) {
    services.push({
      key: "resumeReview",
      icon: Video,
      name: "Resume Review Session",
      description: "Detailed feedback on resume and LinkedIn profile",
      type: "custom",
      suggestedPrice: 299,
    });
  }

  if (hasProblem("interviewFear")) {
    services.push({
      key: "mockInterview",
      icon: Video,
      name: "Mock Interview + Feedback",
      description: "Practice interviews with real-time coaching",
      type: "custom",
      suggestedPrice: 599,
    });
  }

  if (hasOutcome("roadmap") || hasProblem("skillRoadmap")) {
    services.push({
      key: "learningRoadmap",
      icon: Video,
      name: "Personalized Learning Roadmap",
      description: "Step-by-step skill development plan tailored to your goals",
      type: "custom",
      suggestedPrice: 399,
    });
  }

  return services;
}

export default function ServicesAndPricingStep({
  form,
}: {
  form: UseFormReturn<any>;
}) {
  const [customServices, setCustomServices] = useState<ServiceConfig[]>([]);
  const [newService, setNewService] = useState({
    name: "",
    description: "",
    price: 0,
  });
  const [showAddService, setShowAddService] = useState(false);
  // Track which services are in "custom duration" input mode
  const [customDurationKeys, setCustomDurationKeys] = useState<Set<string>>(new Set());

  // Generate AI-suggested services on mount
  useEffect(() => {
    const formData = form.getValues();
    const suggested = generateCustomServices(formData);
    setCustomServices(suggested);

    // Initialize service_pricing with names and descriptions for predefined services
    const currentPricing = form.getValues("servicePricing") || {};
    
    // Initialize predefined services with their names and descriptions if not set
    predefinedServices.forEach((service) => {
      const currentService = currentPricing[service.key];
      if (!currentService) {
        // Only set if service doesn't exist at all
        form.setValue(`servicePricing.${service.key}.price`, service.suggestedPrice);
        form.setValue(`servicePricing.${service.key}.name`, service.name);
        form.setValue(`servicePricing.${service.key}.description`, service.description);
      }
    });
    
    // Initialize AI-suggested custom services
    suggested.forEach((service) => {
      if (!currentPricing[service.key]) {
        form.setValue(`servicePricing.${service.key}`, {
          enabled: false,
          name: service.name,
          description: service.description,
          price: service.suggestedPrice,
          type: "custom",
          hasFreeDemo: false,
          duration: 60,
        });
      }
    });
  }, []);

  const handleAddCustomService = () => {
    if (!newService.name || !newService.description) return;

    // Validate price range
    if (newService.price && (newService.price < 50 || newService.price > 20000)) {
      toast.error("Invalid Price", {
        description: "Please set a price between ₹50 and ₹20,000 per session",
      });
      return;
    }

    const serviceKey = `custom_${Date.now()}`;
    const service: ServiceConfig = {
      key: serviceKey,
      icon: Sparkles,
      name: newService.name,
      description: newService.description,
      type: "custom",
      suggestedPrice: newService.price || 500,
    };

    setCustomServices([...customServices, service]);
    
    // Add to form
    form.setValue(`servicePricing.${serviceKey}`, {
      enabled: false,
      name: service.name,
      description: service.description,
      price: service.suggestedPrice,
      type: "custom",
      hasFreeDemo: false,
      duration: 60,
    });

    // Reset form
    setNewService({ name: "", description: "", price: 0 });
    setShowAddService(false);
  };

  const handleRemoveCustomService = (serviceKey: string) => {
    setCustomServices(customServices.filter((s) => s.key !== serviceKey));
    
    // Remove from form
    const currentPricing = form.getValues("servicePricing");
    if (currentPricing) {
      delete currentPricing[serviceKey];
      form.setValue("servicePricing", currentPricing);
    }
  };

  const allServices = [...predefinedServices, ...customServices];

  return (
    <div className="space-y-6">
      {/* Services List */}
      <div className="space-y-4">
        {allServices.map((service) => {
          const Icon = service.icon;
          const isCustom = service.type === "custom";
          const isEnabled = form.watch(`servicePricing.${service.key}.enabled`);

          return (
            <div
              key={service.key}
              className={cn(
                "border rounded-xl p-6 transition-all",
                isEnabled ? "border-green-500 bg-white" : "border-gray-200 bg-white"
              )}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-4 flex-1">
                  <div className={cn(
                    "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0",
                    isEnabled ? "bg-[#f8b857]" : "bg-gray-100"
                  )}>
                    <Icon className={cn("w-5 h-5", isEnabled ? "text-black" : "text-gray-600")} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-base font-medium text-gray-900">{service.name}</h3>
                      {isCustom && (
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-md font-medium">
                          Custom
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500">
                      {service.description}
                    </p>
                  </div>
                </div>
                {isCustom && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveCustomService(service.key)}
                    className="text-red-600 hover:bg-red-50 -mr-2"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>

              {/* Enable Toggle */}
              <FormField
                control={form.control}
                name={`servicePricing.${service.key}.enabled`}
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between space-y-0 mb-4">
                    <FormLabel className="text-sm font-medium text-gray-700">
                      Offer this service
                    </FormLabel>
                    <FormControl>
                      <Switch
                        checked={field.value || false}
                        onCheckedChange={(checked) => {
                          field.onChange(checked);
                          if (!checked) {
                            form.setValue(
                              `servicePricing.${service.key}.hasFreeDemo`,
                              false
                            );
                          }
                        }}
                        className="data-[state=checked]:bg-green-600 data-[state=unchecked]:bg-green-100"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              {/* Pricing Section - Only show if enabled */}
              {isEnabled && (
                <div className="space-y-4 pt-4 border-t border-gray-200">
                  {/* Price Input */}
                  <FormField
                    control={form.control}
                    name={`servicePricing.${service.key}.price`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium text-gray-700">
                          Price per session (INR)
                        </FormLabel>
                        <FormControl>
                          <div className="relative">
                            <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                            <Input
                              type="number"
                              min={50}
                              max={20000}
                              step={1}
                              placeholder={service.suggestedPrice.toString()}
                              className="pl-10 h-11 border-gray-200 focus:border-gray-400 focus:ring-1 focus:ring-gray-400 rounded-lg transition-colors"
                              value={field.value || ''}
                              onChange={(e) => {
                                const value = e.target.value === '' ? 0 : e.target.valueAsNumber;
                                field.onChange(isNaN(value) ? 0 : value);
                              }}
                            />
                          </div>
                        </FormControl>
                        <p className="text-xs text-gray-500 mt-1">Set between ₹50 - ₹20,000 per session</p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Session Duration - for 1-on-1 and custom services */}
                  {(service.key === "oneOnOneSession" || isCustom) && (
                    <FormField
                      control={form.control}
                      name={`servicePricing.${service.key}.duration`}
                      render={({ field }) => {
                        const presets = [15, 30, 60];
                        const isCustomDuration = customDurationKeys.has(service.key) || (field.value && !presets.includes(field.value));
                        return (
                          <FormItem>
                            <FormLabel className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                              <Clock className="w-4 h-4 text-gray-500" />
                              Session Duration
                            </FormLabel>
                            <FormControl>
                              <div className="space-y-2">
                                <div className="flex gap-2 flex-wrap">
                                  {presets.map((mins) => (
                                    <button
                                      key={mins}
                                      type="button"
                                      onClick={() => {
                                        field.onChange(mins);
                                        setCustomDurationKeys((prev) => {
                                          const next = new Set(prev);
                                          next.delete(service.key);
                                          return next;
                                        });
                                      }}
                                      className={cn(
                                        "px-4 py-2 rounded-lg text-sm font-medium border transition-colors",
                                        !isCustomDuration && (field.value || 60) === mins
                                          ? "bg-gray-900 text-white border-gray-900"
                                          : "bg-white text-gray-700 border-gray-200 hover:border-gray-400"
                                      )}
                                    >
                                      {mins} min
                                    </button>
                                  ))}
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setCustomDurationKeys((prev) => {
                                        const next = new Set(prev);
                                        next.add(service.key);
                                        return next;
                                      })
                                    }
                                    className={cn(
                                      "px-4 py-2 rounded-lg text-sm font-medium border transition-colors",
                                      isCustomDuration
                                        ? "bg-gray-900 text-white border-gray-900"
                                        : "bg-white text-gray-700 border-gray-200 hover:border-gray-400"
                                    )}
                                  >
                                    Custom
                                  </button>
                                </div>
                                {isCustomDuration && (
                                  <div className="flex items-center gap-2">
                                    <Input
                                      type="number"
                                      min={5}
                                      max={480}
                                      step={5}
                                      placeholder="e.g. 45"
                                      value={field.value && !presets.includes(field.value) ? field.value : ""}
                                      onChange={(e) => {
                                        const v = e.target.valueAsNumber;
                                        if (!isNaN(v) && v > 0) field.onChange(v);
                                      }}
                                      className="w-28 h-9 border-gray-200 focus:border-gray-400 focus:ring-1 focus:ring-gray-400 rounded-lg"
                                    />
                                    <span className="text-sm text-gray-500">minutes</span>
                                  </div>
                                )}
                              </div>
                            </FormControl>
                            <p className="text-xs text-gray-500 mt-1">Duration shown to students during booking</p>
                            <FormMessage />
                          </FormItem>
                        );
                      }}
                    />
                  )}

                  {/* Free Demo Option */}
                  <FormField
                    control={form.control}
                    name={`servicePricing.${service.key}.hasFreeDemo`}
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 p-4 border border-gray-200 rounded-lg bg-gray-50">
                        <FormControl>
                          <Checkbox
                            checked={field.value || false}
                            onCheckedChange={field.onChange}
                            className="border-green-500 data-[state=checked]:border-green-600 data-[state=checked]:bg-green-600 focus-visible:ring-green-500"
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none flex-1">
                          <FormLabel className="flex items-center gap-2 font-medium text-sm text-gray-900 cursor-pointer">
                            <Gift className="w-4 h-4 text-gray-600" />
                            Offer free demo
                          </FormLabel>
                        </div>
                      </FormItem>
                    )}
                  />

                  {/* Custom Service - Edit Options */}
                  {isCustom && (
                    <div className="space-y-4 pt-4 border-t border-gray-200">
                      <FormField
                        control={form.control}
                        name={`servicePricing.${service.key}.name`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium text-gray-700">
                              Service Name
                            </FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Enter service name"
                                {...field}
                                value={field.value || service.name}
                                className="h-11 border-gray-200 focus:border-gray-400 focus:ring-1 focus:ring-gray-400 rounded-lg transition-colors"
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`servicePricing.${service.key}.description`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium text-gray-700">
                              Service Description
                            </FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Describe what this service includes"
                                className="resize-none border-gray-200 focus:border-gray-400 focus:ring-1 focus:ring-gray-400 rounded-lg transition-colors"
                                rows={2}
                                {...field}
                                value={field.value || service.description}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Add Custom Service */}
      <div className="border border-dashed border-gray-300 rounded-xl p-6 bg-gray-50">
        {!showAddService ? (
          <Button
            type="button"
            variant="outline"
            onClick={() => setShowAddService(true)}
            className="w-full h-11 border-gray-300 hover:bg-white transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Custom Service
          </Button>
        ) : (
          <div className="space-y-4">
            <h4 className="font-semibold text-gray-900">Create Custom Service</h4>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">
                  Service Name
                </label>
                <Input
                  placeholder="e.g., Portfolio Review"
                  value={newService.name}
                  onChange={(e) =>
                    setNewService({ ...newService, name: e.target.value })
                  }
                  className="h-11 border-gray-200 focus:border-gray-400 focus:ring-1 focus:ring-gray-400 rounded-lg transition-colors"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">
                  Description
                </label>
                <Textarea
                  placeholder="What does this service include?"
                  rows={3}
                  value={newService.description}
                  onChange={(e) =>
                    setNewService({ ...newService, description: e.target.value })
                  }
                  className="border-gray-200 focus:border-gray-400 focus:ring-1 focus:ring-gray-400 rounded-lg transition-colors"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">
                  Starting Price (INR)
                </label>
                <div className="relative">
                  <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <Input
                    type="number"
                    min={50}
                    max={20000}
                    step={50}
                    placeholder="500"
                    className="pl-10 h-11 border-gray-200 focus:border-gray-400 focus:ring-1 focus:ring-gray-400 rounded-lg transition-colors"
                    value={newService.price || ""}
                    onChange={(e) => {
                      const value = e.target.valueAsNumber || 0;
                      // Validate price range
                      if (value > 0 && (value < 50 || value > 20000)) {
                        return; // Don't update if outside range
                      }
                      setNewService({
                        ...newService,
                        price: value,
                      });
                    }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">Set between ₹50 - ₹20,000 per session</p>
              </div>
              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  onClick={handleAddCustomService}
                  disabled={!newService.name || !newService.description}
                  className="flex-1 h-11 bg-matepeak-yellow hover:bg-matepeak-yellow/90 text-black transition-colors"
                >
                  <Check className="w-4 h-4 mr-2" />
                  Add Service
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowAddService(false);
                    setNewService({ name: "", description: "", price: 0 });
                  }}
                  className="flex-1 h-11 border-gray-300 hover:bg-white transition-colors"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
