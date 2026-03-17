import { useEffect, useRef, useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Hero from "@/components/home/Hero";
import HowItWorks from "@/components/home/HowItWorks";
import NewMentors from "@/components/home/NewMentors";
import FeaturedMentors from "@/components/home/FeaturedMentors";
import CallToActionSection from "@/components/CallToActionSection";
import FAQ from "@/components/home/FAQ";
import { supabase } from "@/integrations/supabase/client";
import SEO from "@/components/SEO";

const Index = () => {
  const [user, setUser] = useState<any>(null);

  // Check authentication status
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);
  // Refs for scroll animation sections
  const sectionRefs = {
    howItWorks: useRef<HTMLDivElement>(null),
    newMentors: useRef<HTMLDivElement>(null),
    mentors: useRef<HTMLDivElement>(null),
  };

  // Handle scroll animations
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("animate-fade-in-up", "opacity-100");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1 }
    );

    // Observe all section refs
    Object.values(sectionRefs).forEach((ref) => {
      if (ref.current) {
        ref.current.classList.add("opacity-0");
        observer.observe(ref.current);
      }
    });

    return () => {
      Object.values(sectionRefs).forEach((ref) => {
        if (ref.current) observer.unobserve(ref.current);
      });
    };
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <SEO
        title="Matepeak - Be a Solopreneur"
        description="Connect with expert mentors for 1-on-1 sessions in career growth, coding, interview prep, and more. Learn faster with personalized guidance on MatePeak."
        canonicalPath="/"
      />
      <Navbar />
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-8 md:px-12 xl:px-0">
        <Hero />
        {!user && <HowItWorks sectionRef={sectionRefs.howItWorks} />}
        <NewMentors sectionRef={sectionRefs.newMentors} />
        <FeaturedMentors sectionRef={sectionRefs.mentors} />
      </main>
      <CallToActionSection />
      <FAQ />
      <Footer />
    </div>
  );
};

export default Index;
