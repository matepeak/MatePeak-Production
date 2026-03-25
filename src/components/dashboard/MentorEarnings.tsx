import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/components/ui/sonner";
import { Loader2, Wallet, Landmark, CircleCheck, CircleX, Clock3 } from "lucide-react";
import {
  createWithdrawalRequest,
  getMentorEarningsSnapshot,
  maskAccountNumber,
  MIN_WITHDRAWAL_AMOUNT,
  saveAndVerifyPayoutAccount,
  COMMISSION_RATE,
  calculateNetEarnings,
  calculateCommissionAmount,
  type EarningsSnapshot,
  type PayoutMethod,
  type VerificationStatus,
} from "@/services/mentorEarningsService";

interface MentorEarningsProps {
  mentorProfile: {
    id: string;
  };
}

const formatINR = (value: number) =>
  `₹${Number(value || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  })}`;

const BANK_OPTIONS = [
  "State Bank of India",
  "HDFC Bank",
  "ICICI Bank",
  "Axis Bank",
  "Kotak Mahindra Bank",
  "Punjab National Bank",
  "Bank of Baroda",
  "Canara Bank",
  "Union Bank of India",
  "IDFC FIRST Bank",
  "IndusInd Bank",
  "Yes Bank",
  "Federal Bank",
  "AU Small Finance Bank",
  "Indian Bank",
] as const;

const ACCOUNT_NUMBER_REGEX = /^\d{9,18}$/;
const IFSC_REGEX = /^[A-Z]{4}0[A-Z0-9]{6}$/;
const UPI_REGEX = /^[a-zA-Z0-9._-]{2,256}@[a-zA-Z]{2,64}$/;

const sanitizeVerificationMessage = (message?: string | null): string => {
  const raw = String(message || "").trim();
  if (!raw) return "";

  if (
    /access to requested resource not available|edge function returned a non-2xx status code|failed to send a request to the edge function|network request failed|razorpay credentials are not configured|missing razorpayx_account_number/i.test(
      raw
    )
  ) {
    return "Payout details are saved. Automatic verification is temporarily unavailable, but you can still request withdrawals for admin review.";
  }

  return raw;
};

const statusMeta: Record<
  VerificationStatus,
  { label: string; className: string; icon: React.ComponentType<{ className?: string }> }
> = {
  unverified: {
    label: "Unverified",
    className: "bg-gray-100 text-gray-700",
    icon: CircleX,
  },
  pending: {
    label: "Verifying",
    className: "bg-amber-100 text-amber-700",
    icon: Clock3,
  },
  verified: {
    label: "Verified",
    className: "bg-green-100 text-green-700",
    icon: CircleCheck,
  },
  failed: {
    label: "Verification Failed",
    className: "bg-red-100 text-red-700",
    icon: CircleX,
  },
};

