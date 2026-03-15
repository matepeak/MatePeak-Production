import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Twitter,
  Instagram,
  Linkedin,
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

  return (
    <>
      <footer className="bg-white mt-20 mb-6">
        <div className="max-w-7xl mx-auto px-6 md:px-8 py-10">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
            <Link to="/" className="inline-block">
              <img
                src="/lovable-uploads/MatePeak_logo_with_name (1).png"
                alt="MatePeak Logo"
                className="h-12"
              />
            </Link>

            <div className="flex flex-col items-start lg:items-center gap-3">
              <nav className="flex flex-wrap items-center gap-x-8 gap-y-3 text-sm font-medium text-gray-900">
                <Link
                  to="/explore"
                  className="hover:text-matepeak-primary transition-colors"
                  onClick={() =>
                    setTimeout(
                      () => window.scrollTo({ top: 0, behavior: "smooth" }),
                      0
                    )
                  }
                >
                  Browse Mentors
                </Link>
                <Button
                  variant="link"
                  className="h-auto p-0 text-sm font-medium text-gray-900 hover:text-matepeak-primary"
                  onClick={handleBecomeMentor}
                >
                  Become a Mentor
                </Button>
                <Link
                  to="/how-it-works"
                  className="hover:text-matepeak-primary transition-colors"
                >
                  How It Works
                </Link>
                <Link
                  to="/about-us"
                  className="hover:text-matepeak-primary transition-colors"
                >
                  About
                </Link>
              </nav>
              <a
                href="mailto:support@matepeak.com"
                className="text-sm text-gray-600 hover:text-matepeak-primary transition-colors"
              >
                support@matepeak.com
              </a>
            </div>

            <div className="flex items-center gap-4 text-gray-900">
              <a
                href="https://x.com/MatePeak"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="X"
                className="hover:text-matepeak-primary transition-colors"
              >
                <Twitter className="w-5 h-5" />
              </a>
              <a
                href="https://www.instagram.com/matepeakofficial"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="hover:text-matepeak-primary transition-colors"
              >
                <Instagram className="w-5 h-5" />
              </a>
              <a
                href="https://www.linkedin.com/company/matepeak"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="LinkedIn"
                className="hover:text-matepeak-primary transition-colors"
              >
                <Linkedin className="w-5 h-5" />
              </a>
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
