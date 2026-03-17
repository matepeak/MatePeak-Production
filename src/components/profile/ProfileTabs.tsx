import { 
  User, 
  Calendar, 
  Briefcase, 
  Star, 
  Info,
  Handshake
} from "lucide-react";
import { ProfileTab } from "@/pages/MentorPublicProfile";

interface ProfileTabsProps {
  activeTab: ProfileTab;
  onTabChange: (tab: ProfileTab) => void;
}

export default function ProfileTabs({ activeTab, onTabChange }: ProfileTabsProps) {
  const tabs = [
    {
      id: "overview" as ProfileTab,
      label: "Overview",
      icon: User,
    },
    {
      id: "services" as ProfileTab,
      label: "Services",
      icon: Handshake,
    },
    {
      id: "availability" as ProfileTab,
      label: "Availability",
      icon: Calendar,
    },
    {
      id: "experiences" as ProfileTab,
      label: "Experiences",
      icon: Briefcase,
    },
    {
      id: "reviews" as ProfileTab,
      label: "Reviews",
      icon: Star,
    },
    {
      id: "about" as ProfileTab,
      label: "More About",
      icon: Info,
    },
  ];

  return (
    <div className="border-b border-gray-200 mb-6">
      <div className="w-full grid grid-cols-6 bg-transparent h-auto p-0 gap-0">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`py-4 px-4 flex items-center justify-center gap-2 font-medium text-sm border-b-2 transition-all ${
                isActive
                  ? 'text-matepeak-primary border-matepeak-primary bg-transparent'
                  : 'text-gray-600 border-transparent hover:text-matepeak-primary hover:border-gray-300'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
