import React from "react";
import { Link } from "react-router-dom";
import SEO from "@/components/SEO";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import "./AboutUs.css";

const AboutUs: React.FC = () => {
  return (
    <div className="about-page">
      <SEO
        title="About MatePeak | Monetize What You Know. Master What You Don't."
        description="MatePeak is a global platform where knowledge creates opportunity — connecting skilled individuals with learners to foster growth through mentorship."
        canonicalPath="/about-us"
      />

      <Navbar />

      <main className="about-main">

        {/* ── Hero ── */}
        <section className="hero-section">
          <div className="editorial-grid">
            <div className="hero-col">
              <h1 className="hero-headline">
                Monetize <span className="highlighter">What You Know.</span><br />
                Master What You Don't.
              </h1>
              <p className="hero-subhead">
                MatePeak is a global platform where knowledge creates opportunity. We connect skilled
                individuals with learners to foster growth through architectural mentorship.
              </p>
              <div className="hero-buttons">
                <Link to="/explore" className="btn-hero-primary">Join the Community</Link>
                <Link to="/how-it-works" className="btn-hero-secondary">Learn More</Link>
              </div>
            </div>
          </div>
          {/* Decorative orb */}
          <div className="hero-orb" />
        </section>

        {/* ── Problem We're Solving ── */}
        <section className="problem-section">
          <div className="problem-inner editorial-grid">
            <div className="problem-heading-col">
              <h2 className="section-heading">The Problem We're Solving</h2>
              <div className="heading-underline" />
            </div>
            <div className="problem-content-col">
              <p className="problem-intro">
                Traditional mentorship is broken. It's often inaccessible, unstructured, or
                prohibitively expensive. We identified the gaps that prevent high-potential individuals
                from reaching their peak.
              </p>
              <ul className="problem-list">
                <li>
                  <span className="material-symbols-outlined icon">close_fullscreen</span>
                  <span className="text">The "Glass Ceiling" of entry-level professional networks.</span>
                </li>
                <li>
                  <span className="material-symbols-outlined icon">timer_off</span>
                  <span className="text">Inconsistent feedback loops that stall personal development.</span>
                </li>
                <li>
                  <span className="material-symbols-outlined icon">payments</span>
                  <span className="text">Hidden costs and lack of transparency in expertise marketplaces.</span>
                </li>
                <li>
                  <span className="material-symbols-outlined icon">distance</span>
                  <span className="text">Geographic barriers limiting access to world-class specialists.</span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* ── How It Works ── */}
        <section className="how-section">
          <div className="how-inner">
            <h2 className="section-title-center">The MatePeak Path</h2>
            <div className="steps-grid">
              {[
                {
                  num: "01",
                  title: "Join",
                  desc: "Create your profile and define your knowledge domain or learning goals.",
                },
                {
                  num: "02",
                  title: "Connect",
                  desc: "Our intelligent matching algorithm finds the perfect peer or mentor for your needs.",
                },
                {
                  num: "03",
                  title: "Learn/Earn",
                  desc: "Engage in high-impact sessions and exchange value in a secure environment.",
                },
                {
                  num: "04",
                  title: "Scale",
                  desc: "Expand your network and watch your personal or professional influence grow.",
                },
              ].map((step) => (
                <div className="step-item" key={step.num}>
                  <div className="step-num">{step.num}</div>
                  <div className="step-content">
                    <h4 className="step-title">{step.title}</h4>
                    <p className="step-desc">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Why MatePeak ── */}
        <section className="why-section">
          <div className="why-inner">
            <div className="why-grid">
              <div>
                <span className="material-symbols-outlined why-icon">workspace_premium</span>
                <h4 className="why-title">Built for Real Value</h4>
                <p className="why-desc">
                  We focus on outcomes, not just hours. Every interaction is designed for tangible results.
                </p>
              </div>
              <div>
                <span className="material-symbols-outlined why-icon">trending_up</span>
                <h4 className="why-title">Designed for Growth</h4>
                <p className="why-desc">
                  Whether earning or learning, our platform scales with your success automatically.
                </p>
              </div>
              <div>
                <span className="material-symbols-outlined why-icon">groups</span>
                <h4 className="why-title">Empowering Both Sides</h4>
                <p className="why-desc">
                  A balanced ecosystem where mentors flourish and students thrive equally.
                </p>
              </div>
              <div>
                <span className="material-symbols-outlined why-icon">magic_button</span>
                <h4 className="why-title">Simple &amp; Seamless</h4>
                <p className="why-desc">
                  Frictionless technology that stays out of your way so you can focus on excellence.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── Mission & Vision ── */}
        <section className="mission-section">
          <div className="mission-inner">
            <div className="mission-card">
              <h3 className="mv-overline mv-overline-mission">Our Mission</h3>
              <p className="mv-text">
                To democratize expertise and build the infrastructure for the global knowledge economy.
              </p>
            </div>
            <div className="vision-card">
              <h3 className="mv-overline mv-overline-vision">Our Vision</h3>
              <p className="mv-text">
                A world where human potential is never limited by access to high-level mentorship.
              </p>
            </div>
          </div>
        </section>

        {/* ── Core Values ── */}
        <section className="values-section">
          <div className="values-inner">
            <h2 className="section-title-center">Our Core Values</h2>
            <div className="values-grid">
              {[
                { icon: "bolt",          title: "Empowerment",  desc: "Giving you the tools to command your future." },
                { icon: "public",        title: "Accessibility", desc: "No borders, no barriers, just brilliance." },
                { icon: "verified_user", title: "Trust",         desc: "Integrity in every session and transaction." },
                { icon: "trending_up",   title: "Growth",        desc: "Iterative progress as our default state." },
                { icon: "groups",        title: "Community",     desc: "Together we go further, faster." },
              ].map((v) => (
                <div className="value-card" key={v.title}>
                  <span className="material-symbols-outlined value-icon">{v.icon}</span>
                  <h4 className="value-title">{v.title}</h4>
                  <p className="value-desc">{v.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="cta-section">
          <div className="cta-inner">
            <h2 className="cta-title">Start Your Journey</h2>
            <p className="cta-subtitle">
              Whether you're here to gain mastery or share it, your peak starts here.
            </p>
            <div className="cta-buttons">
              <Link to="/explore" className="btn-cta-dark">Start Learning</Link>
              <Link to="/expert/signup" className="btn-cta-yellow">Start Earning</Link>
            </div>
          </div>
        </section>

      </main>

      <Footer />
    </div>
  );
};

export default AboutUs;
