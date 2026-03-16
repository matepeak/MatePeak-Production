import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { 
  Clock, 
  DollarSign, 
  Star, 
  Calendar, 
  MessageSquare,
  Linkedin,
  Instagram,
  Twitter,
  Globe,
  Loader2
} from "lucide-react";
import { toast } from "@/components/ui/sonner";

interface MentorProfileData {
  id: string;
  full_name: string;
  username: string;
  category: string;
  bio: string;
  experience: number;
  pricing: number;
  ispaid: boolean;
  availability_json: string;
  social_links: any;
  services: any;
  created_at: string;
  profiles?: {
    avatar_url?: string;
    email?: string;
  };
}

export default function MentorProfileByUsername() {
  const { username } = useParams<{ username: string }>();
  const [mentor, setMentor] = useState<MentorProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [averageRating, setAverageRating] = useState(0);
  const [reviewCount, setReviewCount] = useState(0);

  useEffect(() => {
    if (username) {
      fetchMentorProfile();
    }
  }, [username]);

  const fetchMentorProfile = async () => {
    try {
      setLoading(true);
      
      // Fetch mentor profile by username
      const { data, error } = await supabase
        .from("expert_profiles")
        .select("*")
        .eq("username", username)
        .single();

      if (error) throw error;

      setMentor(data as any);

      // Fetch reviews
      if (data?.id) {
        const { data: reviews, error: reviewError } = await supabase
          .from("reviews")
          .select("rating")
          .eq("expert_id", data.id);

        if (!reviewError && reviews) {
          setReviewCount(reviews.length);
          if (reviews.length > 0) {
            const avg = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
            setAverageRating(avg);
          }
        }
      }
    } catch (error: any) {
      console.error("Error fetching mentor profile:", error);
      toast.error("Failed to load mentor profile");
    } finally {
      setLoading(false);
    }
  };

  const parseAvailability = (jsonStr: string) => {
    try {
      const availability = JSON.parse(jsonStr);
      return availability;
    } catch {
      return [];
    }
  };

  const getServicesList = () => {
    const services = [];
    if (mentor?.services?.oneOnOneSession) services.push("1-on-1 Sessions");
    if (mentor?.services?.priorityDm) services.push("Priority DM");
    if (mentor?.services?.digitalProducts) services.push("Digital Products");
    if (mentor?.services?.notes) services.push("Notes & Resources");
    return services;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-grow flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-matepeak-primary" />
        </div>
        <Footer />
      </div>
    );
  }

  if (!mentor) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-grow flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-2">Mentor Not Found</h2>
            <p className="text-gray-600 mb-4">The mentor profile you're looking for doesn't exist.</p>
            <Link to="/mentors">
              <Button>Browse Mentors</Button>
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const availability = parseAvailability(mentor.availability_json || "[]");
  const services = getServicesList();

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />
      
      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="max-w-5xl mx-auto">
          {/* Header Section */}
          <Card className="mb-6">
            <CardContent className="p-8">
              <div className="flex flex-col md:flex-row gap-6">
                <Avatar className="h-32 w-32">
                  <AvatarImage src={""} alt={mentor.full_name} />
                  <AvatarFallback className="text-3xl bg-matepeak-primary text-white">
                    {mentor.full_name.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-grow">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-2">
                    <div>
                      <h1 className="text-3xl font-bold text-gray-900">{mentor.full_name}</h1>
                      <p className="text-gray-600">@{mentor.username}</p>
                    </div>
                    <div className="mt-2 md:mt-0">
                      <Link to={`/book/${mentor.id}`}>
                        <Button size="lg" className="w-full md:w-auto">
                          Book a Session
                        </Button>
                      </Link>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-2 mb-4">
                    <Badge variant="secondary" className="text-sm">
                      {mentor.category}
                    </Badge>
                    {services.map((service) => (
                      <Badge key={service} variant="outline" className="text-sm">
                        {service}
                      </Badge>
                    ))}
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm">
                    {averageRating > 0 && (
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        <span className="font-medium">{averageRating.toFixed(1)}</span>
                        <span className="text-gray-600">({reviewCount} reviews)</span>
                      </div>
                    )}
                    {mentor.experience > 0 && (
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4 text-gray-600" />
                        <span className="text-gray-600">{mentor.experience}+ years experience</span>
                      </div>
                    )}
                  </div>

                  {/* Social Links */}
                  {mentor.social_links && Object.keys(mentor.social_links).length > 0 && (
                    <div className="flex gap-3 mt-4">
                      {mentor.social_links.linkedin && (
                        <a 
                          href={mentor.social_links.linkedin} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-gray-600 hover:text-matepeak-primary"
                        >
                          <Linkedin className="h-5 w-5" />
                        </a>
                      )}
                      {mentor.social_links.instagram && (
                        <a 
                          href={mentor.social_links.instagram} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-gray-600 hover:text-matepeak-primary"
                        >
                          <Instagram className="h-5 w-5" />
                        </a>
                      )}
                      {mentor.social_links.twitter && (
                        <a 
                          href={mentor.social_links.twitter} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-gray-600 hover:text-matepeak-primary"
                        >
                          <Twitter className="h-5 w-5" />
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Main Content */}
            <div className="md:col-span-2 space-y-6">
              {/* About Section */}
              <Card>
                <CardContent className="p-6">
                  <h2 className="text-xl font-bold mb-4">About</h2>
                  <p className="text-gray-700 whitespace-pre-line">{mentor.bio || "No bio provided."}</p>
                </CardContent>
              </Card>

              {/* Services Offered */}
              {services.length > 0 && (
                <Card>
                  <CardContent className="p-6">
                    <h2 className="text-xl font-bold mb-4">Services Offered</h2>
                    <div className="space-y-3">
                      {mentor.services?.oneOnOneSession && (
                        <div className="flex items-start gap-3">
                          <MessageSquare className="h-5 w-5 text-matepeak-primary mt-0.5" />
                          <div>
                            <h3 className="font-medium">1-on-1 Sessions</h3>
                            <p className="text-sm text-gray-600">Personalized mentoring sessions</p>
                          </div>
                        </div>
                      )}
                      {mentor.services?.priorityDm && (
                        <div className="flex items-start gap-3">
                          <MessageSquare className="h-5 w-5 text-matepeak-primary mt-0.5" />
                          <div>
                            <h3 className="font-medium">Priority DM</h3>
                            <p className="text-sm text-gray-600">Quick questions and guidance</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Pricing */}
              <Card>
                <CardContent className="p-6">
                  <h3 className="text-lg font-bold mb-4">Pricing</h3>
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className="h-5 w-5 text-matepeak-primary" />
                    <span className="text-2xl font-bold">
                      {mentor.ispaid ? `$${mentor.pricing || 0}` : "Free"}
                    </span>
                    {mentor.ispaid && <span className="text-gray-600">/ session</span>}
                  </div>
                </CardContent>
              </Card>

              {/* Availability */}
              {availability.length > 0 && (
                <Card>
                  <CardContent className="p-6">
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                      <Calendar className="h-5 w-5 text-matepeak-primary" />
                      Availability
                    </h3>
                    <div className="space-y-2">
                      {availability.slice(0, 5).map((slot: any, idx: number) => (
                        <div key={idx} className="text-sm">
                          <span className="font-medium">{slot.day}:</span>{" "}
                          <span className="text-gray-600">
                            {slot.from} - {slot.to}
                          </span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}
