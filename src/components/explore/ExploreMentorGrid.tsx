import MentorCard, { MentorProfile } from "@/components/MentorCard";
import { useMentorPresenceMap } from "@/hooks/useMentorPresence";

interface ExploreMentorGridProps {
  mentors: MentorProfile[];
}

const ExploreMentorGrid = ({
  mentors,
}: ExploreMentorGridProps) => {
  const presenceMap = useMentorPresenceMap(mentors);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
      {mentors.map((mentor) => (
        <MentorCard
          key={mentor.id}
          mentor={mentor}
          isOnlineOverride={presenceMap[mentor.id] ?? false}
        />
      ))}
    </div>
  );
};

export default ExploreMentorGrid;
