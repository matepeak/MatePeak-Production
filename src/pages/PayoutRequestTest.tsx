import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import {
  addTestWalletCredit,
  getMentorPayouts,
  getMentorPayoutProfile,
  getMentorWalletSummary,
  getWithdrawalRequests,
  requestWithdrawal,
} from "@/services/mentorPayoutService";
import { toast } from "@/components/ui/sonner";

const PayoutRequestTest = () => {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [amount, setAmount] = useState("1");
  const [note, setNote] = useState("Payout flow integration test");
  const [wallet, setWallet] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [requests, setRequests] = useState<any[]>([]);
  const [payouts, setPayouts] = useState<any[]>([]);
  const [lastResult, setLastResult] = useState<any>(null);
  const [userEmail, setUserEmail] = useState<string>("");
  const [crediting, setCrediting] = useState(false);
  const [smokeTesting, setSmokeTesting] = useState(false);

  const amountNumber = useMemo(() => Number(amount || 0), [amount]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [{ data: authData }, walletData, profileData, requestData, payoutData] = await Promise.all([
        supabase.auth.getUser(),
        getMentorWalletSummary(),
        getMentorPayoutProfile(),
        getWithdrawalRequests(15),
        getMentorPayouts(15),
      ]);

      setUserEmail(authData.user?.email || "");
      setWallet(walletData);
      setProfile(profileData);
      setRequests(requestData || []);
      setPayouts(payoutData || []);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load payout test data";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSubmit = async () => {
    if (!amountNumber || amountNumber < 1) {
      toast.error("Minimum withdrawal amount in test mode is 1");
      return;
    }

    setSubmitting(true);
    try {
      const result = await requestWithdrawal(amountNumber, note.trim() || undefined, true);
      setLastResult(result);
      toast.success("Withdrawal request submitted");
      await loadData();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to submit withdrawal request";
      setLastResult({ success: false, error: message });
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddTestCredit = async () => {
    setCrediting(true);
    try {
      const result = await addTestWalletCredit();
      setLastResult(result);
      toast.success("Added INR 1 test credit to wallet");
      await loadData();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to add test wallet credit";
      setLastResult({ success: false, error: message });
      toast.error(message);
    } finally {
      setCrediting(false);
    }
  };

  const handleRunSmokeTest = async () => {
    setSmokeTesting(true);
    try {
      const creditResult = await addTestWalletCredit();
      const withdrawResult = await requestWithdrawal(1, `Smoke test ${new Date().toISOString()}`, true);
      setLastResult({
        success: true,
        action: "smoke_test",
        steps: {
          credit: creditResult,
          withdraw: withdrawResult,
        },
      });
      toast.success("INR 1 payout smoke test submitted");
      await loadData();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Smoke test failed";
      setLastResult({
        success: false,
        action: "smoke_test",
        error: message,
      });
      toast.error(message);
    } finally {
      setSmokeTesting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-semibold">Payout Request Test Console</h1>
            <p className="text-sm text-muted-foreground">
              Use this page to validate payment setup, wallet state, and withdrawal request behavior.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={loadData} disabled={loading || submitting}>
              Refresh
            </Button>
            <Button
              variant="outline"
              onClick={handleAddTestCredit}
              disabled={loading || submitting || crediting || !userEmail}
            >
              {crediting ? "Adding..." : "Add INR 1 Test Credit"}
            </Button>
            <Button
              onClick={handleRunSmokeTest}
              disabled={loading || submitting || crediting || smokeTesting || !userEmail}
            >
              {smokeTesting ? "Running..." : "Run INR 1 Smoke Test"}
            </Button>
            <Button asChild variant="secondary">
              <Link to="/mentor/dashboard">Back to Mentor Dashboard</Link>
            </Button>
          </div>
        </div>

        {!userEmail ? (
          <Alert>
            <AlertDescription>
              You are not signed in. Sign in as a mentor before running payout tests.
            </AlertDescription>
          </Alert>
        ) : (
          <Alert>
            <AlertDescription>
              Signed in as <span className="font-medium">{userEmail}</span>
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Wallet Snapshot</CardTitle>
              <CardDescription>Current values from mentor wallet summary API.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {loading ? (
                <p className="text-muted-foreground">Loading...</p>
              ) : (
                <>
                  <p>Balance: <span className="font-medium">INR {Number(wallet?.balance || 0).toFixed(2)}</span></p>
                  <p>Total Earned: <span className="font-medium">INR {Number(wallet?.totalEarned || 0).toFixed(2)}</span></p>
                  <p>Total Withdrawn: <span className="font-medium">INR {Number(wallet?.totalWithdrawn || 0).toFixed(2)}</span></p>
                  <p>Pending Withdrawal: <span className="font-medium">INR {Number(wallet?.pendingWithdrawal || 0).toFixed(2)}</span></p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Payment Profile</CardTitle>
              <CardDescription>Detected mentor payout/payment profile.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {loading ? (
                <p className="text-muted-foreground">Loading...</p>
              ) : profile ? (
                <>
                  <p>Method: <span className="font-medium">{profile.payout_method || "-"}</span></p>
                  <p>Currency: <span className="font-medium">{profile.currency || "INR"}</span></p>
                  <p>KYC: <span className="font-medium">{profile.kyc_status || "unknown"}</span></p>
                  <p>Account Holder: <span className="font-medium">{profile.account_holder_name || "-"}</span></p>
                  <p>UPI ID: <span className="font-medium">{profile.upi_id || "-"}</span></p>
                </>
              ) : (
                <p className="text-muted-foreground">No payment profile found. Complete Payments setup first.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Submit Test Request</CardTitle>
              <CardDescription>Calls the wallet-withdraw Edge Function directly.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Amount (INR)</Label>
                <Input
                  id="amount"
                  type="number"
                  min={1}
                  step="1"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  disabled={submitting}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="note">Note</Label>
                <Textarea
                  id="note"
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  disabled={submitting}
                  rows={3}
                />
              </div>
              <Button onClick={handleSubmit} disabled={submitting || loading || !userEmail} className="w-full">
                {submitting ? "Submitting..." : "Submit Payout Test Request"}
              </Button>
              <p className="text-xs text-muted-foreground">
                Test mode is enabled on this page. You can add INR 1 credit and submit INR 1 withdrawals.
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Last Request Result</CardTitle>
            <CardDescription>Raw response from payout request function.</CardDescription>
          </CardHeader>
          <CardContent>
            {lastResult ? (
              <pre className="text-xs bg-muted p-3 rounded-md overflow-auto">
                {JSON.stringify(lastResult, null, 2)}
              </pre>
            ) : (
              <p className="text-sm text-muted-foreground">No request submitted in this session.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Withdrawal Requests</CardTitle>
            <CardDescription>Latest requests from withdrawal_requests table.</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : requests.length === 0 ? (
              <p className="text-sm text-muted-foreground">No withdrawal requests found.</p>
            ) : (
              <div className="space-y-2">
                {requests.map((item) => (
                  <div key={item.id} className="border rounded-md p-3 text-sm flex items-center justify-between gap-4 flex-wrap">
                    <div className="space-y-1">
                      <p className="font-medium">{item.id}</p>
                      <p className="text-muted-foreground">Requested: {new Date(item.requested_at).toLocaleString()}</p>
                      <p>Amount: INR {Number(item.amount || 0).toFixed(2)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{item.status}</Badge>
                      {item.transaction_id ? <Badge>{item.transaction_id}</Badge> : null}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Payout Logs</CardTitle>
            <CardDescription>
              Compact provider-side payout status and failure reasons for quick debugging.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : payouts.length === 0 ? (
              <p className="text-sm text-muted-foreground">No payout logs yet.</p>
            ) : (
              <div className="space-y-2">
                {payouts.map((item) => (
                  <div key={item.id} className="border rounded-md p-3 text-sm space-y-1">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <p className="font-medium">{item.id}</p>
                      <Badge variant={item.status === "success" ? "default" : "outline"}>{item.status}</Badge>
                    </div>
                    <p className="text-muted-foreground">Created: {new Date(item.created_at).toLocaleString()}</p>
                    <p>Amount: INR {Number(item.amount || 0).toFixed(2)}</p>
                    <p>Provider Payout ID: {item.provider_payout_id || "-"}</p>
                    <p className="text-red-600">Error: {item.failure_reason || "-"}</p>
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

export default PayoutRequestTest;
