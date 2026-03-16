import { useState } from "react";
import { ChevronDown } from "lucide-react";

const faqs = [
  {
    question: "What is MatePeak and how does it work?",
    answer:
      "MatePeak is a mentorship platform that connects learners with expert mentors worldwide. Browse mentor profiles, book a 1:1 session at a time that suits you, and get personalised guidance to reach your goals faster.",
  },
  {
    question: "How do I book a session with a mentor?",
    answer:
      "Search for a mentor by skill or category, view their profile and availability, choose a session type and time slot, then confirm your booking. You'll receive an email confirmation with all the details.",
  },
  {
    question: "Can I become a mentor on MatePeak?",
    answer:
      "Yes! If you have expertise to share, click 'Become a Mentor' and complete a short onboarding process. Once approved, you can set your own availability and pricing.",
  },
  {
    question: "What happens if I need to reschedule or cancel?",
    answer:
      "You can reschedule or cancel a session from your dashboard before the session starts. Cancellation policies vary by mentor, so please check the mentor's profile for details.",
  },
  {
    question: "Is my payment secure?",
    answer:
      "Yes. All payments are processed securely. Funds are held until your session is completed, ensuring a safe experience for both students and mentors.",
  },
];

const FAQ = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggle = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section className="w-full max-w-5xl mx-auto px-4 sm:px-8 py-16">
      <h2 className="text-3xl font-bold text-gray-900 mb-10 text-center">
        Frequently asked questions
      </h2>
      <div className="divide-y divide-gray-200">
        {faqs.map((faq, index) => (
          <div key={index}>
            <button
              className="w-full flex items-center justify-between py-5 text-left group"
              onClick={() => toggle(index)}
              aria-expanded={openIndex === index}
            >
              <span className="text-base font-medium text-gray-800 group-hover:text-gray-900 transition-colors pr-8">
                {faq.question}
              </span>
              <ChevronDown
                strokeWidth={2.5}
                className={`w-5 h-5 text-gray-600 flex-shrink-0 transition-transform duration-300 ease-in-out ${
                  openIndex === index ? "rotate-180" : ""
                }`}
              />
            </button>
            <div
              className={`grid transition-all duration-300 ease-in-out ${
                openIndex === index
                  ? "grid-rows-[1fr] opacity-100"
                  : "grid-rows-[0fr] opacity-0"
              }`}
            >
              <div className="overflow-hidden">
                <p className="pb-5 text-gray-600 text-sm leading-relaxed">
                  {faq.answer}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default FAQ;
