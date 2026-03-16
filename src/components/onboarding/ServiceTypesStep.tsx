
import { UseFormReturn } from "react-hook-form";
import { Video, MessageSquare, ShoppingBag, FileText, CheckCircle2, Sparkles, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
} from "@/components/ui/form";

const services = [
  {
    name: "oneOnOneSession",
    icon: Video,
    label: "1-on-1 Session",
    description: "Offer personal one-on-one video or voice call sessions with mentees",
  },
  {
    name: "priorityDm",
    icon: MessageSquare,
    label: "Priority DM",
    description: "Provide advice and guidance through text-based chat messaging",
  },
  {
    name: "digitalProducts",
    icon: ShoppingBag,
    label: "Digital Products",
    description: "Sell courses, ebooks, templates, or other digital products",
  },
  {
    name: "notes",
    icon: FileText,
    label: "Notes / Bootcamp Materials",
    description: "Share study notes, bootcamp materials, and educational resources",
  },
];

export default function ServiceTypesStep({ form }: { form: UseFormReturn<any> }) {
  return (
    <div className="space-y-8 animate-fade-in">
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-matepeak-primary to-matepeak-secondary flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-gray-900">Service Types</h3>
          </div>
        </div>
        <p className="text-gray-600 text-sm">
          You can offer multiple service types. Select all that apply to maximize your opportunities to help students.
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {services.map((service, index) => {
          const Icon = service.icon;
          return (
            <FormField
              key={service.name}
              control={form.control}
              name={service.name}
              render={({ field }) => (
                <FormItem className="group">
                  <FormControl>
                    <input 
                      type="checkbox" 
                      checked={field.value || false}
                      onChange={() => {}}
                      className="sr-only"
                    />
                  </FormControl>
                  <div 
                    className={cn(
                      "relative flex flex-col items-center text-center gap-4 rounded-xl border-2 p-6 transition-all duration-300 cursor-pointer h-full",
                      field.value 
                        ? "border-black bg-gray-50" 
                        : "border-gray-200 bg-white hover:border-gray-400"
                    )}
                    onClick={() => field.onChange(!field.value)}
                  >
                    {/* Checkbox - Top Right */}
                    <div className="absolute top-4 right-4">
                      <div className={cn(
                        "h-5 w-5 rounded-full border-2 flex items-center justify-center transition-all duration-300",
                        field.value 
                          ? "bg-black border-black" 
                          : "border-gray-300 bg-white"
                      )}>
                        {field.value && (
                          <Check className="h-3 w-3 text-white animate-scale-in" strokeWidth={3} />
                        )}
                      </div>
                    </div>

                    {/* Icon */}
                    <div className={cn(
                      "flex-shrink-0 w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-300",
                      field.value 
                        ? "bg-gray-900" 
                        : "bg-gray-100"
                    )}>
                      <Icon className={cn(
                        "w-8 h-8 transition-colors",
                        field.value ? "text-white" : "text-gray-600"
                      )} />
                    </div>
                    
                    {/* Content */}
                    <div className="flex-1 space-y-2">
                      <FormLabel className={cn(
                        "text-lg font-semibold cursor-pointer transition-colors block",
                        field.value ? "text-gray-900" : "text-gray-700"
                      )}>
                        {service.label}
                      </FormLabel>
                      <FormDescription className="text-sm text-gray-600 leading-relaxed">
                        {service.description}
                      </FormDescription>
                    </div>
                  </div>
                </FormItem>
              )}
            />
          );
        })}
      </div>
    </div>
  );
}
