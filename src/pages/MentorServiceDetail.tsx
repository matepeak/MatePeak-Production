import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SERVICE_CONFIG } from "@/config/serviceConfig";
import {
  ArrowLeft,
  Clock,
  IndianRupee,
  Loader2,
  Star,
  MessageSquare,
  Calendar,
} from "lucide-react";

interface MentorData {
  id: string;
  username: string;
  full_name: string;
  headline: string | null;
  service_pricing: Record<string, any> | null;
}

interface ServiceReview {
  id: string;
  rating: number;
  comment: string | null;
  mentor_reply: string | null;
  created_at: string;
  user_id: string;
  profile_name: string;
}

export default function MentorServiceDetail() {
  const { username, serviceId } = useParams<{ username: string; serviceId: string }>();

  const [mentor, setMentor] = useState<MentorData | null>(null);
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState<ServiceReview[]>([]);
  const [resolvedServiceKey, setResolvedServiceKey] = useState<string | null>(null);
  const [isOwnProfile, setIsOwnProfile] = useState(false);

  const isServiceEnabled = (enabled: unknown) =>
    enabled === true || enabled === "true" || enabled === 1;

  const isTruthyFlag = (value: unknown) =>
    value === true || value === "true" || value === 1;

  const decodedServiceId = decodeURIComponent(serviceId || "");

  useEffect(() => {
    if (username && decodedServiceId) {
      fetchServiceDetails();
    }
  }, [username, decodedServiceId]);

  const fetchServiceDetails = async () => {
    try {
      setLoading(true);

      const { data: profileData, error: profileError } = await supabase
        .from("expert_profiles")
        .select("id, username, full_name, headline, service_pricing")
        .eq("username", username)
        .single();

      if (profileError || !profileData) {
        setMentor(null);
        return;
      }

      setMentor(profileData as MentorData);

      // Check if the viewer is the mentor themselves
      const { data: { user } } = await supabase.auth.getUser();
      if (user && user.id === profileData.id) {
        setIsOwnProfile(true);
      }

      const pricing = (profileData.service_pricing || {}) as Record<string, any>;
      const candidates = [
        decodedServiceId,
        decodedServiceId === "priorityDm" ? "chatAdvice" : null,
        decodedServiceId === "chatAdvice" ? "priorityDm" : null,
      ].filter(Boolean) as string[];

      const matchedKey = candidates.find((key) => pricing[key]);
      if (!matchedKey) {
        setResolvedServiceKey(null);
        setReviews([]);
        return;
      }

      setResolvedServiceKey(matchedKey);

      const { data: bookings, error: bookingsError } = await supabase
        .from("bookings")
        .select("id")
        .eq("expert_id", profileData.id)
        .in("session_type", candidates);

      if (bookingsError || !bookings || bookings.length === 0) {
        setReviews([]);
        return;
      }

      const bookingIds = bookings.map((booking) => booking.id);

      const { data: reviewData, error: reviewsError } = await supabase
        .from("reviews")
        .select("id, rating, comment, mentor_reply, created_at, user_id")
        .eq("expert_id", profileData.id)
        .in("booking_id", bookingIds)
        .order("created_at", { ascending: false });

      if (reviewsError || !reviewData || reviewData.length === 0) {
        setReviews([]);
        return;
      }

      const reviewerIds = Array.from(new Set(reviewData.map((review) => review.user_id)));

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", reviewerIds);

      const profileMap = new Map((profiles || []).map((profile) => [profile.id, profile.full_name]));

      const mappedReviews: ServiceReview[] = reviewData.map((review) => ({
        ...review,
        comment: review.comment || null,
        mentor_reply: review.mentor_reply || null,
        profile_name: profileMap.get(review.user_id) || "Anonymous",
      }));

      setReviews(mappedReviews);
    } finally {
      setLoading(false);
    }
  };

  const serviceData = useMemo(() => {
    if (!mentor?.service_pricing || !resolvedServiceKey) return null;

    const raw = mentor.service_pricing[resolvedServiceKey];
    if (!raw) return null;

    const normalizedKey = resolvedServiceKey === "chatAdvice" ? "priorityDm" : resolvedServiceKey;
    const config = SERVICE_CONFIG[normalizedKey];

    return {
      key: resolvedServiceKey,
      normalizedKey,
      name: raw.name || config?.name || "Custom Service",
      description: raw.description || config?.description || "No description provided.",
      price: raw.price ?? 0,
      discountPrice: raw.discount_price,
      duration: raw.duration as number | undefined,
      enabled: isServiceEnabled(raw.enabled),
      hasFreeDemo: isTruthyFlag(raw.hasFreeDemo),
      typeLabel: config?.typeLabel || "Mentoring Service",
      requiresScheduling: config?.requiresScheduling || false,
    };
  }, [mentor, resolvedServiceKey]);

  const avgRating =
    reviews.length > 0
      ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
      : 0;

  const serviceActionLabel = useMemo(() => {
    if (!serviceData) return "Book Service";

    switch (serviceData.normalizedKey) {
      case "oneOnOneSession":
        return "Book 1-on-1 Session";
      case "priorityDm":
        return "Start Priority DM";
      case "digitalProducts":
        return "Get Digital Product";
      default:
        return "Book This Service";
    }
  }, [serviceData]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Navbar />
        <div className="flex-grow flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-matepeak-primary" />
        </div>
      </div>
    );
  }

  if (!mentor || !serviceData || !serviceData.enabled) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Navbar />
        <main className="flex-grow container mx-auto px-4 py-10">
          <Card className="max-w-2xl mx-auto">
            <CardContent className="p-8 text-center space-y-4">
              <h1 className="text-2xl font-semibold text-gray-900">Service Not Found</h1>
              <p className="text-gray-600">This service is not available on the mentor profile.</p>
              <Link to={`/mentor/${username}`}>
                <Button>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Mentor Profile
                </Button>
              </Link>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />

      <main className="flex-grow py-6 sm:py-8 md:py-10">
        <div className="container mx-auto px-4 max-w-7xl space-y-4 sm:space-y-6 md:space-y-8">
          <div>
            <Link to={`/mentor/${mentor.username}`}>
              <Button variant="ghost" className="px-0 hover:bg-transparent">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to {mentor.full_name}
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8 items-start">
            <div className="lg:col-span-2">
              <Card className="shadow-sm border border-gray-100 rounded-2xl">
                <CardContent className="p-4 sm:p-6 md:p-8 space-y-6 md:space-y-7">
                  <div className="space-y-4 md:space-y-5">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <Badge variant="outline">{serviceData.typeLabel}</Badge>
                      {serviceData.duration && (
                        <Badge variant="outline" className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          {serviceData.duration} min
                        </Badge>
                      )}
                      {!serviceData.enabled && <Badge variant="secondary">Disabled</Badge>}
                      {serviceData.hasFreeDemo && (
                        <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Free Demo</Badge>
                      )}
                    </div>

                    <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 leading-tight">
                      {serviceData.name}
                    </h1>
                  </div>

                  <div className="bg-white space-y-2 md:space-y-3">
                    <p className="text-sm font-medium text-gray-700">Description</p>
                    <p className="text-gray-700 whitespace-pre-wrap break-all">{serviceData.description}</p>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-5 sm:gap-4 pt-1">
                    <div className="space-y-1">
                      <p className="text-xs uppercase tracking-wide text-gray-500">Pricing</p>
                      {serviceData.discountPrice ? (
                        <div className="flex items-end gap-2">
                          <div className="text-3xl font-bold text-green-600 flex items-center">
                            <IndianRupee className="h-5 w-5" />
                            {serviceData.discountPrice}
                          </div>
                          <div className="text-lg text-gray-500 line-through">₹{serviceData.price}</div>
                        </div>
                      ) : (
                        <div className="text-3xl font-bold text-gray-900 flex items-center">
                          <IndianRupee className="h-5 w-5" />
                          {serviceData.price}
                        </div>
                      )}
                    </div>

                    {isOwnProfile ? (
                      <p className="text-sm text-gray-500 italic">This is your own service</p>
                    ) : (
                      <Link
                        className="w-full sm:w-auto"
                        to={`/booking?mentorId=${mentor.id}&serviceId=${encodeURIComponent(
                          serviceData.normalizedKey
                        )}`}
                      >
                        <Button size="lg" className="w-full sm:w-auto bg-gray-900 hover:bg-gray-800">
                          <Calendar className="h-4 w-4 mr-2" />
                          {serviceActionLabel}
                        </Button>
                      </Link>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="lg:col-span-1">
              <Card className="shadow-sm border border-gray-100 rounded-2xl">
                <CardContent className="p-4 sm:p-5 md:p-6 space-y-5">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-gray-900">Reviews</h2>
                    {reviews.length > 0 && (
                      <div className="text-sm text-gray-600 flex items-center gap-1">
                        <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                        {avgRating.toFixed(1)} ({reviews.length})
                      </div>
                    )}
                  </div>

                  {reviews.length === 0 ? (
                    <div className="text-center py-10">
                      <MessageSquare className="h-10 w-10 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-600">No reviews for this service yet.</p>
                    </div>
                  ) : (
                    <div className="space-y-4 max-h-[420px] sm:max-h-[620px] overflow-y-auto pr-1">
                      {reviews.map((review) => (
                        <div key={review.id} className="rounded-xl border border-gray-200 p-3.5">
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <p className="text-sm font-medium text-gray-900 truncate">{review.profile_name}</p>
                            <div className="flex items-center gap-1">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <Star
                                  key={`${review.id}-${i}`}
                                  className={`h-3.5 w-3.5 ${
                                    i < review.rating
                                      ? "fill-amber-400 text-amber-400"
                                      : "text-gray-300"
                                  }`}
                                />
                              ))}
                            </div>
                          </div>

                          {review.comment ? (
                            <p className="text-sm text-gray-700 whitespace-pre-line">{review.comment}</p>
                          ) : (
                            <p className="text-sm text-gray-500 italic">No written comment.</p>
                          )}

                          {review.mentor_reply && (
                            <div className="mt-2 rounded-lg bg-gray-50 border border-gray-200 p-2.5">
                              <p className="text-xs font-medium text-gray-700 mb-1">Mentor reply</p>
                              <p className="text-sm text-gray-600">{review.mentor_reply}</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
