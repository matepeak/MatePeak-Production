import { useState } from "react";
import { Link } from "react-router-dom";
import { Plus } from "lucide-react";

const faqs = [
  {
    category: "Getting started",
    question: "What is MatePeak and how does it work?",
    answer:
      "MatePeak is a mentorship platform that connects learners with world-class experts across technology, design, business, and more. Browse curated mentor profiles, view real availability, and book a private 1:1 session in minutes. After your session, you can leave a review and continue building a long-term mentoring relationship at your own pace.",
  },
  {
    category: "Getting started",
    question: "Do I need an account to browse mentors?",
    answer:
      "You can explore mentor profiles and read reviews without creating an account. To book a session, send a message, or save favourites, you'll need to sign up — it only takes a moment with your email or Google account.",
  },
  {
    category: "Booking",
    question: "How do I book a session with a mentor?",
    answer:
      "Find a mentor using the search or category filters, open their profile, and select a session type that matches your needs. Pick an available time slot from their live calendar, confirm your booking, and you'll instantly receive an email with everything you need — including a video call link.",
  },
  {
    category: "Booking",
    question: "What types of sessions are available?",
    answer:
      "Mentors can offer a range of session formats including one-off 30 or 60-minute calls, ongoing monthly packages, CV or portfolio reviews, mock interviews, code reviews, and async written feedback. Each mentor's profile clearly lists what they offer and at what price.",
  },
  {
    category: "Booking",
    question: "What happens if I need to reschedule or cancel?",
    answer:
      "You can reschedule or cancel from your dashboard any time before the session begins. Each mentor sets their own cancellation policy — typically 24 hours' notice for a full refund. The policy is always visible on the mentor's booking page before you confirm.",
  },
  {
    category: "Mentors",
    question: "How are mentors vetted?",
    answer:
      "Every mentor goes through an application and review process before being listed. We verify professional experience, review work history, and assess communication quality. Mentors are also continuously rated by learners after each session, so quality is maintained over time.",
  },
  {
    category: "Mentors",
    question: "Can I become a mentor on MatePeak?",
    answer:
      "Absolutely. If you have skills and experience worth sharing, click 'Become a Mentor' and complete the short onboarding flow. You'll set your own availability, define your session types and pricing, and go live once approved. Most applications are reviewed within 48 hours.",
  },
  {
    category: "Mentors",
    question: "Can I switch mentors if it's not the right fit?",
    answer:
      "Yes, completely. There's no lock-in. You can book sessions with different mentors to find the right fit, or work with multiple mentors simultaneously across different topics. Your history and notes are always saved in your dashboard.",
  },
  {
    category: "Payments",
    question: "Is my payment secure?",
    answer:
      "All payments are processed through Razorpay, one of the world's most trusted payment platforms. Your card details are never stored on our servers. Funds are held securely and only released to the mentor after a session is completed, so you're always protected.",
  },
  {
    category: "Payments",
    question: "What currency and payment methods are supported?",
    answer:
      "Sessions are priced in USD and we accept all major credit and debit cards, as well as Apple Pay and Google Pay. Invoices are available for business accounts on request.",
  },
  {
    category: "Privacy",
    question: "How is my personal data handled?",
    answer:
      "MatePeak takes your privacy seriously. We collect only what's necessary to run the platform, never sell your data to third parties, and comply fully with GDPR. You can download or delete your account data at any time from your account settings.",
  },
];

const FAQ = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggle = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section className="w-full bg-white">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-24 sm:py-32">
        {/* Header */}
        <div className="mb-16 text-center">
          <p className="text-sm font-medium text-gray-400 tracking-widest uppercase mb-4">
            Support
          </p>
          <h2 className="text-4xl sm:text-5xl font-semibold text-gray-900 tracking-tight leading-tight">
            Frequently asked
            <br className="hidden sm:block" /> questions
          </h2>
          <p className="mt-5 text-base text-gray-500 max-w-xl mx-auto leading-relaxed">
            Everything you need to know about MatePeak. Can't find the answer?{" "}
            <Link
              to="/support"
              className="text-gray-900 underline underline-offset-2 decoration-gray-300 hover:decoration-gray-900 transition-all duration-150"
            >
              Talk to our team.
            </Link>
          </p>
        </div>

        {/* Accordion */}
        <div className="divide-y divide-gray-100">
          {faqs.map((faq, index) => {
            const isOpen = openIndex === index;
            return (
              <div key={index}>
                <button
                  className="w-full flex items-start justify-between gap-8 py-6 text-left"
                  onClick={() => toggle(index)}
                  aria-expanded={isOpen}
                >
                  <span className="text-[15px] font-medium text-gray-800 leading-snug">
                    {faq.question}
                  </span>
                  <span
                    className={`mt-0.5 flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full border border-gray-200 text-gray-400 transition-all duration-200 ease-in-out ${
                      isOpen ? "bg-gray-900 border-gray-900 text-white rotate-45" : "bg-white"
                    }`}
                  >
                    <Plus className="w-3.5 h-3.5" strokeWidth={2.5} />
                  </span>
                </button>
                <div
                  className={`grid transition-all duration-300 ease-in-out ${
                    isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                  }`}
                >
                  <div className="overflow-hidden">
                    <p className="pb-6 text-[15px] text-gray-500 leading-relaxed">
                      {faq.answer}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default FAQ;
