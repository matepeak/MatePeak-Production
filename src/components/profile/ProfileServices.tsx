import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SERVICE_CONFIG } from "@/config/serviceConfig";
import { ArrowRight, Clock, IndianRupee, Star } from "lucide-react";

interface ProfileServicesProps {
  mentorUsername: string;
  servicePricing: Record<string, any> | null | undefined;
}

export default function ProfileServices({
  mentorUsername,
  servicePricing,
}: ProfileServicesProps) {
  const isServiceEnabled = (enabled: unknown) =>
    enabled === true || enabled === "true" || enabled === 1;

  const entries = Object.entries(servicePricing || {}).filter(([, value]) =>
    isServiceEnabled(value?.enabled)
  );

  if (entries.length === 0) {
    return (
      <Card className="shadow-sm border-0 bg-gray-50 rounded-2xl">
        <CardContent className="p-8 text-center">
          <p className="text-sm text-gray-600">No active services available.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
      {entries.map(([key, value]) => {
        const normalizedKey = key === "chatAdvice" ? "priorityDm" : key;
        const config = SERVICE_CONFIG[normalizedKey];
        const Icon = config?.icon || Star;

        const serviceName =
          value?.name || config?.name || "Custom Service";
        const serviceDescription =
          value?.description || config?.description || "No description provided.";

        const price = value?.price ?? 0;
        const discountPrice = value?.discount_price;
        const duration = value?.duration as number | undefined;

        return (
          <Card key={key} className="shadow-none border border-gray-200 rounded-2xl h-full">
            <CardContent className="p-5 h-full flex flex-col gap-4">
              <div className="flex items-start justify-between gap-3 min-h-[68px]">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-10 w-10 rounded-xl bg-gray-100 border border-gray-200 flex items-center justify-center">
                    <Icon className="h-5 w-5 text-matepeak-primary" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-gray-900 line-clamp-2 leading-snug min-h-[44px]">{serviceName}</h3>
                    <div className="flex items-center gap-1.5 flex-wrap mt-1">
                      <Badge variant="outline" className="text-xs">
                        {config?.typeLabel || "Mentoring Service"}
                      </Badge>
                      {duration && (
                        <Badge variant="outline" className="text-xs flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {duration} min
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <p className="text-sm text-gray-600 line-clamp-2 min-h-[40px]">{serviceDescription}</p>

              <div className="mt-auto pt-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                {discountPrice ? (
                  <div className="flex items-end gap-2 min-h-[32px]">
                    <div className="flex items-center text-green-600 font-semibold text-xl">
                      <IndianRupee className="h-4 w-4" />
                      {discountPrice}
                    </div>
                    <div className="text-sm text-gray-500 line-through">₹{price}</div>
                  </div>
                ) : (
                  <div className="flex items-center text-gray-900 font-semibold text-xl min-h-[32px]">
                    <IndianRupee className="h-4 w-4" />
                    {price}
                  </div>
                )}

                <Link
                  className="w-full sm:w-auto"
                  to={`/mentor/${mentorUsername}/services/${encodeURIComponent(key)}`}
                >
                  <Button variant="outline" size="sm" className="w-full sm:w-auto">
                    View Details
                    <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
