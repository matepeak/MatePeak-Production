import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const PhoneOtpTest = () => {
  const [phone, setPhone] = useState("+91");
  const [otp, setOtp] = useState("");
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [resendSeconds, setResendSeconds] = useState(0);
  const [result, setResult] = useState<any>(null);
  const [logs, setLogs] = useState<Array<{ at: string; action: string; success: boolean; message: string }>>([]);

  useEffect(() => {
    if (resendSeconds <= 0) return;

    const timer = window.setInterval(() => {
      setResendSeconds((prev) => {
        if (prev <= 1) {
          window.clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [resendSeconds]);

  const appendLog = (action: string, success: boolean, message: string) => {
    setLogs((prev) => [
      {
        at: new Date().toLocaleString(),
        action,
        success,
        message,
      },
      ...prev,
    ]);
  };

  const extractFunctionErrorDetails = async (error: any, fallback: string) => {
    let payload: any = null;
    const context = error?.context;
    if (context && typeof context.json === "function") {
      try {
        payload = await context.json();
        const message = String(payload?.message || payload?.error || "").trim();
        if (message) {
          return {
            message,
            payload,
          };
        }
      } catch {
        // Ignore parsing issues and fallback to generic error message.
      }
    }

    return {
      message: error?.message || fallback,
      payload,
    };
  };

  const sendOtp = async () => {
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("phone-otp", {
        body: {
          action: "send",
          phone: phone.trim(),
        },
      });

      if (error) {
        throw error;
      }

      setResult(data);
      appendLog("send", Boolean(data?.success), data?.message || "Send OTP completed");

      if (data?.success) {
        if (Number(data?.resend_available_in_seconds || 0) > 0) {
          setResendSeconds(Number(data.resend_available_in_seconds));
        }
        toast.success("OTP sent");
      } else {
        toast.error(data?.message || "Failed to send OTP");
      }
    } catch (error: any) {
      const details = await extractFunctionErrorDetails(error, "Failed to send OTP");
      const message = details.message;
      const retryAfter = Number(details?.payload?.retry_after_seconds || 0);
      if (retryAfter > 0) {
        setResendSeconds(retryAfter);
      }

      setResult({ success: false, action: "send", error: message });
      appendLog("send", false, message);
      toast.error(message);
    } finally {
      setSending(false);
    }
  };

  const verifyOtp = async () => {
    setVerifying(true);
    try {
      const { data, error } = await supabase.functions.invoke("phone-otp", {
        body: {
          action: "verify",
          phone: phone.trim(),
          otp: otp.trim(),
        },
      });

      if (error) {
        throw error;
      }

      setResult(data);
      appendLog("verify", Boolean(data?.success), data?.message || "Verify OTP completed");

      if (data?.success) {
        toast.success("Phone verified");
      } else {
        toast.error(data?.message || "Verification failed");
      }
    } catch (error: any) {
      const details = await extractFunctionErrorDetails(error, "Failed to verify OTP");
      const message = details.message;
      setResult({ success: false, action: "verify", error: message });
      appendLog("verify", false, message);
      toast.error(message);
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-semibold">Phone OTP Test Console</h1>
            <p className="text-sm text-muted-foreground">
              Send and verify OTP using Twilio Verify via Supabase Edge Function.
            </p>
          </div>
          <Button asChild variant="secondary">
            <Link to="/">Back to Home</Link>
          </Button>
        </div>

        <Alert>
          <AlertDescription>
            Enter a phone number in E.164 format (example: +919876543210). In trial mode, Twilio may only send OTP to verified recipient numbers.
          </AlertDescription>
        </Alert>

        <Card>
          <CardHeader>
            <CardTitle>OTP Actions</CardTitle>
            <CardDescription>Use send first, then verify using the received OTP.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number (E.164)</Label>
              <Input
                id="phone"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="+919876543210"
                disabled={sending || verifying}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="otp">OTP</Label>
              <Input
                id="otp"
                value={otp}
                onChange={(event) => setOtp(event.target.value)}
                placeholder="Enter OTP"
                disabled={sending || verifying}
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <Button onClick={sendOtp} disabled={sending || verifying || resendSeconds > 0}>
                {sending ? "Sending..." : resendSeconds > 0 ? `Resend in ${resendSeconds}s` : "Send OTP"}
              </Button>
              <Button onClick={verifyOtp} disabled={verifying || sending || !otp.trim()}>
                {verifying ? "Verifying..." : "Verify OTP"}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Constraints: 60s resend cooldown, max 2 OTP sends per 30-minute window, and lockout after 2 failed verify attempts.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Latest Result</CardTitle>
          </CardHeader>
          <CardContent>
            {result ? (
              <pre className="text-xs bg-muted p-3 rounded-md overflow-auto">{JSON.stringify(result, null, 2)}</pre>
            ) : (
              <p className="text-sm text-muted-foreground">No API response yet.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Logs</CardTitle>
            <CardDescription>Brief execution logs to speed up debugging.</CardDescription>
          </CardHeader>
          <CardContent>
            {logs.length === 0 ? (
              <p className="text-sm text-muted-foreground">No logs yet.</p>
            ) : (
              <div className="space-y-2">
                {logs.map((item, index) => (
                  <div key={`${item.at}-${index}`} className="border rounded-md p-3 text-sm flex items-center justify-between gap-3 flex-wrap">
                    <div className="space-y-1">
                      <p className="font-medium">{item.action.toUpperCase()}</p>
                      <p className="text-muted-foreground">{item.at}</p>
                      <p>{item.message}</p>
                    </div>
                    <Badge variant={item.success ? "default" : "destructive"}>{item.success ? "OK" : "FAILED"}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PhoneOtpTest;
