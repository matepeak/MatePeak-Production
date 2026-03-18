import { Star, Phone, Users, MessageCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useMentorLiveStatus } from "@/hooks/useMentorPresence";
import PresenceDot from "@/components/PresenceDot";

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
  username?: string; // Optional username for new profile route
  expertise_tags?: string[];
  tagline?: string; // Generated tagline like "Senior @ IIT Delhi | Computer Science"
  mentor_tier?: 'basic' | 'verified' | 'top'; // Mentor tier badge
  is_profile_live?: boolean;
  last_seen?: string | null;
}

interface MentorCardProps {
  mentor: MentorProfile;
  isNew?: boolean;
  isOnlineOverride?: boolean;
}

const MentorCard = ({
  mentor,
  isNew,
  isOnlineOverride,
}: MentorCardProps) => {
  const { isOnline: isMentorOnlineFromHook } = useMentorLiveStatus(
    isOnlineOverride === undefined ? mentor.id : undefined,
    mentor.last_seen ?? null
  );
  const isMentorOnline =
    isOnlineOverride === undefined ? isMentorOnlineFromHook : isOnlineOverride;
  const isMentorLive = Boolean(mentor.is_profile_live) && isMentorOnline;

  const nameParts = mentor.name.split(" ");
  const initials =
    nameParts.length > 1
      ? `${nameParts[0][0]}${nameParts[nameParts.length - 1][0]}`
      : mentor.name[0];

  const getConnectionIcon = (option: string) => {
    const lowerOption = option.toLowerCase();
    if (lowerOption.includes("call") || lowerOption.includes("1:1")) {
      return <Phone className="h-3.5 w-3.5" />;
    } else if (lowerOption.includes("group")) {
      return <Users className="h-3.5 w-3.5" />;
    } else if (lowerOption.includes("chat") || lowerOption.includes("doubt")) {
      return <MessageCircle className="h-3.5 w-3.5" />;
    }
    return <Phone className="h-3.5 w-3.5" />;
  };

  return (
    <Card className="overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 h-full w-full max-w-[340px] mx-auto border border-gray-200 bg-white rounded-2xl">
      <CardContent className="p-6 relative">
        {isNew && (
          <div className="absolute top-2 right-2 z-10">
            <div className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">
              NEW
            </div>
          </div>
        )}

        {/* Header: Avatar, Name, Tagline, Rating */}
        <div className="flex items-start gap-4 mb-4 pr-10">
          <div className="relative flex-shrink-0">
            <Avatar className="h-16 w-16 border-2 border-gray-100">
              <AvatarImage
                src={mentor.image}
                alt={mentor.name}
                className="object-cover"
              />
              <AvatarFallback className="bg-matepeak-primary text-white font-semibold text-lg">
                {initials}
              </AvatarFallback>
            </Avatar>
            {isMentorLive && (
              <PresenceDot className="absolute -top-0.5 -right-0.5" />
            )}
          </div>

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
        <div className="mb-4">
          <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wide mb-2.5">
            EXPERTISE
          </h4>
          <div className="flex flex-wrap gap-2">
            {mentor.categories.slice(0, 3).map((category, index) => (
              <Badge
                key={index}
                variant="outline"
                className="bg-white text-gray-700 border-gray-300 text-xs font-medium px-3 py-1 rounded-md hover:bg-gray-50 transition-colors"
              >
                {category}
              </Badge>
            ))}
          </div>
        </div>

        {/* Available Services */}
        <div className="mb-6">
          <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wide mb-2.5">
            AVAILABLE SERVICES
          </h4>
          <div className="flex flex-wrap gap-2">
            {mentor.connectionOptions.slice(0, 3).map((option, index) => (
              <Badge
                key={index}
                variant="outline"
                className="bg-white text-gray-700 border-gray-300 text-xs font-medium px-3 py-1 rounded-md hover:bg-gray-50 transition-colors"
              >
                <span className="flex items-center gap-1.5">
                  {getConnectionIcon(option)}
                  {option}
                </span>
              </Badge>
            ))}
          </div>
        </div>

        {/* Footer: Price and CTA */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-200">
          <div>
            <p className="text-xs text-gray-500 mb-0.5">Starting from</p>
            <p className="text-xl font-bold text-gray-900">
              ₹{mentor.price}
              <span className="text-xs text-gray-500 font-normal ml-1">
                /session
              </span>
            </p>
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
