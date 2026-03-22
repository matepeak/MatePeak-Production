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
import { useToast } from "@/hooks/use-toast";
import { Loader2, Wallet, Landmark, CircleCheck, CircleX, Clock3 } from "lucide-react";
import {
  createWithdrawalRequest,
  getMentorEarningsSnapshot,
  maskAccountNumber,
  MIN_WITHDRAWAL_AMOUNT,
  saveAndVerifyPayoutAccount,
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
  const { toast } = useToast();
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

  const canRequestWithdrawal = useMemo(() => {
    return wallet.balance >= MIN_WITHDRAWAL_AMOUNT && verificationStatus === "verified";
  }, [wallet.balance, verificationStatus]);

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

    toast({
      title: result.verified ? "Bank details verified" : "Details saved as unverified",
      description: result.message,
      variant: result.verified ? "default" : "destructive",
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

    if (verificationStatus !== "verified") {
      toast({
        title: "Verification required",
        description: "Please verify payout details before requesting withdrawal.",
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
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600">Available Balance</p>
              <Wallet className="h-4 w-4 text-rose-400" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{formatINR(wallet.balance)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-600 mb-2">Total Earned</p>
            <p className="text-2xl font-bold text-gray-900">{formatINR(wallet.total_earned)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-600 mb-2">Total Withdrawn</p>
            <p className="text-2xl font-bold text-gray-900">{formatINR(wallet.total_withdrawn)}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Payout Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="text-sm text-gray-600">Withdrawal is available only after balance reaches ₹500</div>
            <Badge className={verification.className}>
              <VerificationIcon className="h-3.5 w-3.5 mr-1" />
              {verification.label}
            </Badge>
          </div>

          {!!snapshot?.payoutAccount?.verification_message && (
            <p className="text-sm text-gray-600">{snapshot.payoutAccount.verification_message}</p>
          )}

          <Tabs value={method} onValueChange={(value) => setMethod(value as PayoutMethod)}>
            <TabsList>
              <TabsTrigger value="bank">Bank Transfer</TabsTrigger>
              <TabsTrigger value="upi">UPI</TabsTrigger>
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
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bankName">Bank Name</Label>
                  <Select value={bankName} onValueChange={setBankName}>
                    <SelectTrigger id="bankName">
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
                />
              </div>
            </TabsContent>
          </Tabs>

          <Button onClick={handleSaveAndVerify} disabled={savingDetails} className="min-w-44">
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

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Withdraw Funds</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-gray-600">
            Minimum withdrawal per request: ₹{MIN_WITHDRAWAL_AMOUNT}
          </div>
          {!canRequestWithdrawal && (
            <div className="text-sm text-red-600">
              {wallet.balance < MIN_WITHDRAWAL_AMOUNT
                ? `You need at least ₹${MIN_WITHDRAWAL_AMOUNT} balance to withdraw.`
                : "Verify payout details before requesting withdrawal."}
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
              />
            </div>
            <Button
              onClick={handleRequestWithdrawal}
              disabled={requesting || !canRequestWithdrawal}
              className="sm:min-w-44"
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

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent Withdrawal Requests</CardTitle>
        </CardHeader>
        <CardContent>
          {snapshot?.withdrawals?.length ? (
            <div className="space-y-3">
              {snapshot.withdrawals.map((item) => (
                <div
                  key={item.id}
                  className="border border-gray-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
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
