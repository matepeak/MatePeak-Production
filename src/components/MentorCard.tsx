import { Star, Phone, Users, MessageCircle, Heart } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { SERVICE_CONFIG, normalizeServiceType } from "@/config/serviceConfig";

export interface MentorServiceOption {
  name: string;
  serviceKey?: string;
  serviceType?: string;
}

// Update the MentorProfile type to include connectionOptions
export interface MentorProfile {
  id: string;
  name: string;
  title: string;
  image: string;
  categories: string[];
  rating: number;
  reviewCount: number;
  price: number;
  bio: string;
  connectionOptions: string[];
  connectionOptionDetails?: MentorServiceOption[];
  username?: string; // Optional username for new profile route
  expertise_tags?: string[];
  tagline?: string; // Generated tagline like "Senior @ IIT Delhi | Computer Science"
  mentor_tier?: 'basic' | 'verified' | 'top'; // Mentor tier badge
}

interface MentorCardProps {
  mentor: MentorProfile;
  isNew?: boolean;
  isFavorite?: boolean;
  onToggleFavorite?: (mentorId: string) => void;
}

const MentorCard = ({
  mentor,
  isNew,
  isFavorite = false,
  onToggleFavorite,
}: MentorCardProps) => {
  const nameParts = mentor.name.split(" ");
  const initials =
    nameParts.length > 1
      ? `${nameParts[0][0]}${nameParts[nameParts.length - 1][0]}`
      : mentor.name[0];

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onToggleFavorite) {
      onToggleFavorite(mentor.id);
    }
  };

  const getConnectionIcon = (option: MentorServiceOption) => {
    const normalizedType =
      (option.serviceType && normalizeServiceType(option.serviceType)) ||
      (option.serviceKey && normalizeServiceType(option.serviceKey)) ||
      null;

    if (normalizedType) {
      const Icon = SERVICE_CONFIG[normalizedType].icon;
      return <Icon className="h-3.5 w-3.5" />;
    }

    const lowerOption = option.name.toLowerCase();
    if (lowerOption.includes("call") || lowerOption.includes("1:1")) {
      return <Phone className="h-3.5 w-3.5" />;
    } else if (lowerOption.includes("group")) {
      return <Users className="h-3.5 w-3.5" />;
    } else if (
      lowerOption.includes("resume") ||
      lowerOption.includes("linkedin") ||
      lowerOption.includes("digital") ||
      lowerOption.includes("resource") ||
      lowerOption.includes("document")
    ) {
      const Icon = SERVICE_CONFIG.digitalProducts.icon;
      return <Icon className="h-3.5 w-3.5" />;
    } else if (lowerOption.includes("chat") || lowerOption.includes("doubt")) {
      return <MessageCircle className="h-3.5 w-3.5" />;
    }
    return <Phone className="h-3.5 w-3.5" />;
  };

  const visibleExpertise = mentor.categories.slice(0, 2);
  const serviceOptions: MentorServiceOption[] =
    mentor.connectionOptionDetails && mentor.connectionOptionDetails.length > 0
      ? mentor.connectionOptionDetails
      : mentor.connectionOptions.map((name) => ({ name }));
  const visibleServices = serviceOptions.slice(0, 3);

  return (
    <Card className="overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 h-full w-full max-w-[340px] mx-auto border border-gray-200 bg-white rounded-2xl">
      <CardContent className="p-6 relative h-full flex flex-col">
        {isNew && (
          <div className="absolute top-2 right-2 z-10">
            <div className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">
              NEW
            </div>
          </div>
        )}

        {/* Favorite Button */}
        {onToggleFavorite && (
          <button
            onClick={handleFavoriteClick}
            className="absolute top-3 right-3 z-20 p-1 rounded-full bg-white/90 hover:bg-white shadow-sm hover:shadow-md transition-all backdrop-blur-sm"
            aria-label={
              isFavorite ? "Remove from favorites" : "Add to favorites"
            }
          >
            <Heart
              className={`h-4 w-4 transition-all ${
                isFavorite
                  ? "fill-red-500 text-red-500"
                  : "text-gray-400 hover:text-red-500"
              }`}
            />
          </button>
        )}

        {/* Header: Avatar, Name, Tagline, Rating */}
        <div className="flex items-start gap-4 mb-4 pr-10">
          <Avatar className="h-16 w-16 flex-shrink-0 border-2 border-gray-100">
            <AvatarImage
              src={mentor.image}
              alt={mentor.name}
              className="object-cover"
            />
            <AvatarFallback className="bg-matepeak-primary text-white font-semibold text-lg">
              {initials}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              <h3 className="font-bold text-gray-900 text-base line-clamp-1 pr-1">
                {mentor.name}
              </h3>
            </div>

            {/* Tagline */}
            {mentor.tagline && (
              <p className="text-gray-600 text-xs mb-1.5 line-clamp-1">
                {mentor.tagline}
              </p>
            )}

            {/* Rating or No Reviews Badge */}
            {mentor.rating > 0 && mentor.reviewCount > 0 ? (
              <div className="flex items-center gap-1.5">
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400 flex-shrink-0" />
                <span className="text-sm font-bold text-gray-900">
                  {mentor.rating.toFixed(1)}
                </span>
                <span className="text-xs text-gray-500">
                  ({mentor.reviewCount})
                </span>
              </div>
            ) : (
              <span className="text-xs text-gray-500 italic">
                No reviews yet
              </span>
            )}
          </div>
        </div>

        {/* Bio */}
        {mentor.bio && (
          <p className="text-sm text-gray-600 leading-relaxed mb-4 line-clamp-2">
            {mentor.bio}
          </p>
        )}

        {/* Expertise Section */}
        <div className="mb-4 h-[92px] flex flex-col">
          <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wide mb-2.5">
            EXPERTISE
          </h4>
          <div className="flex flex-wrap gap-2 overflow-hidden">
            {visibleExpertise.map((category, index) => (
              <Badge
                key={index}
                variant="outline"
                className="max-w-full bg-white text-gray-700 border-gray-300 text-xs font-medium px-3 py-1 rounded-md hover:bg-gray-50 transition-colors"
              >
                <span className="truncate">{category}</span>
              </Badge>
            ))}
          </div>
        </div>

        {/* Available Services */}
        <div className="mb-6">
          <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wide mb-2.5">
            AVAILABLE SERVICES
          </h4>
          <div className="space-y-2">
            {visibleServices.map((option, index) => (
              <Badge
                key={index}
                variant="outline"
                className="w-full justify-start bg-white text-gray-700 border-gray-300 text-xs font-medium px-3 py-1 rounded-md hover:bg-gray-50 transition-colors"
              >
                <span className="flex items-center gap-1.5 min-w-0">
                  {getConnectionIcon(option)}
                  <span className="truncate">{option.name}</span>
                </span>
              </Badge>
            ))}
          </div>
        </div>

        {/* Footer: Price and CTA */}
        <div className="mt-auto flex items-center justify-between pt-4 border-t border-gray-200">
          <div>
            <p className="text-xs text-gray-500 mb-0.5">Starting from</p>
            <p className="text-xl font-bold text-gray-900">₹{mentor.price}</p>
          </div>
          <Link
            to={
              mentor.username
                ? `/mentor/${mentor.username}`
                : `/mentors/${mentor.id}`
            }
          >
            <Button className="bg-gray-900 hover:bg-gray-800 text-white text-sm font-semibold px-6 py-2 rounded-full transition-colors">
              View Profile
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
};

export default MentorCard;
