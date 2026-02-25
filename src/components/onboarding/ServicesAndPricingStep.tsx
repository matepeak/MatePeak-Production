import { UseFormReturn } from "react-hook-form";
import {
  Video,
  MessageSquare,
  ShoppingBag,
  FileText,
  Sparkles,
  IndianRupee,
  Gift,
  Plus,
  Trash2,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
    icon: Video,
    name: "1-on-1 Video Sessions",
    description: "Live video mentoring sessions tailored to student needs",
    type: "predefined",
    suggestedPrice: 1500,
  },
  {
    key: "chatAdvice",
    icon: MessageSquare,
    name: "Chat Advice",
    description: "Text-based Q&A and guidance via messaging",
    type: "predefined",
    suggestedPrice: 500,
  },
  {
    key: "digitalProducts",
    icon: ShoppingBag,
    name: "Digital Products",
    description: "Courses, ebooks, templates, and other digital resources",
    type: "predefined",
    suggestedPrice: 2000,
  },
  {
    key: "notes",
    icon: FileText,
    name: "Notes & Resources",
    description: "Study materials, bootcamp notes, and educational content",
    type: "predefined",
    suggestedPrice: 300,
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

  // Generate AI-suggested services on mount
  useEffect(() => {
    const formData = form.getValues();
    const suggested = generateCustomServices(formData);
    setCustomServices(suggested);

    // Initialize service_pricing with suggested services
    const currentPricing = form.getValues("servicePricing") || {};
    suggested.forEach((service) => {
      if (!currentPricing[service.key]) {
        form.setValue(`servicePricing.${service.key}`, {
          enabled: false,
          name: service.name,
          description: service.description,
          price: service.suggestedPrice,
          type: "custom",
          hasFreeDemo: false,
        });
      }
    });
  }, []);

  const handleAddCustomService = () => {
    if (!newService.name || !newService.description) return;

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
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-matepeak-primary to-matepeak-secondary flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-gray-900">
              Services & Pricing
            </h3>
            <p className="text-gray-600 text-sm">
              Select services you want to offer and set your pricing
            </p>
          </div>
        </div>
        {customServices.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-xs text-blue-900">
              <strong>✨ AI Suggested:</strong> We've added custom services based on your profile. Enable, edit pricing, or remove them as needed.
            </p>
          </div>
        )}
      </div>

      {/* Services List */}
      <div className="space-y-4">
        {allServices.map((service) => {
          const Icon = service.icon;
          const isCustom = service.type === "custom";

          return (
            <Card
              key={service.key}
              className="border-2 border-gray-200 hover:border-matepeak-primary/40 transition-all"
            >
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="w-10 h-10 rounded-xl bg-matepeak-primary/10 flex items-center justify-center flex-shrink-0">
                      <Icon className="w-5 h-5 text-matepeak-primary" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-lg">{service.name}</CardTitle>
                        {isCustom && (
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                            Custom
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
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
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Enable Toggle */}
                <FormField
                  control={form.control}
                  name={`servicePricing.${service.key}.enabled`}
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between space-y-0 p-3 bg-gray-50 rounded-lg">
                      <div>
                        <FormLabel className="text-base font-medium">
                          Offer this service
                        </FormLabel>
                        <FormDescription className="text-xs">
                          Toggle on to make this service available
                        </FormDescription>
                      </div>
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
                          className="data-[state=checked]:bg-matepeak-primary"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                {/* Pricing Section - Only show if enabled */}
                {form.watch(`servicePricing.${service.key}.enabled`) && (
                  <div className="space-y-4 animate-fade-in">
                    {/* Price Input */}
                    <FormField
                      control={form.control}
                      name={`servicePricing.${service.key}.price`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium">
                            Price per session (INR)
                          </FormLabel>
                          <FormControl>
                            <div className="relative">
                              <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                              <Input
                                type="number"
                                placeholder={service.suggestedPrice.toString()}
                                className="pl-10"
                                value={field.value || service.suggestedPrice}
                                onChange={(e) =>
                                  field.onChange(
                                    e.target.valueAsNumber || service.suggestedPrice
                                  )
                                }
                              />
                            </div>
                          </FormControl>
                          <FormDescription className="text-xs">
                            Suggested: ₹{service.suggestedPrice}
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Free Demo Option */}
                    <FormField
                      control={form.control}
                      name={`servicePricing.${service.key}.hasFreeDemo`}
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-lg border border-green-200 bg-green-50 p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value || false}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none flex-1">
                            <FormLabel className="flex items-center gap-2 font-medium text-sm">
                              <Gift className="w-4 h-4 text-green-600" />
                              Offer free demo
                            </FormLabel>
                            <FormDescription className="text-xs">
                              Attract more students with a complimentary trial
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />

                    {/* Custom Service - Edit Options */}
                    {isCustom && (
                      <div className="space-y-3 pt-2 border-t">
                        <FormField
                          control={form.control}
                          name={`servicePricing.${service.key}.name`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs font-medium">
                                Service Name
                              </FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="Enter service name"
                                  {...field}
                                  value={field.value || service.name}
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
                              <FormLabel className="text-xs font-medium">
                                Service Description
                              </FormLabel>
                              <FormControl>
                                <Textarea
                                  placeholder="Describe what this service includes"
                                  className="resize-none"
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
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Add Custom Service */}
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
        {!showAddService ? (
          <Button
            type="button"
            variant="outline"
            onClick={() => setShowAddService(true)}
            className="w-full"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Custom Service
          </Button>
        ) : (
          <div className="space-y-4">
            <h4 className="font-semibold text-gray-900">Create Custom Service</h4>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Service Name
                </label>
                <Input
                  placeholder="e.g., Portfolio Review"
                  value={newService.name}
                  onChange={(e) =>
                    setNewService({ ...newService, name: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Description
                </label>
                <Textarea
                  placeholder="What does this service include?"
                  rows={3}
                  value={newService.description}
                  onChange={(e) =>
                    setNewService({ ...newService, description: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Starting Price (INR)
                </label>
                <div className="relative">
                  <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <Input
                    type="number"
                    placeholder="500"
                    className="pl-10"
                    value={newService.price || ""}
                    onChange={(e) =>
                      setNewService({
                        ...newService,
                        price: e.target.valueAsNumber || 0,
                      })
                    }
                  />
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  onClick={handleAddCustomService}
                  disabled={!newService.name || !newService.description}
                  className="flex-1"
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
                  className="flex-1"
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
