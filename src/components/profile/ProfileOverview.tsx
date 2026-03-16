import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Heart,
  Sparkles,
  Handshake,
  Video,
  MessageSquare,
  FileText,
  Star,
  Quote,
  IndianRupee,
  Calendar,
  Clock3,
  Trophy,
} from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SERVICE_CONFIG } from "@/config/serviceConfig";

interface ServiceListItem {
  key: string;
  name: string;
  description: string;
  price: number;
  discount_price: number | null;
  hasFreeDemo: boolean;
  icon: any;
}

interface ServiceStats {
  averageRating: number;
  reviewCount: number;
  completedSessions: number;
  latestSessionDate: string | null;
}

interface ProfileOverviewProps {
  mentor: any;
  stats: {
    averageRating: number;
    reviewCount: number;
  };
}

export default function ProfileOverview({
  mentor,
  stats,
}: ProfileOverviewProps) {
  const [featuredReviews, setFeaturedReviews] = useState<any[]>([]);
  const [selectedService, setSelectedService] = useState<ServiceListItem | null>(
    null
  );
  const [serviceStatsByType, setServiceStatsByType] = useState<
    Record<string, ServiceStats>
  >({});
  const [showMore, setShowMore] = useState({
    introduction: false,
    motivation: false,
    teaching_experience: false,
  });

  useEffect(() => {
    fetchFeaturedReviews();
  }, [mentor.id]);

  useEffect(() => {
    fetchServiceStats();
  }, [mentor.id]);

  const fetchFeaturedReviews = async () => {
    try {
      const { data, error } = await supabase
        .from("reviews")
        .select("rating, comment, created_at, user_id")
        .eq("expert_id", mentor.id)
        .order("rating", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(3);

      if (!error && data) {
        // Fetch user details for each review
        const reviewsWithProfiles = await Promise.all(
          data.map(async (review) => {
            const { data: profile } = await supabase
              .from("profiles")
              .select("full_name, avatar_url")
              .eq("id", review.user_id)
              .single();

            return {
              ...review,
              profiles: profile || { full_name: "Anonymous", avatar_url: null },
            };
          })
        );
        setFeaturedReviews(reviewsWithProfiles);
      }
    } catch (error) {
      console.error("Error fetching reviews:", error);
    }
  };

  const getPriceUnit = (serviceKey: string) => {
    if (serviceKey === "oneOnOneSession") return "/ session";
    if (serviceKey === "chatAdvice") return "/ consultation";
    if (serviceKey === "notes") return "/ resource";
    if (serviceKey === "digitalProducts") return "/ product";
    return "";
  };

  const fetchServiceStats = async () => {
    try {
      const { data: bookings, error: bookingsError } = await supabase
        .from("bookings")
        .select("id, session_type, status, scheduled_date")
        .eq("expert_id", mentor.id)
        .neq("status", "cancelled");

      if (bookingsError) {
        console.error("Error fetching service bookings:", bookingsError);
        setServiceStatsByType({});
        return;
      }

      const bookingMap = new Map<string, any>();
      const aggregated: Record<
        string,
        {
          totalRating: number;
          reviewCount: number;
          completedSessions: number;
          latestSessionDate: string | null;
        }
      > = {};

      (bookings || []).forEach((booking: any) => {
        if (!booking?.id || !booking?.session_type) return;

        bookingMap.set(booking.id, booking);

        if (!aggregated[booking.session_type]) {
          aggregated[booking.session_type] = {
            totalRating: 0,
            reviewCount: 0,
            completedSessions: 0,
            latestSessionDate: null,
          };
        }

        if (booking.status === "completed") {
          aggregated[booking.session_type].completedSessions += 1;
        }

        if (
          booking.scheduled_date &&
          (!aggregated[booking.session_type].latestSessionDate ||
            new Date(booking.scheduled_date) >
              new Date(aggregated[booking.session_type].latestSessionDate!))
        ) {
          aggregated[booking.session_type].latestSessionDate =
            booking.scheduled_date;
        }
      });

      const { data: reviews, error: reviewsError } = await supabase
        .from("reviews")
        .select("rating, booking_id")
        .eq("expert_id", mentor.id);

      if (reviewsError) {
        console.error("Error fetching service reviews:", reviewsError);
      } else {
        (reviews || []).forEach((review: any) => {
          const booking = bookingMap.get(review.booking_id);
          if (!booking?.session_type) return;

          if (!aggregated[booking.session_type]) {
            aggregated[booking.session_type] = {
              totalRating: 0,
              reviewCount: 0,
              completedSessions: 0,
              latestSessionDate: null,
            };
          }

          aggregated[booking.session_type].totalRating += Number(review.rating) || 0;
          aggregated[booking.session_type].reviewCount += 1;
        });
      }

      const finalStats: Record<string, ServiceStats> = {};
      Object.entries(aggregated).forEach(([serviceType, values]) => {
        finalStats[serviceType] = {
          averageRating:
            values.reviewCount > 0
              ? values.totalRating / values.reviewCount
              : 0,
          reviewCount: values.reviewCount,
          completedSessions: values.completedSessions,
          latestSessionDate: values.latestSessionDate,
        };
      });

      setServiceStatsByType(finalStats);
    } catch (error) {
      console.error("Error calculating service stats:", error);
      setServiceStatsByType({});
    }
  };

  const getServicesList = (): ServiceListItem[] => {
    console.log("🎯 Building services list from unified service_pricing:");
    console.log("   service_pricing:", mentor.service_pricing);
    console.log("   legacy pricing:", mentor.pricing);

    const services = [];

    // Handle legacy pricing (old system)
    if (!mentor.service_pricing && mentor.pricing !== undefined && mentor.pricing !== null) {
      console.log("   📦 Using legacy pricing system");
      services.push({
        key: "oneOnOneSession",
        name: SERVICE_CONFIG.oneOnOneSession.name,
        description: SERVICE_CONFIG.oneOnOneSession.description,
        price: mentor.pricing,
        discount_price: null,
        hasFreeDemo: false,
        icon: Video,
      });
      return services;
    }

    if (!mentor.service_pricing || typeof mentor.service_pricing !== 'object') {
      console.log("   ⚠️ No service_pricing data");
      return services;
    }

    // Iterate through all services in service_pricing
    Object.entries(mentor.service_pricing).forEach(([key, value]: [string, any]) => {
      // Only skip if service is explicitly disabled
      if (!value?.enabled) {
        console.log(`   ⏭️ Skipping ${key} (not enabled)`);
        return;
      }

      // Use the exact price set by the mentor (even if it's 0)
      const actualPrice = value.price !== undefined && value.price !== null ? value.price : 0;

      // Build service object
      const service: ServiceListItem = {
        key,
        name: value.name,
        description: value.description,
        price: actualPrice,
        discount_price: value.discount_price,
        hasFreeDemo: value.hasFreeDemo || false,
      };

      // Use shared SERVICE_CONFIG for consistent naming across the app
      const config = SERVICE_CONFIG[key];
      if (config) {
        service.name = value.name || config.name;
        service.description = value.description || config.description;
        service.icon = config.icon;
        console.log(`   ✅ Added ${config.name} (price:`, actualPrice, ")");
      } else {
        // Custom services not in SERVICE_CONFIG
        service.icon = Star;
        console.log("   ✅ Added custom service:", value.name, "(price:", actualPrice, ")");
      }

      services.push(service);
    });

    console.log("🎯 Final services list:", services);
    return services;
  };

  const services = getServicesList();

  return (
    <div className="space-y-6">
      {/* How I'd Describe Myself */}
      <Card className="shadow-none border-0 bg-gray-50 rounded-2xl">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Quote className="h-5 w-5 text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-900">
              How I'd Describe Myself
            </h2>
          </div>
          <p
            className={`leading-relaxed text-sm whitespace-pre-line ${
              (mentor.introduction || mentor.bio) ? "text-gray-700" : "text-gray-400 italic"
            } ${
              !showMore.introduction ? "line-clamp-3" : ""
            }`}
          >
            {mentor.introduction ||
              mentor.bio ||
              "-"}
          </p>
          {((mentor.introduction || mentor.bio || "").split("\n").length > 3 ||
            (mentor.introduction || mentor.bio || "").length > 250) && (
            <button
              className="text-xs text-matepeak-primary font-medium focus:outline-none border-b border-gray-200"
              style={{ paddingBottom: "1px", marginTop: "0" }}
              onClick={() =>
                setShowMore((prev) => ({
                  ...prev,
                  introduction: !prev.introduction,
                }))
              }
            >
              {showMore.introduction ? "Show less" : "Show more"}
            </button>
          )}
        </CardContent>
      </Card>

      {/* Why I Became a Mentor */}
      <Card className="shadow-none border-0 bg-gray-50 rounded-2xl">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Heart className="h-5 w-5 text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-900">
              Why I Became a Mentor
            </h2>
          </div>
          <p
            className={`leading-relaxed text-sm whitespace-pre-line ${
              mentor.motivation ? "text-gray-700" : "text-gray-400 italic"
            } ${
              !showMore.motivation ? "line-clamp-3" : ""
            }`}
          >
            {mentor.motivation || "-"}
          </p>
          {mentor.motivation && (mentor.motivation.split("\n").length > 3 ||
            mentor.motivation.length > 250) && (
            <button
              className="text-xs text-matepeak-primary font-medium focus:outline-none border-b border-gray-200"
              style={{ paddingBottom: "1px", marginTop: "0" }}
              onClick={() =>
                setShowMore((prev) => ({
                  ...prev,
                  motivation: !prev.motivation,
                }))
              }
            >
              {showMore.motivation ? "Show less" : "Show more"}
            </button>
          )}
        </CardContent>
      </Card>

      {/* Teaching Experience */}
      <Card className="shadow-none border-0 bg-gray-50 rounded-2xl">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="h-5 w-5 text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-900">
              AI Based Summary
            </h2>
          </div>
          <p
            className={`leading-relaxed text-sm whitespace-pre-line ${
              mentor.teaching_experience ? "text-gray-700" : "text-gray-400 italic"
            } ${
              !showMore.teaching_experience ? "line-clamp-3" : ""
            }`}
          >
            {mentor.teaching_experience || "-"}
          </p>
          {mentor.teaching_experience && (mentor.teaching_experience.split("\n").length > 3 ||
            mentor.teaching_experience.length > 250) && (
            <button
              className="text-xs text-matepeak-primary font-medium focus:outline-none border-b border-gray-200"
              style={{ paddingBottom: "1px", marginTop: "0" }}
              onClick={() =>
                setShowMore((prev) => ({
                  ...prev,
                  teaching_experience: !prev.teaching_experience,
                  }))
                }
              >
                {showMore.teaching_experience ? "Show less" : "Show more"}
              </button>
            )}
          </CardContent>
        </Card>

      {/* What I Offer */}
      {services.length > 0 && (
        <Card className="shadow-none border-0 bg-gray-50 rounded-2xl">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-6">
              <Handshake className="h-5 w-5 text-matepeak-primary" />
              <h2 className="text-lg font-semibold text-gray-900">
                Services & Pricing
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {services.map((service, index) => {
                const ServiceIcon = service.icon;
                return (
                    <button
                      type="button"
                      onClick={() => setSelectedService(service)}
                    key={index}
                      className="group relative w-full text-left bg-white rounded-2xl border border-gray-200 hover:border-gray-300 p-5 transition-all duration-200 hover:shadow-sm"
                    >
                    {/* Service Icon */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-shrink-0 w-11 h-11 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center transition-colors">
                        <ServiceIcon className="h-6 w-6 text-matepeak-primary" />
                      </div>
                      <div className="flex items-center gap-2">
                        {serviceStatsByType[service.key]?.reviewCount > 0 ? (
                          <div className="inline-flex items-center gap-1 rounded-full bg-gray-50 border border-gray-200 px-2 py-0.5 text-xs text-gray-700 font-medium">
                            <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                            {serviceStatsByType[service.key].averageRating.toFixed(1)}
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1 rounded-full bg-gray-50 border border-gray-200 px-2 py-0.5 text-xs text-gray-500 font-medium">
                            <Star className="h-3 w-3" />
                            No rating yet
                          </div>
                        )}
                      {service.hasFreeDemo && (
                        <Badge className="bg-green-50 text-green-700 border-green-200 hover:bg-green-50 hover:text-green-700 text-xs font-medium px-2 py-0.5 focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0 pointer-events-none">
                          Free Demo
                        </Badge>
                      )}
                      </div>
                    </div>

                    {/* Service Info */}
                    <div className="space-y-2">
                      <h3 className="font-bold text-gray-900 text-base leading-tight">
                        {service.name}
                      </h3>
                      <p className="text-sm text-gray-600 leading-relaxed line-clamp-2">
                        {service.description ||
                          (service.name === SERVICE_CONFIG.oneOnOneSession.name &&
                            SERVICE_CONFIG.oneOnOneSession.description) ||
                          (service.name === SERVICE_CONFIG.priorityDm.name &&
                            SERVICE_CONFIG.priorityDm.description) ||
                          (service.name === SERVICE_CONFIG.digitalProducts.name &&
                            SERVICE_CONFIG.digitalProducts.description) ||
                          (service.name === SERVICE_CONFIG.notes.name &&
                            "Download study materials and practice exercises")}
                      </p>
                    </div>

                    {/* Pricing */}
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      {service.discount_price ? (
                        <div className="space-y-1">
                          <div className="flex items-baseline gap-2">
                            <div className="flex items-baseline gap-1">
                              <IndianRupee className="h-5 w-5 text-green-600 mt-0.5" />
                              <span className="text-2xl font-bold text-green-600">
                                {service.discount_price}
                              </span>
                            </div>
                            <div className="flex items-baseline gap-1 opacity-60">
                              <IndianRupee className="h-4 w-4 text-gray-500 mt-0.5" />
                              <span className="text-lg font-medium text-gray-500 line-through">
                                {service.price}
                              </span>
                            </div>
                          </div>
                          <span className="text-sm text-gray-500">
                            {service.name === SERVICE_CONFIG.oneOnOneSession.name
                              ? "/ session"
                              : service.name === SERVICE_CONFIG.priorityDm.name
                              ? "/ consultation"
                              : service.name === SERVICE_CONFIG.notes.name
                              ? "/ resource"
                              : service.name === SERVICE_CONFIG.digitalProducts.name
                              ? "/ product"
                              : ""}
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-baseline gap-1">
                          <IndianRupee className="h-5 w-5 text-gray-700 mt-0.5" />
                          <span className="text-2xl font-bold text-gray-900">
                            {service.price}
                          </span>
                          <span className="text-sm text-gray-500 ml-1">
                            {service.name === SERVICE_CONFIG.oneOnOneSession.name
                              ? "/ session"
                              : service.name === SERVICE_CONFIG.chatAdvice.name
                              ? "/ consultation"
                              : service.name === SERVICE_CONFIG.notes.name
                              ? "/ resource"
                              : service.name === SERVICE_CONFIG.digitalProducts.name
                              ? "/ product"
                              : ""}
                          </span>
                        </div>
                      )}
                    </div>

                    <p className="mt-3 text-xs text-gray-500">View details</p>
                    </button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Featured Reviews */}
      {featuredReviews.length > 0 && (
        <Card className="shadow-none border-0 bg-gray-50 rounded-2xl">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Star className="h-5 w-5 text-gray-600" />
                <h2 className="text-lg font-semibold text-gray-900">
                  Asif's Community
                </h2>
              </div>
              {stats.averageRating > 0 && (
                <div className="text-sm text-gray-600">
                  ({stats.reviewCount})
                </div>
              )}
            </div>

            <div className="space-y-4">
              {featuredReviews.map((review, index) => (
                <div key={index}>
                  <div className="flex items-start gap-3 p-4 bg-white rounded-xl border border-gray-200">
                    <div className="flex-shrink-0">
                      <div className="h-10 w-10 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center font-semibold text-sm">
                        {review.profiles?.full_name?.[0]?.toUpperCase() || "?"}
                      </div>
                    </div>
                    <div className="flex-grow">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-gray-900 text-sm">
                          {review.profiles?.full_name || "Anonymous"}
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(review.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-gray-700 text-sm leading-relaxed">
                        {review.comment}
                      </p>
                    </div>
                  </div>
                  {index < featuredReviews.length - 1 && (
                    <div className="my-2" />
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog
        open={Boolean(selectedService)}
        onOpenChange={(open) => {
          if (!open) setSelectedService(null);
        }}
      >
        <DialogContent className="sm:max-w-[560px] p-0 overflow-hidden rounded-3xl border border-gray-200 shadow-xl">
          {selectedService && (
            <>
              <DialogHeader className="px-7 pt-7 pb-4 bg-white border-b border-gray-100">
                <div className="flex items-start gap-4">
                  <div className="h-11 w-11 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center">
                    <selectedService.icon className="h-6 w-6 text-matepeak-primary" />
                  </div>
                  <div className="flex-1">
                    <DialogTitle className="text-[22px] font-semibold tracking-tight text-gray-900 leading-tight">
                      {selectedService.name}
                    </DialogTitle>
                    <DialogDescription className="mt-1.5 text-sm text-gray-500 leading-relaxed">
                      {selectedService.description || "Personalized mentoring service."}
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="px-7 py-6 space-y-6 bg-white">
                <div className="flex items-end gap-1">
                  <IndianRupee className="h-5 w-5 text-gray-700 mb-1" />
                  <span className="text-[32px] leading-none font-semibold tracking-tight text-gray-900">
                    {selectedService.discount_price || selectedService.price}
                  </span>
                  <span className="text-sm text-gray-500 ml-1 mb-1">
                    {getPriceUnit(selectedService.key)}
                  </span>
                  {selectedService.discount_price && (
                    <span className="text-sm text-gray-400 line-through ml-2 mb-1">
                      ₹{selectedService.price}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div className="rounded-2xl border border-gray-200 bg-gray-50/60 p-3.5">
                    <div className="flex items-center gap-1.5 text-gray-500 text-[11px] uppercase tracking-wide mb-1.5">
                      <Star className="h-3.5 w-3.5" />
                      Rating
                    </div>
                    <p className="text-lg font-semibold tracking-tight text-gray-900">
                      {serviceStatsByType[selectedService.key]?.reviewCount > 0
                        ? `${serviceStatsByType[selectedService.key].averageRating.toFixed(1)} / 5`
                        : "Not rated yet"}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-gray-200 bg-gray-50/60 p-3.5">
                    <div className="flex items-center gap-1.5 text-gray-500 text-[11px] uppercase tracking-wide mb-1.5">
                      <Trophy className="h-3.5 w-3.5" />
                      Sessions
                    </div>
                    <p className="text-lg font-semibold tracking-tight text-gray-900">
                      {serviceStatsByType[selectedService.key]?.completedSessions || 0}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-gray-200 bg-gray-50/60 p-3.5">
                    <div className="flex items-center gap-1.5 text-gray-500 text-[11px] uppercase tracking-wide mb-1.5">
                      <Clock3 className="h-3.5 w-3.5" />
                      Reviews
                    </div>
                    <p className="text-lg font-semibold tracking-tight text-gray-900">
                      {serviceStatsByType[selectedService.key]?.reviewCount || 0}
                    </p>
                  </div>
                </div>

                <Separator />

                <div className="space-y-3.5">
                  <h4 className="text-sm font-semibold tracking-tight text-gray-900">Service Details</h4>
                  <div className="space-y-2 text-sm text-gray-700">
                    <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-3.5 py-2.5">
                      <span>Delivery Type</span>
                      <span className="font-medium">
                        {SERVICE_CONFIG[selectedService.key]?.typeLabel || "Mentoring Service"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-3.5 py-2.5">
                      <span>Scheduling</span>
                      <span className="font-medium">
                        {SERVICE_CONFIG[selectedService.key]?.requiresScheduling
                          ? "Appointment based"
                          : "Instant / self-paced"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-3.5 py-2.5">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        Latest Booking
                      </span>
                      <span className="font-medium">
                        {serviceStatsByType[selectedService.key]?.latestSessionDate
                          ? new Date(
                              serviceStatsByType[selectedService.key].latestSessionDate as string
                            ).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })
                          : "No bookings yet"}
                      </span>
                    </div>

                    {selectedService.hasFreeDemo && (
                      <div className="rounded-xl bg-gray-50 border border-gray-200 px-3.5 py-2.5 text-gray-700 font-medium">
                        Includes a free demo option.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
