import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import {
  Twitter,
  Instagram,
  Linkedin,
  Youtube,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import RoleSelectionModal from "./RoleSelectionModal";

const Footer = () => {
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [userRole, setUserRole] = useState<"student" | "mentor" | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        const role = session.user.user_metadata?.role as "student" | "mentor";
        setUserRole(role);
        fetchProfile(session.user.id, role);
      }
    });
  }, []);

  const fetchProfile = async (userId: string, role: "student" | "mentor") => {
    if (role === "mentor") {
      const { data: expertData } = await supabase
        .from("expert_profiles")
        .select("username, onboarding_complete")
        .eq("id", userId)
        .single();
      setProfile(expertData);
    }
  };

  const handleBecomeMentor = (e: React.MouseEvent) => {
    e.preventDefault();
    if (userRole === "mentor") {
      if (profile && !profile.onboarding_complete) {
        navigate("/expert/onboarding");
      } else {
        navigate("/mentor/dashboard");
      }
    } else {
      setIsRoleModalOpen(true);
    }
  };

  const footerLinks = [
    { label: "Explore", to: "/explore" },
    { label: "How It Works", to: "/how-it-works" },
    { label: "About", to: "/about-us" },
    { label: "Support", to: "/support" },
  ];

  const utilityLinks = [
    { label: "Browse Mentors", to: "/mentors" },
    { label: "For Students", to: "/explore" },
    { label: "Become a Mentor", action: handleBecomeMentor },
    { label: "Privacy", to: "/privacy" },
    { label: "About Us", to: "/about-us" },
  ];

  return (
    <>
      <footer className="bg-white mt-24">
        <div className="max-w-7xl mx-auto px-6 md:px-8 py-12 md:py-14">
          <div className="flex flex-col gap-12">
            <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
              <Link to="/" className="inline-block shrink-0">
                <img
                  src="/lovable-uploads/MatePeak_logo_with_name (1).png"
                  alt="MatePeak Logo"
                  className="h-12"
                />
              </Link>

              <nav className="flex flex-wrap items-center gap-x-8 gap-y-4 text-[15px] font-semibold text-gray-900 lg:justify-center">
                {footerLinks.map((item) => (
                  <Link
                    key={item.label}
                    to={item.to}
                    className="hover:text-matepeak-primary transition-colors"
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>

              <div className="flex items-center gap-1 lg:justify-end">
                <a
                  href="https://x.com/MatePeak"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="X"
                  className="group flex items-center justify-center w-9 h-9 rounded-xl text-gray-400 transition-all duration-200 ease-in-out hover:text-gray-900 hover:bg-gray-100 active:scale-95"
                >
                  <Twitter className="w-[18px] h-[18px] transition-transform duration-200 group-hover:scale-110" />
                </a>
                <a
                  href="https://www.instagram.com/matepeakofficial"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Instagram"
                  className="group flex items-center justify-center w-9 h-9 rounded-xl text-gray-400 transition-all duration-200 ease-in-out hover:text-gray-900 hover:bg-gray-100 active:scale-95"
                >
                  <Instagram className="w-[18px] h-[18px] transition-transform duration-200 group-hover:scale-110" />
                </a>
                <a
                  href="https://www.linkedin.com/company/matepeak"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="LinkedIn"
                  className="group flex items-center justify-center w-9 h-9 rounded-xl text-gray-400 transition-all duration-200 ease-in-out hover:text-gray-900 hover:bg-gray-100 active:scale-95"
                >
                  <Linkedin className="w-[18px] h-[18px] transition-transform duration-200 group-hover:scale-110" />
                </a>
                <a
                  href="https://www.youtube.com/@MatePeak"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="YouTube"
                  className="group flex items-center justify-center w-9 h-9 rounded-xl text-gray-400 transition-all duration-200 ease-in-out hover:text-gray-900 hover:bg-gray-100 active:scale-95"
                >
                  <Youtube className="w-[18px] h-[18px] transition-transform duration-200 group-hover:scale-110" />
                </a>
              </div>
            </div>

            <div className="flex flex-col gap-5 border-t border-black/5 pt-6 text-sm text-gray-600 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
                <span>© {new Date().getFullYear()} MatePeak</span>
                <Link
                  to="/support"
                  className="hover:text-matepeak-primary transition-colors"
                >
                  Support
                </Link>
              </div>

              <div className="flex flex-wrap items-center gap-x-6 gap-y-3 lg:justify-end">
                {utilityLinks.map((item) =>
                  item.action ? (
                    <button
                      key={item.label}
                      type="button"
                      onClick={(e) => item.action?.(e)}
                      className="text-left hover:text-matepeak-primary transition-colors"
                    >
                      {item.label}
                    </button>
                  ) : item.to ? (
                    <Link
                      key={item.label}
                      to={item.to}
                      className="hover:text-matepeak-primary transition-colors"
                    >
                      {item.label}
                    </Link>
                  ) : null
                )}
              </div>
            </div>
          </div>
        </div>
      </footer>
      <RoleSelectionModal
        open={isRoleModalOpen}
        onOpenChange={setIsRoleModalOpen}
      />
    </>
  );
};

export default Footer;
