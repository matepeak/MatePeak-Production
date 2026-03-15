import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Twitter,
  Facebook,
  Instagram,
  Pin,
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
              <Link
                to="/contact"
                className="hover:text-matepeak-primary transition-colors"
              >
                Support
              </Link>
            </nav>

            <div className="flex items-center gap-4 text-gray-900">
              <a href="#" aria-label="X" className="hover:text-matepeak-primary transition-colors">
                <Twitter className="w-5 h-5" />
              </a>
              <a href="#" aria-label="Facebook" className="hover:text-matepeak-primary transition-colors">
                <Facebook className="w-5 h-5" />
              </a>
              <a href="#" aria-label="Instagram" className="hover:text-matepeak-primary transition-colors">
                <Instagram className="w-5 h-5" />
              </a>
              <a href="#" aria-label="Pinterest" className="hover:text-matepeak-primary transition-colors">
                <Pin className="w-5 h-5" />
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
