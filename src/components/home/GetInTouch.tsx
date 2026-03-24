
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/sonner";
import { Mail } from "lucide-react";

const GetInTouch: React.FC = () => {
  const [form, setForm] = useState({
    name: "",
    email: "",
    subject: "Feedback",
    message: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const SUBJECTS = [
    "Feedback",
    "Suggestion",
    "Question",
    "Other",
  ];

  const handleInput = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setTimeout(() => {
      toast.success("Thanks! We'll get back to you soon.");
      setSubmitting(false);
      setForm({
        name: "",
        email: "",
        subject: "Feedback",
        message: "",
      });
    }, 1100);
  };

  return (
    <section className="py-12 md:py-20 bg-gradient-to-br from-[#FFFDF7] to-[#FFFBEB] px-0 border-t border-[#eaeaea]">
      <div className="container mx-auto px-4">
        <div className="flex-1 max-w-lg w-full mx-auto mb-10 md:mb-8 text-center">
          <div className="flex items-center justify-center mb-2">
            <div className="w-10 h-10 rounded-full bg-[#FFEEB2] flex items-center justify-center mr-3">
              <Mail className="h-5 w-5 text-matepeak-primary" />
            </div>
            <h2 className="font-poppins font-bold text-2xl md:text-3xl text-matepeak-primary">Get in Touch</h2>
          </div>
          <p className="mb-6 text-gray-600">We'd love to hear your feedback, suggestions, or any questions you have.</p>
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-md p-6 md:p-8 space-y-5 mx-auto max-w-xl">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
              <Input
                id="name"
                name="name"
                value={form.name}
                required
                placeholder="Your Name"
                className="rounded-lg shadow-sm focus-visible:ring-[#FFD966]"
                onChange={handleInput}
              />
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
              <Input
                id="email"
                name="email"
                type="email"
                value={form.email}
                required
                placeholder="you@email.com"
                className="rounded-lg shadow-sm focus-visible:ring-[#FFD966]"
                onChange={handleInput}
              />
            </div>
            <div>
              <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
              <select
                id="subject"
                name="subject"
                value={form.subject}
                className="rounded-lg border border-gray-300 px-3 py-2 w-full bg-white shadow-sm text-gray-700 focus-visible:ring-2 focus-visible:ring-[#FFD966] focus:outline-none"
                onChange={handleInput}
              >
                {SUBJECTS.map((subj) => (
                  <option key={subj} value={subj}>{subj}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">Message</label>
              <Textarea
                id="message"
                name="message"
                value={form.message}
                required
                rows={5}
                placeholder="Type your message here..."
                className="rounded-lg shadow-sm min-h-[100px] focus-visible:ring-[#FFD966]"
                onChange={handleInput}
              />
            </div>
            <div className="text-right">
              <Button
                type="submit"
                className="bg-matepeak-primary hover:bg-matepeak-secondary text-white rounded-full px-8 py-2 mt-2 shadow hover:shadow-md transition-all duration-300"
                disabled={submitting}
              >
                {submitting ? "Sending..." : "Send Message"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </section>
  );
};

export default GetInTouch;
