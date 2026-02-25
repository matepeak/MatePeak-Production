import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
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
  Sparkles,
  CheckCircle,
  XCircle,
  Video,
  FileStack,
  Wrench,
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
}

interface ServicePricing {
  oneOnOneSession?: {
    enabled: boolean;
    price: number;
    discount_price?: number;
    hasFreeDemo?: boolean;
  };
  chatAdvice?: {
    enabled: boolean;
    price: number;
    discount_price?: number;
    hasFreeDemo?: boolean;
  };
  digitalProducts?: {
    enabled: boolean;
    price: number;
    discount_price?: number;
  };
  notes?: {
    enabled: boolean;
    price: number;
    discount_price?: number;
  };
}

const serviceTypeIcons: Record<string, any> = {
  oneOnOneSession: Briefcase,
  chatAdvice: MessageSquare,
  digitalProducts: Package,
  notes: FileText,
  custom: Plus,
};

const serviceTypeLabels: Record<string, string> = {
  oneOnOneSession: "1-on-1 Session",
  chatAdvice: "Chat Consultation",
  digitalProducts: "Digital Products",
  notes: "Notes & Resources",
  custom: "Custom Service",
};

// Service Templates
const serviceTemplates = [
  {
    name: "Resume Review & Feedback",
    description:
      "Comprehensive resume review with detailed feedback and suggestions for improvement",
    price: 999,
    serviceType: "custom",
    hasFreeDemo: false,
  },
  {
    name: "Mock Interview Session",
    description:
      "One hour mock interview with detailed feedback on your performance and areas to improve",
    price: 1499,
    serviceType: "custom",
    hasFreeDemo: true,
  },
  {
    name: "Career Roadmap Planning",
    description:
      "Personalized career roadmap with actionable steps and milestones for the next 6-12 months",
    price: 2499,
    serviceType: "custom",
    hasFreeDemo: false,
  },
  {
    name: "LinkedIn Profile Optimization",
    description:
      "Complete LinkedIn profile makeover to increase visibility and attract recruiters",
    price: 799,
    serviceType: "custom",
    hasFreeDemo: false,
  },
  {
    name: "Salary Negotiation Coaching",
    description:
      "Learn proven strategies to negotiate better offers and maximize your compensation",
    price: 1999,
    serviceType: "custom",
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
    serviceType: "custom",
    hasFreeDemo: false,
  });

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
          const isCustom = !["oneOnOneSession", "chatAdvice", "digitalProducts", "notes"].includes(key);
          
          allServices.push({
            id: key,
            name: value.name || (key === "oneOnOneSession" ? "1-on-1 Strategy Session" :
                                 key === "chatAdvice" ? "Chat Consultation" :
                                 key === "digitalProducts" ? "Digital Products" :
                                 key === "notes" ? "Notes & Resources" : "Custom Service"),
            description: value.description || "",
            price: value.price || 0,
            discount_price: value.discount_price,
            enabled: value.enabled || false,
            serviceType: isCustom ? "custom" : key,
            hasFreeDemo: value.hasFreeDemo || false,
            order: value.order ?? index,
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
          type: service.serviceType,
          order: updatedService.order,
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

      toast.success(`Service ${updatedEnabled ? "enabled" : "disabled"}`);
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
        ["oneOnOneSession", "chatAdvice", "digitalProducts", "notes"].includes(
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
        serviceType: "custom",
        hasFreeDemo: newService.hasFreeDemo ?? false,
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
          type: "custom",
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
      setNewService({
        name: "",
        description: "",
        price: 0,
        discount_price: undefined,
        enabled: true,
        serviceType: "custom",
        hasFreeDemo: false,
      });
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
      serviceType: "custom",
      hasFreeDemo: service.hasFreeDemo || false,
    });
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
    setEditForm({
      name: service.name,
      description: service.description,
      price: service.price,
      enabled: service.enabled,
      hasFreeDemo: service.hasFreeDemo,
    });
  };

  const cancelEdit = () => {
    setEditingService(null);
    setEditForm({});
  };

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
                  <SelectItem value="chatAdvice" className="rounded-lg">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4 text-blue-500" />
                      <span>Chat Consultation</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="digitalProducts" className="rounded-lg">
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-purple-500" />
                      <span>Digital Products</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="notes" className="rounded-lg">
                    <div className="flex items-center gap-2">
                      <FileStack className="h-4 w-4 text-amber-500" />
                      <span>Notes & Resources</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="custom" className="rounded-lg">
                    <div className="flex items-center gap-2">
                      <Wrench className="h-4 w-4 text-indigo-500" />
                      <span>Custom Services</span>
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
        {!addingNew && (
          <>
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
          </>
        )}
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
      {!addingNew && services.length === 0 && (
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
      {addingNew && (
        <Card className="border-2 border-blue-200 bg-blue-50/50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Add New Service</CardTitle>
                <CardDescription>
                  Create a custom service offering
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setAddingNew(false);
                  setNewService({
                    name: "",
                    description: "",
                    price: 0,
                    discount_price: undefined,
                    enabled: true,
                    serviceType: "custom",
                    hasFreeDemo: false,
                  });
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="new-name">Service Name *</Label>
                <Input
                  id="new-name"
                  value={newService.name}
                  onChange={(e) =>
                    setNewService({ ...newService, name: e.target.value })
                  }
                  placeholder="e.g., Resume Review Package"
                  maxLength={100}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-price">Price (₹) *</Label>
                <Input
                  id="new-price"
                  type="number"
                  min="0"
                  value={newService.price}
                  onChange={(e) =>
                    setNewService({
                      ...newService,
                      price: parseFloat(e.target.value) || 0,
                    })
                  }
                  placeholder="499"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-discount-price">
                Discounted Price (₹) - Optional
              </Label>
              <Input
                id="new-discount-price"
                type="number"
                min="0"
                value={newService.discount_price || ""}
                onChange={(e) =>
                  setNewService({
                    ...newService,
                    discount_price: e.target.value
                      ? parseFloat(e.target.value)
                      : undefined,
                  })
                }
                placeholder="399"
              />
              <p className="text-xs text-gray-500">
                Leave empty for no discount. If set, original price will show as
                strikethrough.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-description">Description *</Label>
              <Textarea
                id="new-description"
                value={newService.description}
                onChange={(e) =>
                  setNewService({ ...newService, description: e.target.value })
                }
                placeholder="Describe what's included in this service..."
                rows={3}
                maxLength={500}
              />
              <p className="text-xs text-gray-500">
                {newService.description?.length || 0}/500 characters
              </p>
            </div>

            <div className="flex items-center justify-between p-3 bg-white rounded-lg border">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="font-medium text-sm">Enable Service</p>
                  <p className="text-xs text-gray-500">
                    Make this service available to students
                  </p>
                </div>
              </div>
              <Switch
                checked={newService.enabled}
                onCheckedChange={(enabled) =>
                  setNewService({ ...newService, enabled })
                }
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-white rounded-lg border">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <AlertCircle className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium text-sm">Free Demo Available</p>
                  <p className="text-xs text-gray-500">
                    Offer a free trial or demo session
                  </p>
                </div>
              </div>
              <Switch
                checked={newService.hasFreeDemo}
                onCheckedChange={(hasFreeDemo) =>
                  setNewService({ ...newService, hasFreeDemo })
                }
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                onClick={handleAddService}
                disabled={saving || !newService.name || !newService.description}
                size="sm"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                    Adding...
                  </>
                ) : (
                  <>
                    <Save className="h-3.5 w-3.5 mr-1.5" />
                    Add Service
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setAddingNew(false);
                  setNewService({
                    name: "",
                    description: "",
                    price: 0,
                    discount_price: undefined,
                    enabled: true,
                    serviceType: "custom",
                    hasFreeDemo: false,
                  });
                }}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Services List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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
            const isEditing = editingService === service.id;
            const isPredefined = [
              "oneOnOneSession",
              "chatAdvice",
              "digitalProducts",
              "notes",
            ].includes(service.serviceType);

            return (
              <Card
                key={service.id}
                className={`${service.enabled ? "" : "opacity-60"} ${
                  draggedService === service.id ? "opacity-50" : ""
                }`}
                draggable={!isEditing}
                onDragStart={() => handleDragStart(service.id)}
                onDragOver={handleDragOver}
                onDrop={() => handleDrop(service.id)}
              >
                <CardContent className="p-4">
                  {isEditing ? (
                    // Edit Mode
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label htmlFor={`edit-name-${service.id}`}>
                            Service Name *
                          </Label>
                          <Input
                            id={`edit-name-${service.id}`}
                            value={editForm.name}
                            onChange={(e) =>
                              setEditForm({ ...editForm, name: e.target.value })
                            }
                            maxLength={100}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`edit-price-${service.id}`}>
                            Price (₹) *
                          </Label>
                          <Input
                            id={`edit-price-${service.id}`}
                            type="number"
                            min="0"
                            value={editForm.price}
                            onChange={(e) =>
                              setEditForm({
                                ...editForm,
                                price: parseFloat(e.target.value) || 0,
                              })
                            }
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`edit-discount-price-${service.id}`}>
                          Discounted Price (₹) - Optional
                        </Label>
                        <Input
                          id={`edit-discount-price-${service.id}`}
                          type="number"
                          min="0"
                          value={editForm.discount_price || ""}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              discount_price: e.target.value
                                ? parseFloat(e.target.value)
                                : undefined,
                            })
                          }
                        />
                        <p className="text-xs text-gray-500">
                          Leave empty to remove discount
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`edit-description-${service.id}`}>
                          Description *
                        </Label>
                        <Textarea
                          id={`edit-description-${service.id}`}
                          value={editForm.description}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              description: e.target.value,
                            })
                          }
                          rows={2}
                          maxLength={500}
                        />
                      </div>

                      {service.serviceType !== "digitalProducts" &&
                        service.serviceType !== "notes" && (
                          <div className="flex items-center justify-between p-2.5 bg-gray-50 rounded-lg">
                            <div>
                              <p className="font-medium text-xs">
                                Free Demo Available
                              </p>
                              <p className="text-xs text-gray-500">
                                Offer a free trial session
                              </p>
                            </div>
                            <Switch
                              checked={editForm.hasFreeDemo}
                              onCheckedChange={(hasFreeDemo) =>
                                setEditForm({ ...editForm, hasFreeDemo })
                              }
                            />
                          </div>
                        )}

                      <div className="flex gap-2 pt-2">
                        <Button
                          onClick={() => handleSaveService(service.id)}
                          disabled={saving}
                          size="sm"
                        >
                          {saving ? (
                            <>
                              <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                              Saving...
                            </>
                          ) : (
                            <>
                              <Save className="h-3.5 w-3.5 mr-1.5" />
                              Save
                            </>
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={cancelEdit}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    // View Mode
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
                                {service.hasFreeDemo && (
                                  <Badge className="bg-green-100 text-green-700 hover:bg-green-100 text-xs">
                                    Free Demo
                                  </Badge>
                                )}
                                {service.enabled ? (
                                  <Badge className="bg-green-100 text-green-700 hover:bg-green-100 text-xs">
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
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

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
