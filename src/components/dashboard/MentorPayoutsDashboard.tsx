import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "@/components/ui/sonner";
import {
  getMentorWalletSummary,
  getMentorEarnings,
  getMentorPayouts,
  getWithdrawalRequests,
  requestWithdrawal,
} from "@/services/mentorPayoutService";
import { Building2, IndianRupee, Info, Loader2, Wallet } from "lucide-react";

const PLATFORM_DEDUCTION_PERCENT = 10;
const MENTOR_PAYOUT_PERCENT = 100 - PLATFORM_DEDUCTION_PERCENT;

const formatINR = (amount: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(amount || 0));

const getPayoutAmount = (earning: any) => {
  const net = Number(earning?.net_amount ?? 0);
  if (net > 0) return net;

  const gross = Number(earning?.gross_amount ?? 0);
  const fallbackNet = (gross * MENTOR_PAYOUT_PERCENT) / 100;
  return Number(fallbackNet.toFixed(2));
};

const formatServiceTypeLabel = (value: string) => {
  const labels: Record<string, string> = {
    oneOnOneSession: "1-on-1 Session",
    priorityDm: "Priority DM",
    digitalProducts: "Digital Product",
  };

  if (labels[value]) return labels[value];

  const normalized = value
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .trim();

  if (!normalized) return "Service";

  return normalized
    .split(" ")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
};

const MentorPayoutsDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [withdrawing, setWithdrawing] = useState(false);

  const [wallet, setWallet] = useState({
    balance: 0,
    totalEarned: 0,
    totalWithdrawn: 0,
    pendingWithdrawal: 0,
  });
  const [earnings, setEarnings] = useState<any[]>([]);
  const [payouts, setPayouts] = useState<any[]>([]);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);

  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawNote, setWithdrawNote] = useState("");

  const lifetimeEarnings = useMemo(() => wallet.totalEarned, [wallet.totalEarned]);
  const totalNetPayoutInSummary = useMemo(
    () => earnings.reduce((sum, row) => sum + getPayoutAmount(row), 0),
    [earnings],
  );

  const loadData = async () => {
    try {
      setLoading(true);
      const [walletSummary, earningRows, payoutRows, withdrawalRows] = await Promise.all([
        getMentorWalletSummary(),
        getMentorEarnings(100),
        getMentorPayouts(100),
        getWithdrawalRequests(100),
      ]);

      setWallet(walletSummary);
      setEarnings(earningRows);
      setPayouts(payoutRows);
      setWithdrawals(withdrawalRows);
    } catch (error) {
      console.error("Failed to load payout dashboard", error);
      toast.error("Failed to load payouts", {
        description: "Please refresh the page.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submitWithdrawal = async () => {
    const amount = Number(withdrawAmount);
    if (!amount || amount <= 0) {
      toast.error("Invalid amount", {
        description: "Enter a valid withdrawal amount.",
      });
      return;
    }

    try {
      setWithdrawing(true);
      const response = await requestWithdrawal(amount, withdrawNote);
      toast.success("Withdrawal submitted", {
        description: response?.message || "Your payout request is being processed.",
      });
      setWithdrawAmount("");
      setWithdrawNote("");
      await loadData();
    } catch (error: any) {
      toast.error("Withdrawal failed", {
        description: error?.message || "Please try again.",
      });
    } finally {
      setWithdrawing(false);
    }
  };

  return (
    <TooltipProvider>
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Payouts</h1>
        <div className="inline-flex items-center gap-2 border rounded-full bg-white px-3.5 py-1.5">
          <Building2 className="h-4 w-4 text-gray-700" />
          <span className="text-xs font-semibold text-emerald-700">Payout via Indian Bank Connected</span>
        </div>
      </div>

      <Card className="rounded-2xl border-gray-200 shadow-sm">
        <CardContent className="p-5">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="rounded-xl bg-stone-100 p-5 border border-gray-200">
              <p className="text-sm text-gray-600 font-semibold">Balance</p>
              <p className="text-3xl font-bold mt-2 text-gray-900">{formatINR(wallet.balance)}</p>
            </div>
            <div className="rounded-xl border border-gray-200 p-5">
              <p className="text-sm text-gray-600 font-semibold">Lifetime earnings</p>
              <p className="text-3xl font-bold mt-2 text-gray-900">{formatINR(lifetimeEarnings)}</p>
            </div>
            <div className="rounded-xl border border-gray-200 p-5">
              <div className="flex items-center gap-2">
                <p className="text-sm text-gray-600 font-semibold">Pending payout</p>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      className="inline-flex items-center text-gray-500 hover:text-gray-700"
                      aria-label="Payout info"
                    >
                      <Info className="h-4 w-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    This payout amount is shown after {PLATFORM_DEDUCTION_PERCENT}% platform deduction (mentor receives {MENTOR_PAYOUT_PERCENT}%).
                  </TooltipContent>
                </Tooltip>
              </div>
              <p className="text-3xl font-bold mt-2 text-gray-900">{formatINR(wallet.pendingWithdrawal)}</p>
            </div>
            <div className="rounded-xl border border-gray-200 p-5">
              <p className="text-sm text-gray-600 font-semibold">In withdrawal</p>
              <p className="text-3xl font-bold mt-2 text-gray-900">{formatINR(wallet.totalWithdrawn)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-gray-200 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl font-bold tracking-tight">
            <Wallet className="h-5 w-5" />
            Request Withdrawal
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Input
              placeholder="Amount (INR)"
              value={withdrawAmount}
              onChange={(e) => setWithdrawAmount(e.target.value)}
            />
            <Input
              placeholder="Optional note"
              value={withdrawNote}
              onChange={(e) => setWithdrawNote(e.target.value)}
            />
            <Button onClick={submitWithdrawal} disabled={withdrawing} className="h-11 text-sm font-semibold">
              {withdrawing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <IndianRupee className="h-4 w-4 mr-2" />}
              Withdraw
            </Button>
          </div>
          <p className="text-sm text-gray-500 mt-2">Minimum withdrawal is Rs. 500.</p>
        </CardContent>
      </Card>

      <Tabs defaultValue="summary" className="space-y-4">
        <TabsList className="bg-gray-100 rounded-lg p-1">
          <TabsTrigger value="summary">Summary</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="withdrawals">Withdrawals</TabsTrigger>
          <TabsTrigger value="incentives">Incentives</TabsTrigger>
        </TabsList>

        <TabsContent value="summary">
          <Card>
            <CardContent className="p-0 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold">Name</th>
                    <th className="text-left px-4 py-3 font-semibold">Type</th>
                    <th className="text-left px-4 py-3 font-semibold">Count</th>
                    <th className="text-left px-4 py-3 font-semibold">
                      <div className="flex items-center gap-2">
                        <span>Earnings</span>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              className="inline-flex items-center text-gray-500 hover:text-gray-700"
                              aria-label="Earnings payout info"
                            >
                              <Info className="h-4 w-4" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            Earnings here are mentor payout amounts after {PLATFORM_DEDUCTION_PERCENT}% deduction.
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b">
                    <td className="px-4 py-3">Mentoring Sessions</td>
                    <td className="px-4 py-3">{formatServiceTypeLabel("oneOnOneSession")}</td>
                    <td className="px-4 py-3">{earnings.length}</td>
                    <td className="px-4 py-3">{formatINR(totalNetPayoutInSummary)}</td>
                  </tr>
                  {earnings.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-4 py-10 text-center text-gray-500">No data</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transactions">
          <Card>
            <CardContent className="p-0 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold">Date</th>
                    <th className="text-left px-4 py-3 font-semibold">Booking</th>
                    <th className="text-left px-4 py-3 font-semibold">Gross</th>
                    <th className="text-left px-4 py-3 font-semibold">Fee</th>
                    <th className="text-left px-4 py-3 font-semibold">
                      <div className="flex items-center gap-2">
                        <span>Payout (After {PLATFORM_DEDUCTION_PERCENT}% Deduction)</span>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              className="inline-flex items-center text-gray-500 hover:text-gray-700"
                              aria-label="Payout deduction info"
                            >
                              <Info className="h-4 w-4" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            Mentor payout is calculated as gross amount minus {PLATFORM_DEDUCTION_PERCENT}% platform fee.
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    </th>
                    <th className="text-left px-4 py-3 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {earnings.map((item) => (
                    <tr key={item.id} className="border-b">
                      <td className="px-4 py-3">{new Date(item.created_at).toLocaleString()}</td>
                      <td className="px-4 py-3">{item.booking_id}</td>
                      <td className="px-4 py-3">{formatINR(item.gross_amount)}</td>
                      <td className="px-4 py-3">{formatINR(item.platform_fee)}</td>
                      <td className="px-4 py-3">{formatINR(getPayoutAmount(item))}</td>
                      <td className="px-4 py-3">
                        <Badge variant="outline">{item.status}</Badge>
                      </td>
                    </tr>
                  ))}
                  {earnings.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-10 text-center text-gray-500">No transactions yet</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="withdrawals">
          <Card>
            <CardContent className="p-0 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold">Requested</th>
                    <th className="text-left px-4 py-3 font-semibold">Amount</th>
                    <th className="text-left px-4 py-3 font-semibold">Status</th>
                    <th className="text-left px-4 py-3 font-semibold">Transaction</th>
                    <th className="text-left px-4 py-3 font-semibold">Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {withdrawals.map((item) => (
                    <tr key={item.id} className="border-b">
                      <td className="px-4 py-3">{new Date(item.requested_at).toLocaleString()}</td>
                      <td className="px-4 py-3">{formatINR(item.amount)}</td>
                      <td className="px-4 py-3">
                        <Badge variant={item.status === "completed" ? "default" : "outline"}>{item.status}</Badge>
                      </td>
                      <td className="px-4 py-3">{item.transaction_id || "-"}</td>
                      <td className="px-4 py-3">{item.rejection_reason || "-"}</td>
                    </tr>
                  ))}
                  {withdrawals.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-10 text-center text-gray-500">No withdrawals yet</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="incentives">
          <Card>
            <CardContent className="py-10 text-center text-gray-500">
              Incentive payouts will appear here when campaign-based bonuses are enabled.
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {loading && (
        <div className="fixed inset-0 bg-white/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="rounded-xl border bg-white px-4 py-3 flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm font-medium">Loading payments...</span>
          </div>
        </div>
      )}
    </div>
    </TooltipProvider>
  );
};

export default MentorPayoutsDashboard;
