import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import RoleSelectionModal from "./RoleSelectionModal";
import { supabase } from "@/integrations/supabase/client";

const CallToActionSection = () => {
  const navigate = useNavigate();
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);

  const handleGetStartedClick = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (session) {
      // Check user role from profiles table
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", session.user.id)
        .single();

      if (profile?.role === "mentor") {
        // Fetch username from expert_profiles for mentors
        const { data: expertProfile } = await supabase
          .from("expert_profiles")
          .select("username")
          .eq("id", session.user.id)
          .single();

        if (expertProfile?.username) {
          navigate(`/dashboard/${expertProfile.username}`);
        } else {
          navigate("/expert/dashboard"); // Fallback to old route
        }
      } else {
        navigate("/student/dashboard");
      }
    } else {
      setIsRoleModalOpen(true);
    }
  };

  return (
    <>
      <section className="relative bg-black py-24 md:py-32 px-4 overflow-hidden">
        <div className="w-full mx-auto text-center relative z-10 px-2 md:px-8 xl:px-0">
          {/* MatePeak Logo - Bigger */}
          <div className="flex justify-center items-center mb-6">
            <img
              src="/lovable-uploads/14bf0eea-1bc9-4675-9231-356df10eb82d.png"
              alt="MatePeak Logo"
              className="h-16 w-auto relative z-20"
            />
          </div>

          {/* Main Heading - Times New Roman, Medium Weight */}
          <h2
            className="text-3xl md:text-4xl font-medium text-white mb-4"
            style={{ fontFamily: "Times New Roman, serif" }}
          >
            Unlock Your <span className="italic">Skills</span> Now!
          </h2>

          {/* Subheading - Shorter */}
          <p className="text-gray-400 text-sm md:text-base mb-8 max-w-2xl mx-auto">
            Join the community where lifelong learning meets people grow.
          </p>

          {/* Single CTA Button - Same as Navbar Get Started */}
          <Button
            size="lg"
            className="bg-white text-black hover:bg-gray-100 font-bold px-8 py-6 text-base rounded-lg"
            onClick={handleGetStartedClick}
          >
            Get Started
          </Button>

          {/* Expert Profiles Section */}
          <div className="flex items-center justify-center gap-2 mt-8">
            <span className="text-lg text-gray-400 font-light">
              Our experts are ready to help!
            </span>
            <div className="flex -space-x-3">
              <div className="relative" style={{ zIndex: 4 }}>
                <img
                  src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&h=150&fit=crop&crop=faces"
                  alt="Priya Sharma"
                  className="w-8 h-8 rounded-full border-2 border-white object-cover"
                  title="Priya Sharma"
                  loading="eager"
                />
              </div>
              <div className="relative" style={{ zIndex: 3 }}>
                <img
                  src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=faces"
                  alt="Rahul Kumar"
                  className="w-8 h-8 rounded-full border-2 border-white object-cover"
                  title="Rahul Kumar"
                  loading="eager"
                />
              </div>
              <div className="relative" style={{ zIndex: 2 }}>
                <img
                  src="https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&h=150&fit=crop&crop=faces"
                  alt="Ananya Singh"
                  className="w-8 h-8 rounded-full border-2 border-white object-cover"
                  title="Ananya Singh"
                  loading="eager"
                />
              </div>
              <div className="relative" style={{ zIndex: 1 }}>
                <img
                  src="https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&h=150&fit=crop&crop=faces"
                  alt="Arjun Patel"
                  className="w-8 h-8 rounded-full border-2 border-white object-cover"
                  title="Arjun Patel"
                  loading="eager"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <RoleSelectionModal
        open={isRoleModalOpen}
        onOpenChange={setIsRoleModalOpen}
      />
    </>
  );
};

export default CallToActionSection;
