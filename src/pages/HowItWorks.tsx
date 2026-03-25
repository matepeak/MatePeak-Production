import React, { useRef } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import HowItWorksSection from "@/components/home/HowItWorks";
import SEO from "@/components/SEO";

const HowItWorks = () => {
  const sectionRef = useRef<HTMLDivElement>(null);

  return (
    <div className="min-h-screen flex flex-col">
      <SEO
        title="How MatePeak Works | Learn or Earn in 4 Simple Steps"
        description="Discover how MatePeak works — create your profile, find a mentor or list your expertise, book a session, and start learning or earning today."
        canonicalPath="/how-it-works"
      />
      <Navbar />
      <main className="flex-grow pt-16">
        <HowItWorksSection sectionRef={sectionRef} />
      </main>
      <Footer />
    </div>
  );
};

export default HowItWorks;