export default function MentorEarnings({ mentorProfile }: MentorEarningsProps) {
  const [loading, setLoading] = useState(true);
  const [savingDetails, setSavingDetails] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [snapshot, setSnapshot] = useState<EarningsSnapshot | null>(null);

  const [method, setMethod] = useState<PayoutMethod>("bank");
  const [accountHolderName, setAccountHolderName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [ifscCode, setIfscCode] = useState("");
  const [bankName, setBankName] = useState("");
  const [upiId, setUpiId] = useState("");
  const [withdrawalAmount, setWithdrawalAmount] = useState("");
  const [accountNumberError, setAccountNumberError] = useState<string | null>(null);
  const [ifscError, setIfscError] = useState<string | null>(null);
  const [ifscBranch, setIfscBranch] = useState<string | null>(null);
  const [ifscLookupLoading, setIfscLookupLoading] = useState(false);

  const loadSnapshot = async () => {
    setLoading(true);
    const result = await getMentorEarningsSnapshot(mentorProfile.id);
    if (!result.success || !result.data) {
      toast({
        title: "Failed to load earnings",
        description: result.error || "Please try again.",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    const data = result.data;
    setSnapshot(data);

    if (data.payoutAccount) {
      setMethod(data.payoutAccount.payout_method);
      setAccountHolderName(data.payoutAccount.account_holder_name || "");
      setAccountNumber(data.payoutAccount.account_number || "");
      setIfscCode(data.payoutAccount.ifsc_code || "");
      setBankName(data.payoutAccount.bank_name || "");
      setUpiId(data.payoutAccount.upi_id || "");
    }

    setLoading(false);
  };

  useEffect(() => {
    loadSnapshot();
  }, [mentorProfile.id]);

  useEffect(() => {
    if (method !== "bank") {
      setIfscError(null);
      setIfscBranch(null);
      setIfscLookupLoading(false);
      return;
    }

    const normalized = ifscCode.trim().toUpperCase();

    if (!normalized) {
      setIfscError(null);
      setIfscBranch(null);
      setIfscLookupLoading(false);
      return;
    }

    if (!IFSC_REGEX.test(normalized)) {
      setIfscError("Invalid IFSC format (example: HDFC0001234)");
      setIfscBranch(null);
      setIfscLookupLoading(false);
      return;
    }

    setIfscError(null);
    const controller = new AbortController();
    const timeoutId = window.setTimeout(async () => {
      try {
        setIfscLookupLoading(true);
        const response = await fetch(`https://ifsc.razorpay.com/${normalized}`, {
          signal: controller.signal,
        });

        if (!response.ok) {
          setIfscBranch(null);
          setIfscError("IFSC not found");
          return;
        }

        const result = await response.json();
        const branch = [result?.BANK, result?.BRANCH].filter(Boolean).join(" - ");
        setIfscBranch(branch || "Branch details available");
        setIfscError(null);
      } catch (error: any) {
        if (error?.name === "AbortError") return;
        setIfscBranch(null);
        setIfscError("Unable to fetch IFSC branch right now");
      } finally {
        setIfscLookupLoading(false);
      }
    }, 450);

    return () => {
      controller.abort();
      window.clearTimeout(timeoutId);
    };
  }, [ifscCode, method]);

  const wallet = snapshot?.wallet || {
    balance: 0,
    total_earned: 0,
    total_withdrawn: 0,
  };

  const verificationStatus = snapshot?.payoutAccount?.verification_status || "unverified";
  const verification = statusMeta[verificationStatus];
  const VerificationIcon = verification.icon;

  const hasPayoutDetails = useMemo(() => {
    const account = snapshot?.payoutAccount;
    if (!account) return false;

    if (account.payout_method === "bank") {
      return Boolean(account.account_holder_name && account.account_number && account.ifsc_code);
    }

    return Boolean(account.upi_id);
  }, [snapshot?.payoutAccount]);

  const canRequestWithdrawal = useMemo(() => {
    return wallet.balance >= MIN_WITHDRAWAL_AMOUNT && hasPayoutDetails;
  }, [wallet.balance, hasPayoutDetails]);

  const validatePayoutFields = () => {
    if (method === "bank") {
      if (!accountHolderName.trim()) return "Account holder name is required";
      if (!accountNumber.trim()) return "Account number is required";
      if (!ACCOUNT_NUMBER_REGEX.test(accountNumber.trim())) {
        return "Account number must be 9 to 18 digits";
      }
      if (!ifscCode.trim()) return "IFSC code is required";
      if (!IFSC_REGEX.test(ifscCode.trim().toUpperCase())) {
        return "Invalid IFSC format";
      }
      if (ifscError) {
        return "Please enter a valid IFSC code";
      }
      if (!bankName.trim()) return "Bank name is required";
      return null;
    }

    if (!upiId.trim()) return "UPI ID is required";
    if (!UPI_REGEX.test(upiId.trim())) {
      return "Invalid UPI ID format (example: name@upi)";
    }
    return null;
  };

  const handleSaveAndVerify = async () => {
    const validationError = validatePayoutFields();
    if (validationError) {
      toast({
        title: "Invalid payout details",
        description: validationError,
        variant: "destructive",
      });
      return;
    }

    setSavingDetails(true);

    const result = await saveAndVerifyPayoutAccount({
      mentorId: mentorProfile.id,
      payoutMethod: method,
      accountHolderName,
      accountNumber,
      ifscCode,
      bankName,
      upiId,
    });

    if (!result.success) {
      toast({
        title: "Could not save details",
        description: result.message,
        variant: "destructive",
      });
      setSavingDetails(false);
      return;
    }

    // Always show success variant when save operation succeeds
    const toastTitle = result.verified 
      ? "Account details verified successfully" 
      : "Account details saved successfully";
    
    toast({
      title: toastTitle,
      description: result.message,
      variant: "default",
    });

    await loadSnapshot();
    setSavingDetails(false);
  };

  const handleRequestWithdrawal = async () => {
    const amount = Number(withdrawalAmount);

    if (!Number.isFinite(amount) || amount < MIN_WITHDRAWAL_AMOUNT) {
      toast({
        title: "Invalid amount",
        description: `Minimum withdrawal amount is ₹${MIN_WITHDRAWAL_AMOUNT}`,
        variant: "destructive",
      });
      return;
    }

    if (amount > wallet.balance) {
      toast({
        title: "Insufficient balance",
        description: "Entered amount exceeds your available balance.",
        variant: "destructive",
      });
      return;
    }

    if (!hasPayoutDetails) {
      toast({
        title: "Payout details required",
        description: "Please save payout details before requesting withdrawal.",
        variant: "destructive",
      });
      return;
    }

    setRequesting(true);
    const result = await createWithdrawalRequest(amount);

    if (!result.success) {
      toast({
        title: "Withdrawal request failed",
        description: result.message,
        variant: "destructive",
      });
      setRequesting(false);
      return;
    }

    toast({
      title: "Withdrawal requested",
      description: result.message,
    });

    setWithdrawalAmount("");
    await loadSnapshot();
    setRequesting(false);
  };

  if (loading) {
    return (
      <div className="min-h-[320px] flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-gray-600" />
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-6xl">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-gray-100 rounded-2xl border-0 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-gray-600">Available Balance</p>
              <Wallet className="h-4 w-4 text-rose-400" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{formatINR(wallet.balance)}</p>
            <p className="text-xs text-gray-500 mt-2">Ready to withdraw</p>
          </CardContent>
        </Card>

        <Card className="bg-gray-100 rounded-2xl border-0 shadow-sm">
          <CardContent className="p-6">
            <p className="text-sm font-medium text-gray-600 mb-2">Total Withdrawn</p>
            <p className="text-2xl font-bold text-gray-900">{formatINR(wallet.total_withdrawn)}</p>
            <p className="text-xs text-gray-500 mt-2">Lifetime amount</p>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-gray-100 rounded-2xl border-0 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-[30px] leading-tight tracking-tight text-gray-900">Earnings Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl px-4 py-4 border border-gray-100">
              <p className="text-xs text-gray-600 font-semibold uppercase">Gross Earnings</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{formatINR(wallet.total_earned)}</p>
              <p className="text-xs text-gray-500 mt-1">Total booking revenue</p>
            </div>

            <div className="bg-white rounded-xl px-4 py-4 border border-gray-100">
              <p className="text-xs text-gray-600 font-semibold uppercase">Platform Commission</p>
              <p className="text-2xl font-bold text-orange-600 mt-1">{formatINR(calculateCommissionAmount(wallet.total_earned))}</p>
              <p className="text-xs text-gray-500 mt-1">{(COMMISSION_RATE * 100).toFixed(0)}% deducted</p>
            </div>

            <div className="bg-white rounded-xl px-4 py-4 border border-gray-100">
              <p className="text-xs text-gray-600 font-semibold uppercase">Net Earnings</p>
              <p className="text-2xl font-bold text-green-600 mt-1">{formatINR(calculateNetEarnings(wallet.total_earned))}</p>
              <p className="text-xs text-gray-500 mt-1">After commission</p>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 mt-2 border border-gray-100">
            <p className="text-sm text-blue-900">
              <span className="font-semibold">How it works:</span> When a session is successfully booked and paid, MatePeak retains {(COMMISSION_RATE * 100).toFixed(0)}% as platform commission. Your net earnings (after commission) are credited to your available balance.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gray-100 rounded-2xl border-0 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-[30px] leading-tight tracking-tight text-gray-900">Payout Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="text-sm text-gray-600">Withdrawal is available only after balance reaches ₹{MIN_WITHDRAWAL_AMOUNT}</div>
            <Badge className={`${verification.className} rounded-full px-3 py-1`}>
              <VerificationIcon className="h-3.5 w-3.5 mr-1" />
              {verification.label}
            </Badge>
          </div>

          {!!snapshot?.payoutAccount?.verification_message && (
            <p className="text-sm text-gray-600">{sanitizeVerificationMessage(snapshot.payoutAccount.verification_message)}</p>
          )}

          <Tabs value={method} onValueChange={(value) => setMethod(value as PayoutMethod)}>
            <TabsList className="grid w-full max-w-md grid-cols-2 bg-white border border-gray-200 rounded-xl p-1">
              <TabsTrigger value="bank" className="rounded-lg data-[state=active]:bg-gray-900 data-[state=active]:text-white">Bank Transfer</TabsTrigger>
              <TabsTrigger value="upi" className="rounded-lg data-[state=active]:bg-gray-900 data-[state=active]:text-white">UPI</TabsTrigger>
            </TabsList>

            <TabsContent value="bank" className="space-y-4 pt-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="accountHolderName">Account Holder Name</Label>
                  <Input
                    id="accountHolderName"
                    value={accountHolderName}
                    onChange={(e) => setAccountHolderName(e.target.value)}
                    placeholder="Enter account holder name"
                    className="h-11 rounded-xl border-gray-300 bg-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bankName">Bank Name</Label>
                  <Select value={bankName} onValueChange={setBankName}>
                    <SelectTrigger id="bankName" className="h-11 rounded-xl border-gray-300 bg-white">
                      <SelectValue placeholder="Select bank" />
                    </SelectTrigger>
                    <SelectContent>
                      {BANK_OPTIONS.map((bank) => (
                        <SelectItem key={bank} value={bank}>
                          {bank}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="accountNumber">Account Number</Label>
                  <Input
                    id="accountNumber"
                    value={accountNumber}
                    onChange={(e) => {
                      const next = e.target.value.replace(/\D/g, "");
                      setAccountNumber(next);

                      if (!next) {
                        setAccountNumberError(null);
                        return;
                      }

                      setAccountNumberError(
                        ACCOUNT_NUMBER_REGEX.test(next)
                          ? null
                          : "Account number must be 9 to 18 digits"
                      );
                    }}
                    placeholder="Enter account number"
                    inputMode="numeric"
                    className="h-11 rounded-xl border-gray-300 bg-white"
                  />
                  {accountNumberError && (
                    <p className="text-xs text-red-600">{accountNumberError}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ifscCode">IFSC Code</Label>
                  <Input
                    id="ifscCode"
                    value={ifscCode}
                    onChange={(e) => setIfscCode(e.target.value.toUpperCase())}
                    placeholder="HDFC0000001"
                    className="h-11 rounded-xl border-gray-300 bg-white"
                  />
                  {ifscLookupLoading && (
                    <p className="text-xs text-gray-500">Looking up branch...</p>
                  )}
                  {!ifscLookupLoading && ifscBranch && (
                    <p className="text-xs text-gray-600">Branch: {ifscBranch}</p>
                  )}
                  {!!ifscError && <p className="text-xs text-red-600">{ifscError}</p>}
                </div>
              </div>

              {!!snapshot?.payoutAccount?.account_number && snapshot.payoutAccount.payout_method === "bank" && (
                <p className="text-xs text-gray-500">
                  Current account: {maskAccountNumber(snapshot.payoutAccount.account_number)}
                </p>
              )}
            </TabsContent>

            <TabsContent value="upi" className="space-y-4 pt-3">
              <div className="space-y-2 max-w-lg">
                <Label htmlFor="upiId">UPI ID</Label>
                <Input
                  id="upiId"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  placeholder="name@upi"
                  className="h-11 rounded-xl border-gray-300 bg-white"
                />
              </div>
            </TabsContent>
          </Tabs>

          <Button onClick={handleSaveAndVerify} disabled={savingDetails} className="min-w-44 h-11 rounded-xl bg-gray-900 hover:bg-gray-800 text-white">
            {savingDetails ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Landmark className="h-4 w-4 mr-2" />
                Save & Verify
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      <Card className="bg-gray-100 rounded-2xl border-0 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-[30px] leading-tight tracking-tight text-gray-900">Withdraw Funds</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-gray-600">
            Minimum withdrawal per request: ₹{MIN_WITHDRAWAL_AMOUNT}
          </div>
          {!canRequestWithdrawal && (
            <div className="text-sm text-red-600">
              {wallet.balance < MIN_WITHDRAWAL_AMOUNT
                ? `You need at least ₹${MIN_WITHDRAWAL_AMOUNT} balance to withdraw.`
                : "Save payout details before requesting withdrawal."}
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
            <div className="space-y-2 flex-1 max-w-xs">
              <Label htmlFor="withdrawAmount">Amount</Label>
              <Input
                id="withdrawAmount"
                type="number"
                min={MIN_WITHDRAWAL_AMOUNT}
                max={wallet.balance}
                value={withdrawalAmount}
                onChange={(e) => setWithdrawalAmount(e.target.value)}
                placeholder="Enter amount"
                className="h-11 rounded-xl border-gray-300 bg-white"
              />
            </div>
            <Button
              onClick={handleRequestWithdrawal}
              disabled={requesting || !canRequestWithdrawal}
              className="sm:min-w-44 h-11 rounded-xl bg-gray-900 hover:bg-gray-800 text-white"
            >
              {requesting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                "Request Withdrawal"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gray-100 rounded-2xl border-0 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-[30px] leading-tight tracking-tight text-gray-900">Recent Withdrawal Requests</CardTitle>
        </CardHeader>
        <CardContent>
          {snapshot?.withdrawals?.length ? (
            <div className="space-y-3">
              {snapshot.withdrawals.map((item) => (
                <div
                  key={item.id}
                  className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
                >
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{formatINR(item.amount)}</p>
                    <p className="text-xs text-gray-500">
                      Requested on {new Date(item.requested_at).toLocaleDateString("en-IN")}
                    </p>
                    {!!item.rejection_reason && (
                      <p className="text-xs text-red-600 mt-1">Reason: {item.rejection_reason}</p>
                    )}
                  </div>
                  <Badge
                    className={
                      item.status === "approved" || item.status === "completed"
                        ? "bg-green-100 text-green-700"
                        : item.status === "rejected"
                          ? "bg-red-100 text-red-700"
                          : "bg-amber-100 text-amber-700"
                    }
                  >
                    {item.status}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-600">No withdrawal requests yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
