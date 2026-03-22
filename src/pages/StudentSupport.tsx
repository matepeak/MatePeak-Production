import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, Headphones, HelpCircle, LifeBuoy, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

const SUPPORT_TOPICS = [
  "Booking issue",
  "Payment issue",
  "Mentor communication",
  "Account and login",
  "Technical issue",
  "Other",
] as const;

export default function StudentSupport() {
  const navigate = useNavigate();
  const location = useLocation();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [topic, setTopic] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const preloadProfile = async () => {
      const { data } = await supabase.auth.getUser();
      const user = data.user;
      if (!user) {
        navigate("/student/login");
        return;
      }

      setEmail(user.email || "");
      const fullName = user.user_metadata?.full_name || user.user_metadata?.name || "";
      setName(fullName);
    };

    preloadProfile();
  }, [navigate]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!name.trim() || !email.trim() || !topic || !subject.trim() || !message.trim()) {
      toast.error("Please complete all required fields.");
      return;
    }

    try {
      setSubmitting(true);
      const { data, error } = await supabase.functions.invoke(
        "submit-support-request",
        {
          body: {
            name,
            email,
            topic,
            subject,
            message,
          },
        }
      );

      if (error || !data?.success) {
        throw new Error(
          error?.message || data?.message || "Failed to submit support request"
        );
      }

      toast.success("Support request submitted. Our team will reach out soon.");
      setSubject("");
      setMessage("");
      setTopic("");
    } catch {
      toast.error("Unable to submit your request. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8 md:px-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <Button
          variant="ghost"
          className="h-10 px-2 text-sm text-gray-700 hover:text-gray-900"
          onClick={() =>
            navigate(
              location.pathname.startsWith("/mentor")
                ? "/mentor/dashboard"
                : "/student/dashboard"
            )
          }
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>

        <Card className="border-gray-200 shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-rose-50 p-2">
                <Headphones className="h-5 w-5 text-rose-500" />
              </div>
              <div>
                <CardTitle className="text-2xl">Student Support</CardTitle>
                <CardDescription>
                  Share your issue and our team will help you quickly.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="support-name">Full Name</Label>
                  <Input
                    id="support-name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Your full name"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="support-email">Email</Label>
                  <Input
                    id="support-email"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="you@example.com"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Topic</Label>
                  <Select value={topic} onValueChange={setTopic}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a topic" />
                    </SelectTrigger>
                    <SelectContent>
                      {SUPPORT_TOPICS.map((item) => (
                        <SelectItem key={item} value={item}>
                          {item}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="support-subject">Subject</Label>
                  <Input
                    id="support-subject"
                    value={subject}
                    onChange={(event) => setSubject(event.target.value)}
                    placeholder="Short summary"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="support-message">Message</Label>
                <Textarea
                  id="support-message"
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  placeholder="Please include booking ID, mentor name, and what happened."
                  className="h-40 resize-none"
                  required
                />
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Button type="submit" disabled={submitting} className="min-w-[160px]">
                  {submitting ? "Submitting..." : "Submit Request"}
                </Button>
                <p className="text-sm text-gray-600">
                  Need urgent help? Email support@matepeak.com
                </p>
              </div>
            </form>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Card className="border-gray-200">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-gray-900 font-medium">
                <HelpCircle className="h-4 w-4 text-rose-500" />
                Typical response
              </div>
              <p className="mt-2 text-sm text-gray-600">Within 24 hours on business days.</p>
            </CardContent>
          </Card>
          <Card className="border-gray-200">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-gray-900 font-medium">
                <LifeBuoy className="h-4 w-4 text-rose-500" />
                Best details to include
              </div>
              <p className="mt-2 text-sm text-gray-600">Booking ID and timeline of events.</p>
            </CardContent>
          </Card>
          <Card className="border-gray-200">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-gray-900 font-medium">
                <Mail className="h-4 w-4 text-rose-500" />
                Contact channel
              </div>
              <p className="mt-2 text-sm text-gray-600">Email updates are sent to the address you provide.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
