import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/sonner";
import {
  getMentorPayoutProfile,
  saveMentorPayoutProfile,
  type MentorPayoutProfileInput,
} from "@/services/mentorPayoutService";
import { CheckCircle2, Landmark, Settings } from "lucide-react";

interface MentorPaymentsSetupProps {
  mentorProfile: any;
}

const DEFAULT_COUNTRY = "IN";
const DEFAULT_CURRENCY = "INR";

const MentorPaymentsSetup = ({ mentorProfile }: MentorPaymentsSetupProps) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<any>(null);

  const [openPreferenceModal, setOpenPreferenceModal] = useState(false);
  const [openKycModal, setOpenKycModal] = useState(false);

  const [currency, setCurrency] = useState(DEFAULT_CURRENCY);
  const [countryCode, setCountryCode] = useState(DEFAULT_COUNTRY);
  const [payoutMethod, setPayoutMethod] = useState<"bank_account" | "upi">("bank_account");
  const [accountType, setAccountType] = useState<"savings" | "current">("savings");
  const [accountHolderName, setAccountHolderName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [ifscCode, setIfscCode] = useState("");
  const [upiId, setUpiId] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [panNumber, setPanNumber] = useState("");
  const [aadhaarLast4, setAadhaarLast4] = useState("");
  const [legalName, setLegalName] = useState("");
  const [businessName, setBusinessName] = useState("");

  const isSetupComplete = useMemo(() => {
    if (!profile) return false;
    const hasMethod = !!profile.payout_method;
    const hasKyc = !!profile.is_kyc_verified;
    const hasBank =
      profile.payout_method === "upi"
        ? !!profile.upi_id
        : !!profile.account_holder_name && !!profile.account_number && !!profile.ifsc_code;
    return hasMethod && hasBank && hasKyc;
  }, [profile]);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const data = await getMentorPayoutProfile();
      setProfile(data);

      if (data) {
        setCurrency(data.currency || DEFAULT_CURRENCY);
        setCountryCode(data.country_code || DEFAULT_COUNTRY);
        setPayoutMethod((data.payout_method || "bank_account") as "bank_account" | "upi");
        setAccountType((data.account_type || "savings") as "savings" | "current");
        setAccountHolderName(data.account_holder_name || "");
        setAccountNumber(data.account_number || "");
        setIfscCode(data.ifsc_code || "");
        setUpiId(data.upi_id || "");
        setPhone(data.phone || mentorProfile?.phone || "");
        setEmail(data.email || mentorProfile?.email || "");
        setPanNumber(data.pan_number || "");
        setAadhaarLast4(data.aadhaar_last4 || "");
        setLegalName(data.legal_name || mentorProfile?.full_name || "");
        setBusinessName(data.business_name || "");
      } else {
        setEmail(mentorProfile?.email || "");
        setLegalName(mentorProfile?.full_name || "");
      }
    } catch (error) {
      console.error("Failed to load payout profile", error);
      toast.error("Unable to load payment settings", {
        description: "Please refresh and try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submitProfile = async () => {
    if (payoutMethod === "bank_account") {
      if (!accountHolderName || !accountNumber || !ifscCode) {
        toast.error("Missing bank details", {
          description: "Account holder, account number and IFSC are required.",
        });
        return;
      }
    }

    if (payoutMethod === "upi" && !upiId) {
      toast.error("UPI ID required", {
        description: "Please enter your UPI ID for payouts.",
      });
      return;
    }

    if (!legalName || !phone || !email || !panNumber) {
      toast.error("KYC details required", {
        description: "Legal name, phone, email and PAN are required for payout success.",
      });
      return;
    }

    const payload: MentorPayoutProfileInput = {
      currency,
      countryCode,
      payoutMethod,
      accountType,
      accountHolderName,
      accountNumber,
      ifscCode: ifscCode.toUpperCase(),
      upiId: upiId.toLowerCase(),
      phone,
      email,
      panNumber: panNumber.toUpperCase(),
      aadhaarLast4,
      legalName,
      businessName,
      isKycVerified: true,
    };

    try {
      setSaving(true);
      await saveMentorPayoutProfile(payload);
      setOpenKycModal(false);
      await loadProfile();
      toast.success("Payment setup saved", {
        description: "Your payout method and KYC details are now configured.",
      });
    } catch (error: any) {
      console.error("Failed to save payout profile", error);
      toast.error("Failed to save payment setup", {
        description: error?.message || "Please try again.",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Settings</h1>
          <p className="text-sm text-gray-600 mt-1">Configure payout preferences and KYC details for successful withdrawals.</p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border border-gray-200 px-3.5 py-1.5 bg-white">
          <Landmark className="h-4 w-4 text-gray-700" />
          <span className="text-xs font-semibold text-gray-800">
            {isSetupComplete ? "Payout setup complete" : "Payout setup pending"}
          </span>
          {isSetupComplete && <CheckCircle2 className="h-4 w-4 text-green-600" />}
        </div>
      </div>

      <Card className="border-gray-200 rounded-2xl shadow-sm">
        <CardHeader className="pb-1">
          <CardTitle className="text-2xl font-bold tracking-tight text-gray-900">Payment Settings</CardTitle>
          <p className="text-sm text-gray-600">Manage your payment preferences and payout methods.</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-5">
              <p className="text-sm font-semibold uppercase tracking-wide text-gray-500 mb-1.5">Currency</p>
              <p className="text-2xl font-semibold text-gray-800">
                {currency === "INR" ? "INR (₹)" : currency}
              </p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-5">
              <p className="text-sm font-semibold uppercase tracking-wide text-gray-500 mb-1.5">Country</p>
              <p className="text-2xl font-semibold text-gray-800">{countryCode}</p>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-gray-50 p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <p className="text-2xl font-bold text-gray-900">Payout Method</p>
              <p className="text-sm text-gray-600 mt-1.5">
                {loading
                  ? "Loading..."
                  : isSetupComplete
                  ? `${payoutMethod === "upi" ? "UPI" : "Bank Account"} configured`
                  : "No payout method configured"}
              </p>
            </div>
            <Button
              className="h-11 rounded-lg px-6 text-sm font-semibold"
              onClick={() => setOpenPreferenceModal(true)}
              disabled={loading}
            >
              <Settings className="h-4 w-4 mr-2" />
              {isSetupComplete ? "Update Payments" : "Setup Payments"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={openPreferenceModal} onOpenChange={setOpenPreferenceModal}>
        <DialogContent className="sm:max-w-xl rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-gray-800">Payout preference</DialogTitle>
            <p className="text-sm text-gray-500">
              Please confirm the currency and country you want to receive your payout in.
            </p>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Currency</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger className="h-12 rounded-xl">
                  <SelectValue placeholder="Select currency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="INR">₹ (Indian Rupee)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Country</Label>
              <Select value={countryCode} onValueChange={setCountryCode}>
                <SelectTrigger className="h-12 rounded-xl">
                  <SelectValue placeholder="Select country" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="IN">India</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              className="w-full h-11 rounded-lg text-sm font-semibold mt-2"
              onClick={() => {
                setOpenPreferenceModal(false);
                setOpenKycModal(true);
              }}
            >
              Confirm details
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={openKycModal} onOpenChange={setOpenKycModal}>
        <DialogContent className="sm:max-w-2xl rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-gray-800">Bank Account Details</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
            <div>
              <Label className="mb-2 block">Payout Method</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={payoutMethod === "bank_account" ? "default" : "outline"}
                  onClick={() => setPayoutMethod("bank_account")}
                >
                  Bank Account
                </Button>
                <Button
                  type="button"
                  variant={payoutMethod === "upi" ? "default" : "outline"}
                  onClick={() => setPayoutMethod("upi")}
                >
                  UPI
                </Button>
              </div>
            </div>

            {payoutMethod === "bank_account" && (
              <>
                <div>
                  <Label className="mb-2 block">Account Type</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      variant={accountType === "savings" ? "default" : "outline"}
                      onClick={() => setAccountType("savings")}
                    >
                      Savings
                    </Button>
                    <Button
                      type="button"
                      variant={accountType === "current" ? "default" : "outline"}
                      onClick={() => setAccountType("current")}
                    >
                      Current
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Account holder name</Label>
                  <Input value={accountHolderName} onChange={(e) => setAccountHolderName(e.target.value)} />
                </div>

                <div className="space-y-2">
                  <Label>IFSC code</Label>
                  <Input value={ifscCode} onChange={(e) => setIfscCode(e.target.value.toUpperCase())} />
                </div>

                <div className="space-y-2">
                  <Label>Account number</Label>
                  <Input value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} />
                </div>
              </>
            )}

            {payoutMethod === "upi" && (
              <div className="space-y-2">
                <Label>UPI ID</Label>
                <Input value={upiId} onChange={(e) => setUpiId(e.target.value.toLowerCase())} placeholder="name@bank" />
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Legal name</Label>
                <Input value={legalName} onChange={(e) => setLegalName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Business name (optional)</Label>
                <Input value={businessName} onChange={(e) => setBusinessName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>PAN Number</Label>
                <Input value={panNumber} onChange={(e) => setPanNumber(e.target.value.toUpperCase())} />
              </div>
              <div className="space-y-2">
                <Label>Aadhaar Last 4 (optional)</Label>
                <Input value={aadhaarLast4} onChange={(e) => setAadhaarLast4(e.target.value)} maxLength={4} />
              </div>
            </div>

            <Button className="w-full h-11 text-sm font-semibold" onClick={submitProfile} disabled={saving}>
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MentorPaymentsSetup;
