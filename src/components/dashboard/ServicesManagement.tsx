import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SERVICE_CONFIG } from "@/config/serviceConfig";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/sonner";
import {
  Plus,
  Edit2,
  Trash2,
  Save,
  X,
  DollarSign,
  Briefcase,
  MessageSquare,
  Package,
  FileText,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Copy,
  Search,
  Filter,
  MoreVertical,
  Eye,
  Zap,
  TrendingUp,
  BarChart3,
  GripVertical,
  ArrowUp,
  ArrowDown,
  ArrowRight,
  Sparkles,
  CheckCircle,
  XCircle,
  Video,
  FileStack,
  Wrench,
  Clock,
  IndianRupee,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Service {
  order?: number;
  bookingsCount?: number;
  revenue?: number;
  id: string;
  name: string;
  description: string;
  price: number;
  discount_price?: number;
  enabled: boolean;
  serviceType: string;
  hasFreeDemo?: boolean;
  productLink?: string;
  duration?: number;
}

interface ServicePricing {
  oneOnOneSession?: {
    enabled: boolean;
    price: number;
    discount_price?: number;
    hasFreeDemo?: boolean;
  };
  priorityDm?: {
    enabled: boolean;
    price: number;
    discount_price?: number;
    hasFreeDemo?: boolean;
  };
  digitalProducts?: {
    enabled: boolean;
    price: number;
    discount_price?: number;
    productLink?: string;
  };
}

// Use shared SERVICE_CONFIG for consistent naming
const serviceTypeIcons: Record<string, any> = {
  oneOnOneSession: SERVICE_CONFIG.oneOnOneSession?.icon || Briefcase,
  priorityDm: SERVICE_CONFIG.priorityDm?.icon || MessageSquare,
  digitalProducts: SERVICE_CONFIG.digitalProducts?.icon || Package,
  custom: Plus,
};

const serviceTypeLabels: Record<string, string> = {
  oneOnOneSession: SERVICE_CONFIG.oneOnOneSession?.name || "1-on-1 Session",
  priorityDm: SERVICE_CONFIG.priorityDm?.name || "Priority DM",
  digitalProducts: SERVICE_CONFIG.digitalProducts?.name || "Digital Products",
  custom: "Custom Service",
};

// Service Templates
// Suggested service names grouped by type
const SERVICE_NAME_OPTIONS: { group: string; names: string[] }[] = [
  {
    group: "1-on-1 Sessions",
    names: [
      "Resume Review & Feedback",
      "Mock Interview Session",
      "Career Roadmap Planning",
      "LinkedIn Profile Optimization",
      "Salary Negotiation Coaching",
      "Job Search Strategy Session",
      "Career Change Consultation",
      "Technical Interview Prep",
      "Portfolio Review",
      "Startup Idea Validation",
      "Product Strategy Session",
      "Leadership Coaching",
      "Personal Branding Session",
      "Goal Setting & Accountability",
      "UPSC / Competitive Exam Guidance",
    ],
  },
  {
    group: "Priority DM / Async Advice",
    names: [
      "Career Clarity – Ask Anything",
      "Quick Resume Feedback",
      "LinkedIn Quick Review",
      "Job Application Review",
      "Interview Tip Sheet",
      "Code Review & Feedback",
      "Project Feedback",
      "Business Idea Feedback",
    ],
  },
  {
    group: "Digital Products",
    names: [
      "Resume & LinkedIn Starter Pack",
      "Interview Question Bank",
      "Career Transition Playbook",
      "Cold Email Templates",
      "Freelance Starter Kit",
      "Tech Interview Cheat Sheet",
      "Personal Finance Basics Guide",
      "Study Plan Template",
    ],
  },
];

const ALL_SERVICE_NAMES = SERVICE_NAME_OPTIONS.flatMap((g) => g.names);

// Map each service name to its type based on which group it belongs to
const SERVICE_TYPE_MAP: Record<string, string> = {
  ...Object.fromEntries(
    SERVICE_NAME_OPTIONS[0].names.map((n) => [n, "oneOnOneSession"])
  ),
  ...Object.fromEntries(
    SERVICE_NAME_OPTIONS[1].names.map((n) => [n, "priorityDm"])
  ),
  ...Object.fromEntries(
    SERVICE_NAME_OPTIONS[2].names.map((n) => [n, "digitalProducts"])
  ),
};

const serviceTemplates = [
  {
    name: "Resume Review & Feedback",
    description:
      "Comprehensive resume review with detailed feedback and suggestions for improvement",
    price: 999,
    serviceType: "oneOnOneSession",
    hasFreeDemo: false,
  },
  {
    name: "Mock Interview Session",
    description:
      "One hour mock interview with detailed feedback on your performance and areas to improve",
    price: 1499,
    serviceType: "oneOnOneSession",
    hasFreeDemo: true,
  },
  {
    name: "Career Roadmap Planning",
    description:
      "Personalized career roadmap with actionable steps and milestones for the next 6-12 months",
    price: 2499,
    serviceType: "oneOnOneSession",
    hasFreeDemo: false,
  },
  {
    name: "LinkedIn Profile Optimization",
    description:
      "Complete LinkedIn profile makeover to increase visibility and attract recruiters",
    price: 799,
    serviceType: "oneOnOneSession",
    hasFreeDemo: false,
  },
  {
    name: "Salary Negotiation Coaching",
    description:
      "Learn proven strategies to negotiate better offers and maximize your compensation",
    price: 1999,
    serviceType: "oneOnOneSession",
    hasFreeDemo: false,
  },
];

export default function ServicesManagement({ mentorId }: { mentorId: string }) {
  const [services, setServices] = useState<Service[]>([]);
  const [servicePricing, setServicePricing] = useState<ServicePricing>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingService, setEditingService] = useState<string | null>(null);
  const [deletingService, setDeletingService] = useState<string | null>(null);
  const [addingNew, setAddingNew] = useState(false);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<
    "all" | "active" | "disabled"
  >("all");
  const [filterType, setFilterType] = useState<string>("all");
  const [showTemplates, setShowTemplates] = useState(false);

  // Drag and drop state
  const [draggedService, setDraggedService] = useState<string | null>(null);

  // New service form state
  const [newService, setNewService] = useState<Partial<Service>>({
    name: "",
    description: "",
    price: 0,
    discount_price: undefined,
    enabled: true,
    serviceType: "oneOnOneSession",
    hasFreeDemo: false,
    productLink: "",
    duration: 60,
  });

  // Custom duration input mode per-dialog: "new" or "edit"
  const [newCustomDuration, setNewCustomDuration] = useState(false);
  const [editCustomDuration, setEditCustomDuration] = useState(false);

  // Custom name input mode per-dialog
  const [newCustomName, setNewCustomName] = useState(false);
  const [editCustomName, setEditCustomName] = useState(false);

  // Edit form state
  const [editForm, setEditForm] = useState<Partial<Service>>({});

  useEffect(() => {
    loadServices();
  }, [mentorId]);

  const loadServices = async () => {
    try {
      setLoading(true);

      const { data: profile, error } = await supabase
        .from("expert_profiles")
        .select("service_pricing")
        .eq("id", mentorId)
        .single();

      if (error) throw error;

      // Load unified service_pricing
      const pricing = profile?.service_pricing || {};
      setServicePricing(pricing);

      // Convert service_pricing to service format for unified display
      const allServices: Service[] = [];

      // Iterate through all services in service_pricing
      Object.entries(pricing).forEach(([key, value]: [string, any], index) => {
        if (value && typeof value === 'object') {
          const isCustom = !["oneOnOneSession", "priorityDm", "digitalProducts"].includes(key);
          
          allServices.push({
            id: key,
            name: value.name || serviceTypeLabels[key] || "Custom Service",
            description: value.description || "",
            price: value.price || 0,
            discount_price: value.discount_price,
            enabled: value.enabled || false,
            serviceType: isCustom ? (value.type || "custom") : key,
            hasFreeDemo: value.hasFreeDemo || false,
            productLink:
              value.productLink || value.product_url || value.product_link || "",
            order: value.order ?? index,
            duration: value.duration,
          });
        }
      });

      // Sort by order
      allServices.sort((a, b) => (a.order || 0) - (b.order || 0));

      setServices(allServices);
    } catch (error: any) {
      console.error("Error loading services:", error);
      toast.error("Failed to load services");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveService = async (serviceId: string) => {
    try {
      setSaving(true);

      const service = services.find((s) => s.id === serviceId);
      if (!service) {
        console.log("❌ Service not found:", serviceId);
        return;
      }

      console.log("📝 Starting save for service:", service);
      console.log("📝 Edit form data:", editForm);

      // Validate
      if (!editForm.name?.trim()) {
        toast.error("Service name is required");
        return;
      }
      if (!editForm.description?.trim()) {
        toast.error("Service description is required");
        return;
      }
      if (editForm.price === undefined || editForm.price < 0) {
        toast.error("Please enter a valid price");
        return;
      }

      if (
        service.serviceType === "digitalProducts" &&
        !isValidHttpsUrl(editForm.productLink)
      ) {
        toast.error(
          "Please add a valid https digital product link for this service"
        );
        return;
      }

      const updatedService = { ...service, ...editForm };
      console.log("✏️ Updated service object:", updatedService);

      // Update service_pricing (works for both predefined and custom services)
      console.log("🔧 Updating service in unified structure:", service.id);
      const updatedPricing = {
        ...servicePricing,
        [service.id]: {
          enabled: updatedService.enabled,
          name: updatedService.name,
          description: updatedService.description,
          price: updatedService.price,
          discount_price: updatedService.discount_price,
          hasFreeDemo: updatedService.hasFreeDemo || false,
          productLink:
            service.serviceType === "digitalProducts"
              ? updatedService.productLink || null
              : null,
          type: service.serviceType,
          order: updatedService.order,
          duration: updatedService.duration,
        },
      };

      console.log("💾 Saving service_pricing to database:", updatedPricing);
      const { data, error } = await supabase
        .from("expert_profiles")
        .update({ service_pricing: updatedPricing })
        .eq("id", mentorId)
        .select();

      if (error) {
        console.error("❌ Database error:", error);
        throw error;
      }
      console.log("✅ Database update successful:", data);
      setServicePricing(updatedPricing);

      // Update local state
      setServices((prev) =>
        prev.map((s) => (s.id === serviceId ? updatedService : s))
      );
      setEditingService(null);
      setEditForm({});
      toast.success("Service updated successfully!", { duration: 5000 });
      console.log("✅ Service save complete!");
    } catch (error: any) {
      console.error("❌ Error saving service:", error);
      toast.error("Failed to save service: " + error.message, {
        duration: 5000,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleService = async (serviceId: string) => {
    try {
      const service = services.find((s) => s.id === serviceId);
      if (!service) return;

      const updatedEnabled = !service.enabled;

      // Update in unified service_pricing structure
      const updatedPricing = {
        ...servicePricing,
        [serviceId]: {
          ...servicePricing[serviceId],
          enabled: updatedEnabled,
        },
      };

      const { error } = await supabase
        .from("expert_profiles")
        .update({ service_pricing: updatedPricing })
        .eq("id", mentorId);

      if (error) throw error;
      setServicePricing(updatedPricing);

      setServices((prev) =>
        prev.map((s) =>
          s.id === serviceId ? { ...s, enabled: updatedEnabled } : s
        )
      );

      // If enabling a service, automatically open edit mode
      if (updatedEnabled) {
        const presets = [15, 30, 60];
        setEditCustomDuration(!!service.duration && !presets.includes(service.duration));
        setEditingService(serviceId);
        setEditForm({
          name: service.name,
          description: service.description,
          price: service.price,
          discount_price: service.discount_price,
          enabled: updatedEnabled,
          hasFreeDemo: service.hasFreeDemo || false,
          productLink: service.productLink || "",
          duration: service.duration ?? 60,
        });
        toast.success("Service enabled! You can update details in the edit modal.");
      } else {
        toast.success("Service disabled");
      }
    } catch (error: any) {
      console.error("Error toggling service:", error);
      toast.error("Failed to update service");
    }
  };

  const handleDeleteService = async (serviceId: string) => {
    try {
      setSaving(true);

      const service = services.find((s) => s.id === serviceId);
      if (!service) return;

      // Can't delete predefined services, only disable them
      if (
        ["oneOnOneSession", "priorityDm", "digitalProducts"].includes(
          service.serviceType
        )
      ) {
        toast.error(
          "Cannot delete predefined services. You can disable them instead."
        );
        setDeletingService(null);
        return;
      }

      // Delete custom service from service_pricing
      const updatedPricing = { ...servicePricing };
      delete updatedPricing[serviceId];

      const { error } = await supabase
        .from("expert_profiles")
        .update({ service_pricing: updatedPricing })
        .eq("id", mentorId);

      if (error) throw error;

      setServices((prev) => prev.filter((s) => s.id !== serviceId));
      setServicePricing(updatedPricing);
      setDeletingService(null);
      toast.success("Service deleted successfully!");
    } catch (error: any) {
      console.error("Error deleting service:", error);
      toast.error("Failed to delete service");
    } finally {
      setSaving(false);
    }
  };

  const handleAddService = async () => {
    try {
      setSaving(true);

      // Validate
      if (!newService.name?.trim()) {
        toast.error("Service name is required");
        return;
      }
      if (!newService.description?.trim()) {
        toast.error("Service description is required");
        return;
      }
      if (newService.price === undefined || newService.price < 0) {
        toast.error("Please enter a valid price");
        return;
      }

      if (
        newService.serviceType === "digitalProducts" &&
        !isValidHttpsUrl(newService.productLink)
      ) {
        toast.error(
          "Please add a valid https digital product link for this service"
        );
        return;
      }

      // Generate unique ID
      const serviceId = `custom_${Date.now()}_${Math.random()
        .toString(36)
        .substr(2, 9)}`;

      const service: Service = {
        id: serviceId,
        name: newService.name,
        description: newService.description,
        price: newService.price,
        discount_price: newService.discount_price,
        enabled: newService.enabled ?? true,
        serviceType: newService.serviceType || "oneOnOneSession",
        hasFreeDemo: newService.hasFreeDemo ?? false,
        productLink: newService.productLink || "",
        duration: newService.duration,
      };

      // Add to service_pricing (unified structure)
      const updatedPricing = {
        ...servicePricing,
        [serviceId]: {
          enabled: service.enabled,
          name: service.name,
          description: service.description,
          price: service.price,
          discount_price: service.discount_price,
          hasFreeDemo: service.hasFreeDemo,
          productLink:
            service.serviceType === "digitalProducts"
              ? service.productLink || null
              : null,
          type: service.serviceType,
          duration: service.duration,
        },
      };

      const { error } = await supabase
        .from("expert_profiles")
        .update({ service_pricing: updatedPricing })
        .eq("id", mentorId);

      if (error) throw error;

      setServices((prev) => [...prev, service]);
      setServicePricing(updatedPricing);
      setAddingNew(false);
      resetNewServiceForm();
      toast.success("Service added successfully!");
    } catch (error: any) {
      console.error("Error adding service:", error);
      toast.error("Failed to add service");
    } finally {
      setSaving(false);
    }
  };

  const handleDuplicateService = async (serviceId: string) => {
    const service = services.find((s) => s.id === serviceId);
    if (!service) return;

    setNewService({
      name: `${service.name} (Copy)`,
      description: service.description,
      price: service.price,
      discount_price: service.discount_price,
      enabled: false,
      serviceType: service.serviceType || "oneOnOneSession",
      hasFreeDemo: service.hasFreeDemo || false,
      productLink: service.productLink || "",
      duration: service.duration ?? 60,
    });
    const presets = [15, 30, 60];
    setNewCustomDuration(!!service.duration && !presets.includes(service.duration));
    setAddingNew(true);
    toast.info("Service duplicated. Edit and save the new service.");
  };

  const useTemplate = (template: (typeof serviceTemplates)[0]) => {
    setNewService({
      name: template.name,
      description: template.description,
      price: template.price,
      enabled: true,
      serviceType: template.serviceType,
      hasFreeDemo: template.hasFreeDemo,
    });
    setAddingNew(true);
    setShowTemplates(false);
    toast.success("Template loaded! Customize and save.");
  };

  const handleMoveService = async (
    serviceId: string,
    direction: "up" | "down"
  ) => {
    const index = services.findIndex((s) => s.id === serviceId);
    if (index === -1) return;
    if (direction === "up" && index === 0) return;
    if (direction === "down" && index === services.length - 1) return;

    const newServices = [...services];
    const targetIndex = direction === "up" ? index - 1 : index + 1;

    // Swap
    [newServices[index], newServices[targetIndex]] = [
      newServices[targetIndex],
      newServices[index],
    ];

    // Update orders
    const reorderedServices = newServices.map((s, i) => ({ ...s, order: i }));
    setServices(reorderedServices);

    // Save to database
    try {
      // Update service_pricing with new orders
      const updatedPricing = { ...servicePricing };
      reorderedServices.forEach((service) => {
        if (updatedPricing[service.id]) {
          updatedPricing[service.id] = {
            ...updatedPricing[service.id],
            order: service.order,
          };
        }
      });
      
      await supabase
        .from("expert_profiles")
        .update({ service_pricing: updatedPricing })
        .eq("id", mentorId);
        
      setServicePricing(updatedPricing);
      toast.success("Service order updated");
    } catch (error) {
      console.error("Error updating order:", error);
      toast.error("Failed to update order");
    }
  };

  const handleDragStart = (serviceId: string) => {
    setDraggedService(serviceId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (targetServiceId: string) => {
    if (!draggedService || draggedService === targetServiceId) {
      setDraggedService(null);
      return;
    }

    const draggedIndex = services.findIndex((s) => s.id === draggedService);
    const targetIndex = services.findIndex((s) => s.id === targetServiceId);

    if (draggedIndex === -1 || targetIndex === -1) return;

    const newServices = [...services];
    const [removed] = newServices.splice(draggedIndex, 1);
    newServices.splice(targetIndex, 0, removed);

    // Update orders
    const reorderedServices = newServices.map((s, i) => ({ ...s, order: i }));
    setServices(reorderedServices);
    setDraggedService(null);

    // Save to database
    try {
      // Update service_pricing with new orders
      const updatedPricing = { ...servicePricing };
      reorderedServices.forEach((service) => {
        if (updatedPricing[service.id]) {
          updatedPricing[service.id] = {
            ...updatedPricing[service.id],
            order: service.order,
          };
        }
      });
      
      await supabase
        .from("expert_profiles")
        .update({ service_pricing: updatedPricing })
        .eq("id", mentorId);
        
      setServicePricing(updatedPricing);

      toast.success("Service order updated");
    } catch (error) {
      console.error("Error updating order:", error);
      toast.error("Failed to update order");
    }
  };

  const startEdit = (service: Service) => {
    setEditingService(service.id);
    const presets = [15, 30, 60];
    setEditCustomDuration(!!service.duration && !presets.includes(service.duration));
    setEditCustomName(!ALL_SERVICE_NAMES.includes(service.name));
    setEditForm({
      name: service.name,
      description: service.description,
      price: service.price,
      enabled: service.enabled,
      hasFreeDemo: service.hasFreeDemo,
      productLink: service.productLink || "",
      duration: service.duration ?? 60,
    });
  };

  const cancelEdit = () => {
    setEditingService(null);
    setEditForm({});
    setEditCustomDuration(false);
    setEditCustomName(false);
  };

  const resetNewServiceForm = () => {
    setNewService({
      name: "",
      description: "",
      price: 0,
      discount_price: undefined,
      enabled: true,
      serviceType: "oneOnOneSession",
      hasFreeDemo: false,
      productLink: "",
      duration: 60,
    });
    setNewCustomDuration(false);
    setNewCustomName(false);
  };

  const isValidHttpsUrl = (value?: string) => {
    if (!value?.trim()) return false;
    try {
      const parsed = new URL(value.trim());
      return parsed.protocol === "https:";
    } catch {
      return false;
    }
  };

  const editingServiceData = services.find((service) => service.id === editingService) || null;

  // Filter and search logic
  const filteredServices = services.filter((service) => {
    // Search filter
    const matchesSearch =
      service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      service.description.toLowerCase().includes(searchQuery.toLowerCase());

    // Status filter
    const matchesStatus =
      filterStatus === "all" ||
      (filterStatus === "active" && service.enabled) ||
      (filterStatus === "disabled" && !service.enabled);

    // Type filter
    const matchesType =
      filterType === "all" || service.serviceType === filterType;

    return matchesSearch && matchesStatus && matchesType;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  const enabledServices = services.filter((s) => s.enabled).length;
  const totalRevenue = services
    .filter((s) => s.enabled)
    .reduce((sum, s) => sum + s.price, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">
          Services Management
        </h2>
        <p className="text-gray-600 mt-1">
          Manage your service offerings, pricing, and availability
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="group bg-gray-100 border-0 rounded-2xl shadow-none hover:shadow-md transition-all duration-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Active Services
                </p>
                <div className="flex items-baseline mt-3">
                  <p className="text-3xl font-bold text-gray-900">
                    {enabledServices}
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-center group-hover:scale-105 transition-transform">
                <CheckCircle2 className="h-6 w-6 text-rose-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="group bg-gray-100 border-0 rounded-2xl shadow-none hover:shadow-md transition-all duration-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Total Services
                </p>
                <div className="flex items-baseline mt-3">
                  <p className="text-3xl font-bold text-gray-900">
                    {services.length}
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-center group-hover:scale-105 transition-transform">
                <Briefcase className="h-6 w-6 text-rose-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="group bg-gray-100 border-0 rounded-2xl shadow-none hover:shadow-md transition-all duration-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Potential Revenue
                </p>
                <div className="flex items-baseline mt-3">
                  <p className="text-3xl font-bold text-gray-900">
                    ₹{totalRevenue}
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-center group-hover:scale-105 transition-transform">
                <TrendingUp className="h-6 w-6 text-rose-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card className="border-0 shadow-sm bg-gradient-to-br from-gray-50 to-white">
        <CardContent className="p-6">
          {/* Search Bar */}
          <div className="relative mb-4">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <Input
              placeholder="Search services by name or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 pr-4 h-12 text-base border-gray-200 focus:border-rose-400 focus:ring-rose-400/20 rounded-xl"
            />
          </div>

          {/* Filters Row */}
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            {/* Status Filters */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                Status:
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setFilterStatus("all")}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    filterStatus === "all"
                      ? "bg-gray-900 text-white shadow-sm"
                      : "bg-white text-gray-600 border border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <Filter className="h-3.5 w-3.5" />
                  All
                </button>
                <button
                  onClick={() => setFilterStatus("active")}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    filterStatus === "active"
                      ? "bg-emerald-500 text-white shadow-sm"
                      : "bg-white text-gray-600 border border-gray-200 hover:border-emerald-300"
                  }`}
                >
                  <CheckCircle className="h-3.5 w-3.5" />
                  Active
                </button>
                <button
                  onClick={() => setFilterStatus("disabled")}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    filterStatus === "disabled"
                      ? "bg-gray-500 text-white shadow-sm"
                      : "bg-white text-gray-600 border border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <XCircle className="h-3.5 w-3.5" />
                  Disabled
                </button>
              </div>
            </div>

            {/* Type Dropdown */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                Type:
              </span>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-[200px] h-9 rounded-lg border-gray-200 focus:border-rose-400 focus:ring-rose-400/20">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-gray-200">
                  <SelectItem value="all" className="rounded-lg">
                    <div className="flex items-center gap-2">
                      <Briefcase className="h-4 w-4 text-gray-500" />
                      <span>All Types</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="oneOnOneSession" className="rounded-lg">
                    <div className="flex items-center gap-2">
                      <Video className="h-4 w-4 text-rose-500" />
                      <span>1-on-1 Session</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="priorityDm" className="rounded-lg">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4 text-blue-500" />
                      <span>Priority DM</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="digitalProducts" className="rounded-lg">
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-purple-500" />
                      <span>Digital Products</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {(searchQuery || filterStatus !== "all" || filterType !== "all") && (
            <div className="flex items-center justify-between gap-2 mt-4 pt-4 border-t border-gray-100">
              <span className="text-sm font-medium text-gray-700">
                Showing{" "}
                <span className="font-bold text-gray-900">
                  {filteredServices.length}
                </span>{" "}
                of {services.length} services
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchQuery("");
                  setFilterStatus("all");
                  setFilterType("all");
                }}
                className="h-8 text-xs hover:bg-gray-100"
              >
                <X className="h-3.5 w-3.5 mr-1" />
                Clear Filters
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex gap-2">
        <Button onClick={() => setAddingNew(true)} variant="default">
          <Plus className="h-4 w-4 mr-2" />
          Add New Service
        </Button>
        <Button
          onClick={() => setShowTemplates(!showTemplates)}
          variant="outline"
        >
          <Sparkles className="h-4 w-4 mr-2" />
          Use Template
        </Button>
      </div>

      {/* Service Templates */}
      {showTemplates && (
        <Card className="border-2 border-purple-200 bg-purple-50/50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-purple-600" />
                  Service Templates
                </CardTitle>
                <CardDescription>
                  Quick-start templates to save time
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowTemplates(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {serviceTemplates.map((template, index) => (
                <Card
                  key={index}
                  className="hover:border-purple-300 transition-colors cursor-pointer"
                  onClick={() => useTemplate(template)}
                >
                  <CardContent className="p-4">
                    <h4 className="font-semibold text-sm mb-1">
                      {template.name}
                    </h4>
                    <p className="text-xs text-gray-600 mb-2 line-clamp-2">
                      {template.description}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-gray-900">
                        ₹{template.price}
                      </span>
                      {template.hasFreeDemo && (
                        <Badge className="text-xs bg-green-100 text-green-700">
                          Free Demo
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add New Service Button - Remove old one */}
      {services.length === 0 && (
        <div className="text-center py-8">
          <Button
            onClick={() => setAddingNew(true)}
            variant="outline"
            size="lg"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Your First Service
          </Button>
        </div>
      )}

      {/* Add New Service Form */}
      <Dialog
        open={addingNew}
        onOpenChange={(open) => {
          setAddingNew(open);
          if (!open) resetNewServiceForm();
        }}
      >
        <DialogContent className="flex w-[calc(100vw-2rem)] max-w-4xl max-h-[92vh] flex-col overflow-hidden p-0 rounded-2xl gap-0">
          {/* Header */}
          <div className="px-6 pt-5 pb-4 border-b border-gray-100 flex-shrink-0">
            <DialogTitle className="text-lg font-semibold text-gray-900 tracking-tight">New Service</DialogTitle>
            <DialogDescription className="text-sm text-gray-500 mt-0.5">
              Create a service offering for your students.
            </DialogDescription>
          </div>

          {/* Two-column body */}
          <div className="flex flex-1 overflow-hidden min-h-0">

            {/* Left: Scrollable form + footer */}
            <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

            {/* — Basics — */}
            <div className="space-y-4">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400">Basics</p>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-gray-700">Service Name</Label>
                {!newCustomName ? (
                  <Select
                    value={newService.name || ""}
                    onValueChange={(val) => {
                      if (val === "__custom__") {
                        setNewCustomName(true);
                        setNewService({ ...newService, name: "" });
                      } else {
                        const detectedType = SERVICE_TYPE_MAP[val] ?? newService.serviceType ?? "oneOnOneSession";
                        const is1on1 = detectedType === "oneOnOneSession";
                        setNewService({
                          ...newService,
                          name: val,
                          serviceType: detectedType,
                          duration: is1on1 ? (newService.duration ?? 60) : undefined,
                          hasFreeDemo: detectedType === "digitalProducts" ? false : newService.hasFreeDemo,
                        });
                      }
                    }}
                  >
                    <SelectTrigger className="h-10 rounded-xl border-gray-200 bg-gray-50 focus:border-gray-400 focus:ring-1 focus:ring-gray-300">
                      <SelectValue placeholder="Choose a service name…" />
                    </SelectTrigger>
                    <SelectContent className="max-h-72">
                      {SERVICE_NAME_OPTIONS.map((group) => (
                        <>
                          <div key={group.group} className="px-2 pt-2 pb-1">
                            <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">{group.group}</p>
                          </div>
                          {group.names.map((name) => (
                            <SelectItem key={name} value={name}>{name}</SelectItem>
                          ))}
                        </>
                      ))}
                      <div className="border-t border-gray-100 mt-1 pt-1">
                        <SelectItem value="__custom__" className="font-medium text-blue-600">✏️  Custom name…</SelectItem>
                      </div>
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="flex gap-2">
                    <Input
                      autoFocus
                      value={newService.name}
                      onChange={(e) => setNewService({ ...newService, name: e.target.value })}
                      placeholder="Enter your service name"
                      maxLength={100}
                      className="h-10 rounded-xl border-gray-200 focus:border-gray-400 focus:ring-1 focus:ring-gray-300 bg-gray-50 flex-1"
                    />
                    <button
                      type="button"
                      onClick={() => { setNewCustomName(false); setNewService({ ...newService, name: "" }); }}
                      className="text-xs text-gray-400 hover:text-gray-700 px-2 whitespace-nowrap"
                    >
                      Use list
                    </button>
                  </div>
                )}
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <Label className="text-sm font-medium text-gray-700">Service Type</Label>
                  {!newCustomName && newService.name && SERVICE_TYPE_MAP[newService.name] && (
                    <span className="text-[10px] font-medium text-gray-400 bg-gray-100 rounded-full px-2 py-0.5">Auto-selected</span>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-1.5 p-1 bg-gray-100 rounded-xl">
                  {[
                    { value: "oneOnOneSession", label: "1-on-1", icon: Video },
                    { value: "priorityDm", label: "Priority DM", icon: MessageSquare },
                    { value: "digitalProducts", label: "Digital", icon: Package },
                  ].map(({ value, label, icon: Icon }) => {
                    const lockedType = !newCustomName && newService.name ? SERVICE_TYPE_MAP[newService.name] : null;
                    const isActive = (newService.serviceType ?? "oneOnOneSession") === value;
                    const isDisabled = !!lockedType && lockedType !== value;
                    return (
                      <button
                        key={value}
                        type="button"
                        disabled={isDisabled}
                        onClick={() => !isDisabled && setNewService({
                          ...newService,
                          serviceType: value,
                          hasFreeDemo: value === "digitalProducts" ? false : newService.hasFreeDemo,
                          duration: value === "oneOnOneSession" ? (newService.duration ?? 60) : undefined,
                        })}
                        className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                          isActive
                            ? "bg-white text-gray-900 shadow-sm"
                            : isDisabled
                            ? "text-gray-300 cursor-not-allowed"
                            : "text-gray-500 hover:text-gray-700"
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* — Session Duration (1-on-1 only) — */}
              {(newService.serviceType ?? "oneOnOneSession") === "oneOnOneSession" && (
                <div className="space-y-3">
                  <Label className="text-sm font-medium text-gray-700">Session Duration</Label>
                  <div className="grid grid-cols-4 gap-1.5 p-1 bg-gray-100 rounded-xl">
                    {[15, 30, 60].map((mins) => (
                      <button
                        key={mins}
                        type="button"
                        onClick={() => { setNewService({ ...newService, duration: mins }); setNewCustomDuration(false); }}
                        className={`py-2 rounded-lg text-sm font-medium transition-all ${
                          !newCustomDuration && (newService.duration ?? 60) === mins
                            ? "bg-white text-gray-900 shadow-sm"
                            : "text-gray-500 hover:text-gray-700"
                        }`}
                      >
                        {mins} min
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setNewCustomDuration(true)}
                      className={`py-2 rounded-lg text-sm font-medium transition-all ${
                        newCustomDuration ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                      }`}
                    >
                      Custom
                    </button>
                  </div>
                  {newCustomDuration && (
                    <div className="flex items-center gap-2">
                      <Input
                        type="number" min={5} max={480} step={5} placeholder="45"
                        value={newService.duration && ![15, 30, 60].includes(newService.duration) ? newService.duration : ""}
                        onChange={(e) => { const v = e.target.valueAsNumber; if (!isNaN(v) && v > 0) setNewService({ ...newService, duration: v }); }}
                        className="w-24 h-9 rounded-xl border-gray-200 focus:border-gray-400 bg-gray-50"
                      />
                      <span className="text-sm text-gray-500">minutes</span>
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="new-description" className="text-sm font-medium text-gray-700">Description</Label>
                <Textarea
                  id="new-description"
                  value={newService.description}
                  onChange={(e) => setNewService({ ...newService, description: e.target.value })}
                  placeholder="What will students get from this service?"
                  className="resize-none rounded-xl border-gray-200 focus:border-gray-400 focus:ring-1 focus:ring-gray-300 bg-gray-50 text-sm leading-relaxed min-h-[88px]"
                  maxLength={500}
                />
                <p className="text-xs text-gray-400 text-right">{newService.description?.length ?? 0} / 500</p>
              </div>
            </div>

            {/* — Pricing — */}
            <div className="space-y-4 border-t border-gray-100 pt-5">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400">Pricing</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="new-price" className="text-sm font-medium text-gray-700">Price <span className="text-gray-400 font-normal">(₹)</span></Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₹</span>
                    <Input
                      id="new-price"
                      type="number"
                      min="0"
                      value={newService.price || ""}
                      onChange={(e) => setNewService({ ...newService, price: parseFloat(e.target.value) || 0 })}
                      placeholder="0"
                      className="pl-7 h-10 rounded-xl border-gray-200 focus:border-gray-400 focus:ring-1 focus:ring-gray-300 bg-gray-50"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="new-discount-price" className="text-sm font-medium text-gray-700">Sale Price <span className="text-gray-400 font-normal">(optional)</span></Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₹</span>
                    <Input
                      id="new-discount-price"
                      type="number"
                      min="0"
                      value={newService.discount_price || ""}
                      onChange={(e) => setNewService({ ...newService, discount_price: e.target.value ? parseFloat(e.target.value) : undefined })}
                      placeholder="—"
                      className="pl-7 h-10 rounded-xl border-gray-200 focus:border-gray-400 focus:ring-1 focus:ring-gray-300 bg-gray-50"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* — Product Link (digital only) — */}
            {newService.serviceType === "digitalProducts" && (
              <div className="space-y-3 border-t border-gray-100 pt-5">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400">Product Access</p>
                <div className="space-y-1.5">
                  <Label htmlFor="new-product-link" className="text-sm font-medium text-gray-700">Digital Product Link</Label>
                  <Input
                    id="new-product-link"
                    type="url"
                    value={newService.productLink || ""}
                    onChange={(e) => setNewService({ ...newService, productLink: e.target.value })}
                    placeholder="https://example.com/product"
                    className="h-10 rounded-xl border-gray-200 focus:border-gray-400 bg-gray-50"
                  />
                  <p className="text-xs text-gray-400">Shared with students after purchase.</p>
                </div>
              </div>
            )}

            {/* — Options — */}
            <div className="space-y-0 border-t border-gray-100 pt-5">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 mb-3">Options</p>
              <div className="divide-y divide-gray-100 rounded-xl border border-gray-200 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3.5 bg-white">
                  <div>
                    <p className="text-sm font-medium text-gray-900">Active</p>
                    <p className="text-xs text-gray-500">Make this service visible to students</p>
                  </div>
                  <Switch
                    checked={!!newService.enabled}
                    onCheckedChange={(enabled) => setNewService({ ...newService, enabled })}
                  />
                </div>
                {newService.serviceType !== "digitalProducts" && (
                  <div className="flex items-center justify-between px-4 py-3.5 bg-white">
                    <div>
                      <p className="text-sm font-medium text-gray-900">Free Demo</p>
                      <p className="text-xs text-gray-500">Offer a free introductory session</p>
                    </div>
                    <Switch
                      checked={!!newService.hasFreeDemo}
                      onCheckedChange={(hasFreeDemo) => setNewService({ ...newService, hasFreeDemo })}
                    />
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* Footer */}
          <div className="border-t border-gray-100 px-6 py-4 flex items-center justify-between gap-3 bg-white flex-shrink-0">
            <button
              type="button"
              onClick={() => { setAddingNew(false); resetNewServiceForm(); }}
              className="text-sm font-medium text-gray-500 hover:text-gray-800 transition-colors"
            >
              Cancel
            </button>
            <Button
              onClick={handleAddService}
              disabled={saving || !newService.name || !newService.description || (newService.serviceType === "digitalProducts" && !isValidHttpsUrl(newService.productLink))}
              className="h-9 px-5 rounded-xl bg-gray-900 hover:bg-gray-700 text-white text-sm font-semibold"
            >
              {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Adding…</> : "Add Service"}
            </Button>
          </div>
            </div>{/* end left column */}

            {/* Right: Live Preview panel */}
            {(() => {
              const previewType = newService.serviceType ?? "oneOnOneSession";
              const PreviewIcon = serviceTypeIcons[previewType] || Briefcase;
              const previewTypeLabel = SERVICE_CONFIG[previewType]?.typeLabel
                ?? serviceTypeLabels[previewType]
                ?? "Mentoring Service";
              return (
                <div className="hidden md:flex w-80 flex-col border-l border-gray-100 bg-gray-50/60 flex-shrink-0">
                  <div className="px-5 py-3 border-b border-gray-100 flex-shrink-0 flex items-center gap-2">
                    <Eye className="h-3.5 w-3.5 text-gray-400" />
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400">Student View</p>
                  </div>
                  <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-3">
                    <Card className="shadow-none border border-gray-200 rounded-2xl">
                      <CardContent className="p-5 flex flex-col gap-4">
                        {/* Icon + Name + Badges */}
                        <div className="flex items-start gap-3">
                          <div className="h-10 w-10 rounded-xl bg-gray-100 border border-gray-200 flex items-center justify-center flex-shrink-0">
                            <PreviewIcon className="h-5 w-5 text-blue-600" />
                          </div>
                          <div className="min-w-0">
                            <h3 className="font-semibold text-gray-900 leading-snug line-clamp-2 min-h-[44px]">
                              {newService.name || <span className="text-gray-300 italic font-normal">Service name…</span>}
                            </h3>
                            <div className="flex items-center gap-1.5 flex-wrap mt-1">
                              <Badge variant="outline" className="text-xs">{previewTypeLabel}</Badge>
                              {newService.duration && previewType === "oneOnOneSession" && (
                                <Badge variant="outline" className="text-xs flex items-center gap-1">
                                  <Clock className="h-3 w-3" />{newService.duration} min
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        {/* Description */}
                        <p className="text-sm text-gray-600 line-clamp-3 min-h-[40px]">
                          {newService.description || <span className="text-gray-300 italic">Description will appear here…</span>}
                        </p>
                        {/* Free Demo Badge */}
                        {newService.hasFreeDemo && previewType !== "digitalProducts" && (
                          <div className="flex items-center gap-1.5 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                            <Sparkles className="h-3.5 w-3.5 text-green-600 flex-shrink-0" />
                            <span className="text-xs font-medium text-green-700">Free Demo Available</span>
                          </div>
                        )}
                        {/* Price + CTA */}
                        <div className="pt-2 border-t border-gray-100 flex items-center justify-between gap-2">
                          {newService.discount_price ? (
                            <div className="flex items-end gap-2">
                              <div className="flex items-center text-green-600 font-semibold text-xl">
                                <IndianRupee className="h-4 w-4" />{newService.discount_price}
                              </div>
                              <span className="text-sm text-gray-400 line-through">₹{newService.price || 0}</span>
                            </div>
                          ) : (
                            <div className="flex items-center text-gray-900 font-semibold text-xl">
                              <IndianRupee className="h-4 w-4" />{newService.price || <span className="text-gray-300 text-base font-normal">0</span>}
                            </div>
                          )}
                          <Button variant="outline" size="sm" disabled className="pointer-events-none text-xs gap-1 opacity-70">
                            View Details <ArrowRight className="h-3 w-3" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                    <p className="text-[11px] text-gray-400 text-center leading-relaxed px-2">
                      Live preview — updates as you type
                    </p>
                  </div>
                </div>
              );
            })()}

          </div>{/* end two-column body */}
        </DialogContent>
      </Dialog>

      {/* Services List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        {filteredServices.length === 0 ? (
          <Card className="lg:col-span-2">
            <CardContent className="py-12 text-center">
              <Briefcase className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 font-medium">
                {searchQuery || filterStatus !== "all" || filterType !== "all"
                  ? "No services match your filters"
                  : "No services yet"}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                {searchQuery || filterStatus !== "all" || filterType !== "all"
                  ? "Try adjusting your search or filters"
                  : "Add your first service to start offering your expertise"}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredServices.map((service, index) => {
            const Icon = serviceTypeIcons[service.serviceType] || Briefcase;
            const isPredefined = [
              "oneOnOneSession",
              "priorityDm",
              "digitalProducts",
            ].includes(service.serviceType);

            return (
              <Card
                key={service.id}
                className={`${service.enabled ? "" : "opacity-60"} ${
                  draggedService === service.id ? "opacity-50" : ""
                }`}
                draggable
                onDragStart={() => handleDragStart(service.id)}
                onDragOver={handleDragOver}
                onDrop={() => handleDrop(service.id)}
              >
                <CardContent className="p-4">
                  <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        {/* Drag Handle */}
                        <div className="flex-shrink-0 pt-1 cursor-move">
                          <GripVertical className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                        </div>

                        <div
                          className={`h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                            service.enabled ? "bg-blue-100" : "bg-gray-100"
                          }`}
                        >
                          <Icon
                            className={`h-5 w-5 ${
                              service.enabled
                                ? "text-blue-600"
                                : "text-gray-400"
                            }`}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <h3 className="text-base font-semibold text-gray-900 truncate">
                                {service.name}
                              </h3>
                              <div className="flex items-center gap-1.5 flex-wrap mt-1">
                                {isPredefined && (
                                  <Badge variant="outline" className="text-xs">
                                    {serviceTypeLabels[service.serviceType]}
                                  </Badge>
                                )}
                                {service.duration && (
                                  <Badge variant="outline" className="text-xs flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {service.duration} min
                                  </Badge>
                                )}
                                {service.hasFreeDemo && (
                                  <Badge className="bg-green-100 text-green-700 text-xs">
                                    Free Demo
                                  </Badge>
                                )}
                                {service.enabled ? (
                                  <Badge className="bg-green-100 text-green-700 text-xs">
                                    Active
                                  </Badge>
                                ) : (
                                  <Badge
                                    variant="secondary"
                                    className="text-xs"
                                  >
                                    Disabled
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <Switch
                              checked={service.enabled}
                              onCheckedChange={() =>
                                handleToggleService(service.id)
                              }
                            />
                          </div>
                          <p className="text-gray-600 mt-2 text-sm line-clamp-2">
                            {service.description}
                          </p>
                          <div className="flex items-center justify-between mt-2">
                            {service.discount_price ? (
                              <div className="flex items-center gap-2">
                                <span className="text-lg font-bold text-green-600">
                                  ₹{service.discount_price}
                                </span>
                                <span className="text-sm font-medium text-gray-500 line-through">
                                  ₹{service.price}
                                </span>
                              </div>
                            ) : (
                              <span className="text-lg font-bold text-gray-900">
                                ₹{service.price}
                              </span>
                            )}
                            {/* Analytics Badges */}
                            <div className="flex items-center gap-2">
                              {service.bookingsCount !== undefined &&
                                service.bookingsCount > 0 && (
                                  <Badge
                                    variant="outline"
                                    className="text-xs gap-1"
                                  >
                                    <BarChart3 className="h-3 w-3" />
                                    {service.bookingsCount}
                                  </Badge>
                                )}
                              {service.revenue !== undefined &&
                                service.revenue > 0 && (
                                  <Badge
                                    variant="outline"
                                    className="text-xs gap-1 text-green-700 border-green-300"
                                  >
                                    <TrendingUp className="h-3 w-3" />₹
                                    {service.revenue.toLocaleString()}
                                  </Badge>
                                )}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 pt-2 border-t">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => startEdit(service)}
                        >
                          <Edit2 className="h-3.5 w-3.5 mr-1.5" />
                          Edit
                        </Button>

                        {/* Quick Actions Dropdown */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm">
                              <MoreVertical className="h-3.5 w-3.5 mr-1.5" />
                              More
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => handleDuplicateService(service.id)}
                            >
                              <Copy className="h-4 w-4 mr-2" />
                              Duplicate
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleToggleService(service.id)}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              {service.enabled ? "Disable" : "Enable"}
                            </DropdownMenuItem>
                            {index > 0 && (
                              <DropdownMenuItem
                                onClick={() =>
                                  handleMoveService(service.id, "up")
                                }
                              >
                                <ArrowUp className="h-4 w-4 mr-2" />
                                Move Up
                              </DropdownMenuItem>
                            )}
                            {index < filteredServices.length - 1 && (
                              <DropdownMenuItem
                                onClick={() =>
                                  handleMoveService(service.id, "down")
                                }
                              >
                                <ArrowDown className="h-4 w-4 mr-2" />
                                Move Down
                              </DropdownMenuItem>
                            )}
                            {service.bookingsCount !== undefined && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem disabled>
                                  <TrendingUp className="h-4 w-4 mr-2" />
                                  {service.bookingsCount} bookings
                                </DropdownMenuItem>
                              </>
                            )}
                            {!isPredefined && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => setDeletingService(service.id)}
                                  className="text-red-600 focus:text-red-600"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Edit Service Modal */}
      <Dialog
        open={!!editingService}
        onOpenChange={(open) => { if (!open) cancelEdit(); }}
      >
        <DialogContent className="flex w-[calc(100vw-2rem)] max-w-4xl max-h-[92vh] flex-col overflow-hidden p-0 rounded-2xl gap-0">
          {/* Header */}
          <div className="px-6 pt-5 pb-4 border-b border-gray-100 flex-shrink-0">
            <DialogTitle className="text-lg font-semibold text-gray-900 tracking-tight">Edit Service</DialogTitle>
            {editingServiceData && (
              <span className="text-sm text-gray-400">
                {serviceTypeLabels[editingServiceData.serviceType] ?? editingServiceData.serviceType}
              </span>
            )}
          </div>

          {editingServiceData && (
            <div className="flex flex-1 overflow-hidden min-h-0">

              {/* Left: Scrollable form + footer */}
              <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

                {/* — Basics — */}
                <div className="space-y-4">
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400">Basics</p>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium text-gray-700">Service Name</Label>
                    {!editCustomName ? (
                      <Select
                        value={editForm.name || ""}
                        onValueChange={(val) => {
                          if (val === "__custom__") {
                            setEditCustomName(true);
                            setEditForm({ ...editForm, name: "" });
                          } else {
                            const detectedType = SERVICE_TYPE_MAP[val];
                            if (detectedType) {
                              const is1on1 = detectedType === "oneOnOneSession";
                              setEditForm({
                                ...editForm,
                                name: val,
                                duration: is1on1 ? (editForm.duration ?? 60) : undefined,
                              });
                            } else {
                              setEditForm({ ...editForm, name: val });
                            }
                          }
                        }}
                      >
                        <SelectTrigger className="h-10 rounded-xl border-gray-200 bg-gray-50 focus:border-gray-400 focus:ring-1 focus:ring-gray-300">
                          <SelectValue placeholder="Choose a service name…" />
                        </SelectTrigger>
                        <SelectContent className="max-h-72">
                          {SERVICE_NAME_OPTIONS.map((group) => (
                            <>
                              <div key={group.group} className="px-2 pt-2 pb-1">
                                <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">{group.group}</p>
                              </div>
                              {group.names.map((name) => (
                                <SelectItem key={name} value={name}>{name}</SelectItem>
                              ))}
                            </>
                          ))}
                          <div className="border-t border-gray-100 mt-1 pt-1">
                            <SelectItem value="__custom__" className="font-medium text-blue-600">✏️  Custom name…</SelectItem>
                          </div>
                        </SelectContent>
                      </Select>
                    ) : (
                      <div className="flex gap-2">
                        <Input
                          autoFocus
                          value={editForm.name ?? ""}
                          onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                          placeholder="Enter your service name"
                          maxLength={100}
                          className="h-10 rounded-xl border-gray-200 focus:border-gray-400 focus:ring-1 focus:ring-gray-300 bg-gray-50 flex-1"
                        />
                        <button
                          type="button"
                          onClick={() => { setEditCustomName(false); setEditForm({ ...editForm, name: "" }); }}
                          className="text-xs text-gray-400 hover:text-gray-700 px-2 whitespace-nowrap"
                        >
                          Use list
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="modal-edit-description" className="text-sm font-medium text-gray-700">Description</Label>
                    <Textarea
                      id="modal-edit-description"
                      value={editForm.description ?? ""}
                      onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                      className="resize-none rounded-xl border-gray-200 focus:border-gray-400 focus:ring-1 focus:ring-gray-300 bg-gray-50 text-sm leading-relaxed min-h-[88px]"
                      maxLength={500}
                    />
                    <p className="text-xs text-gray-400 text-right">{(editForm.description ?? "").length} / 500</p>
                  </div>

                  {/* — Session Duration (1-on-1 only) — */}
                  {editingServiceData.serviceType === "oneOnOneSession" && (
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-700">Session Duration</Label>
                      <div className="grid grid-cols-4 gap-1.5 p-1 bg-gray-100 rounded-xl">
                        {[15, 30, 60].map((mins) => (
                          <button
                            key={mins}
                            type="button"
                            onClick={() => { setEditForm({ ...editForm, duration: mins }); setEditCustomDuration(false); }}
                            className={`py-2 rounded-lg text-sm font-medium transition-all ${
                              !editCustomDuration && (editForm.duration ?? 60) === mins
                                ? "bg-white text-gray-900 shadow-sm"
                                : "text-gray-500 hover:text-gray-700"
                            }`}
                          >
                            {mins} min
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={() => setEditCustomDuration(true)}
                          className={`py-2 rounded-lg text-sm font-medium transition-all ${
                            editCustomDuration ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                          }`}
                        >
                          Custom
                        </button>
                      </div>
                      {editCustomDuration && (
                        <div className="flex items-center gap-2">
                          <Input
                            type="number" min={5} max={480} step={5} placeholder="45"
                            value={editForm.duration && ![15, 30, 60].includes(editForm.duration) ? editForm.duration : ""}
                            onChange={(e) => { const v = e.target.valueAsNumber; if (!isNaN(v) && v > 0) setEditForm({ ...editForm, duration: v }); }}
                            className="w-24 h-9 rounded-xl border-gray-200 focus:border-gray-400 bg-gray-50"
                          />
                          <span className="text-sm text-gray-500">minutes</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* — Pricing — */}
                <div className="space-y-4 border-t border-gray-100 pt-5">
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400">Pricing</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="modal-edit-price" className="text-sm font-medium text-gray-700">Price <span className="text-gray-400 font-normal">(₹)</span></Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₹</span>
                        <Input
                          id="modal-edit-price"
                          type="text"
                          inputMode="decimal"
                          value={editForm.price ?? ""}
                          onChange={(e) => setEditForm({ ...editForm, price: e.target.value.trim() === "" ? undefined : Math.max(0, parseFloat(e.target.value) || 0) })}
                          className="pl-7 h-10 rounded-xl border-gray-200 focus:border-gray-400 focus:ring-1 focus:ring-gray-300 bg-gray-50"
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="modal-edit-discount-price" className="text-sm font-medium text-gray-700">Sale Price <span className="text-gray-400 font-normal">(optional)</span></Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₹</span>
                        <Input
                          id="modal-edit-discount-price"
                          type="text"
                          inputMode="decimal"
                          value={editForm.discount_price ?? ""}
                          onChange={(e) => setEditForm({ ...editForm, discount_price: e.target.value ? Math.max(0, parseFloat(e.target.value) || 0) : undefined })}
                          placeholder="—"
                          className="pl-7 h-10 rounded-xl border-gray-200 focus:border-gray-400 focus:ring-1 focus:ring-gray-300 bg-gray-50"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* — Product Link (digital only) — */}
                {editingServiceData.serviceType === "digitalProducts" && (
                  <div className="space-y-3 border-t border-gray-100 pt-5">
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400">Product Access</p>
                    <div className="space-y-1.5">
                      <Label htmlFor="modal-edit-product-link" className="text-sm font-medium text-gray-700">Digital Product Link</Label>
                      <Input
                        id="modal-edit-product-link"
                        type="url"
                        value={editForm.productLink || ""}
                        onChange={(e) => setEditForm({ ...editForm, productLink: e.target.value })}
                        placeholder="https://example.com/your-product"
                        className="h-10 rounded-xl border-gray-200 focus:border-gray-400 bg-gray-50"
                      />
                      <p className="text-xs text-gray-400">Sent to students after a successful purchase.</p>
                    </div>
                  </div>
                )}

                {/* — Options — */}
                {editingServiceData.serviceType !== "digitalProducts" && (
                  <div className="space-y-0 border-t border-gray-100 pt-5">
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 mb-3">Options</p>
                    <div className="divide-y divide-gray-100 rounded-xl border border-gray-200 overflow-hidden">
                      <div className="flex items-center justify-between px-4 py-3.5 bg-white">
                        <div>
                          <p className="text-sm font-medium text-gray-900">Free Demo</p>
                          <p className="text-xs text-gray-500">Offer a free introductory session</p>
                        </div>
                        <Switch
                          checked={!!editForm.hasFreeDemo}
                          onCheckedChange={(hasFreeDemo) => setEditForm({ ...editForm, hasFreeDemo })}
                        />
                      </div>
                    </div>
                  </div>
                )}

              </div>

              {/* Footer */}
              <div className="border-t border-gray-100 px-6 py-4 flex items-center justify-between gap-3 bg-white flex-shrink-0">
                <button
                  type="button"
                  onClick={cancelEdit}
                  disabled={saving}
                  className="text-sm font-medium text-gray-500 hover:text-gray-800 transition-colors disabled:opacity-40"
                >
                  Cancel
                </button>
                <Button
                  onClick={() => handleSaveService(editingServiceData.id)}
                  disabled={saving}
                  className="h-9 px-5 rounded-xl bg-gray-900 hover:bg-gray-700 text-white text-sm font-semibold"
                >
                  {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving…</> : "Save Changes"}
                </Button>
              </div>
              </div>{/* end left column */}

              {/* Right: Live Preview panel */}
              {(() => {
                const previewType = editingServiceData.serviceType ?? "oneOnOneSession";
                const PreviewIcon = serviceTypeIcons[previewType] || Briefcase;
                const previewTypeLabel = SERVICE_CONFIG[previewType]?.typeLabel
                  ?? serviceTypeLabels[previewType]
                  ?? "Mentoring Service";
                return (
                  <div className="hidden md:flex w-80 flex-col border-l border-gray-100 bg-gray-50/60 flex-shrink-0">
                    <div className="px-5 py-3 border-b border-gray-100 flex-shrink-0 flex items-center gap-2">
                      <Eye className="h-3.5 w-3.5 text-gray-400" />
                      <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400">Student View</p>
                    </div>
                    <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-3">
                      <Card className="shadow-none border border-gray-200 rounded-2xl">
                        <CardContent className="p-5 flex flex-col gap-4">
                          {/* Icon + Name + Badges */}
                          <div className="flex items-start gap-3">
                            <div className="h-10 w-10 rounded-xl bg-gray-100 border border-gray-200 flex items-center justify-center flex-shrink-0">
                              <PreviewIcon className="h-5 w-5 text-blue-600" />
                            </div>
                            <div className="min-w-0">
                              <h3 className="font-semibold text-gray-900 leading-snug line-clamp-2 min-h-[44px]">
                                {editForm.name || <span className="text-gray-300 italic font-normal">Service name…</span>}
                              </h3>
                              <div className="flex items-center gap-1.5 flex-wrap mt-1">
                                <Badge variant="outline" className="text-xs">{previewTypeLabel}</Badge>
                                {editForm.duration && previewType === "oneOnOneSession" && (
                                  <Badge variant="outline" className="text-xs flex items-center gap-1">
                                    <Clock className="h-3 w-3" />{editForm.duration} min
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                          {/* Description */}
                          <p className="text-sm text-gray-600 line-clamp-3 min-h-[40px]">
                            {editForm.description || <span className="text-gray-300 italic">Description will appear here…</span>}
                          </p>
                          {/* Free Demo Badge */}
                          {editForm.hasFreeDemo && previewType !== "digitalProducts" && (
                            <div className="flex items-center gap-1.5 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                              <Sparkles className="h-3.5 w-3.5 text-green-600 flex-shrink-0" />
                              <span className="text-xs font-medium text-green-700">Free Demo Available</span>
                            </div>
                          )}
                          {/* Price + CTA */}
                          <div className="pt-2 border-t border-gray-100 flex items-center justify-between gap-2">
                            {editForm.discount_price ? (
                              <div className="flex items-end gap-2">
                                <div className="flex items-center text-green-600 font-semibold text-xl">
                                  <IndianRupee className="h-4 w-4" />{editForm.discount_price}
                                </div>
                                <span className="text-sm text-gray-400 line-through">₹{editForm.price ?? 0}</span>
                              </div>
                            ) : (
                              <div className="flex items-center text-gray-900 font-semibold text-xl">
                                <IndianRupee className="h-4 w-4" />{editForm.price ?? <span className="text-gray-300 text-base font-normal">0</span>}
                              </div>
                            )}
                            <Button variant="outline" size="sm" disabled className="pointer-events-none text-xs gap-1 opacity-70">
                              View Details <ArrowRight className="h-3 w-3" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                      <p className="text-[11px] text-gray-400 text-center leading-relaxed px-2">
                        Live preview — updates as you type
                      </p>
                    </div>
                  </div>
                );
              })()}

            </div>
          )}{/* end two-column wrapper */}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!deletingService}
        onOpenChange={() => setDeletingService(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Service?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This service will be permanently
              removed from your profile. Students will no longer be able to book
              this service.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                deletingService && handleDeleteService(deletingService)
              }
              className="bg-red-600 hover:bg-red-700"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete Service"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
