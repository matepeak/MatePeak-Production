import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPendingWithdrawals, approveWithdrawal, rejectWithdrawal } from '@/services/adminService';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ArrowLeft, DollarSign, Check, X, Calendar, User, CreditCard } from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import { Skeleton } from '@/components/ui/skeleton';

interface WithdrawalRequest {
  id: string;
  mentor_id: string;
  amount: number;
  status: string;
  account_details: any;
  payout_account?: {
    payout_method?: string | null;
    account_holder_name?: string | null;
    account_number?: string | null;
    ifsc_code?: string | null;
    bank_name?: string | null;
    upi_id?: string | null;
  } | null;
  payout_profile?: {
    payout_method?: string | null;
    account_holder_name?: string | null;
    account_number?: string | null;
    ifsc_code?: string | null;
    upi_id?: string | null;
  } | null;
  payment_profile?: {
    payout_method?: string | null;
    account_holder_name?: string | null;
    account_number?: string | null;
    ifsc_code?: string | null;
    upi_id?: string | null;
  } | null;
  requested_at: string;
  profiles: {
    email: string;
    full_name: string;
  };
}

type StatusFilter = 'pending' | 'approved' | 'rejected';

const AdminWithdrawals = () => {
  const navigate = useNavigate();
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<WithdrawalRequest | null>(null);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('pending');
  const [transactionRef, setTransactionRef] = useState('');
  const [notes, setNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [processing, setProcessing] = useState(false);

  const pendingStatuses = new Set(['pending', 'processing']);
  const approvedStatuses = new Set(['approved', 'completed']);
  const rejectedStatuses = new Set(['rejected', 'failed', 'cancelled', 'canceled']);

  const pendingWithdrawals = withdrawals.filter((w) => pendingStatuses.has(String(w.status || '').toLowerCase()));
  const approvedWithdrawals = withdrawals.filter((w) => approvedStatuses.has(String(w.status || '').toLowerCase()));
  const rejectedWithdrawals = withdrawals.filter((w) => rejectedStatuses.has(String(w.status || '').toLowerCase()));

  const filteredWithdrawals =
    statusFilter === 'approved'
      ? approvedWithdrawals
      : statusFilter === 'rejected'
        ? rejectedWithdrawals
        : pendingWithdrawals;

  useEffect(() => {
    loadPendingWithdrawals();
  }, []);

  const loadPendingWithdrawals = async () => {
    setLoading(true);
    const { data, error } = await getPendingWithdrawals();
    
    if (error) {
      toast.error('Failed to load pending withdrawals');
    } else {
      setWithdrawals(data || []);
    }
    setLoading(false);
  };

  const handleApprove = async () => {
    if (!selectedWithdrawal) return;
    
    setProcessing(true);
    const result = await approveWithdrawal(
      selectedWithdrawal.id,
      transactionRef || undefined,
      notes || undefined,
      {
        mentorEmail: selectedWithdrawal.profiles?.email || null,
        mentorName: selectedWithdrawal.profiles?.full_name || null,
        amount: selectedWithdrawal.amount,
        requestedAt: selectedWithdrawal.requested_at,
      }
    );
    
    if (result.success) {
      toast.success('Withdrawal approved successfully');
      setShowApproveDialog(false);
      setTransactionRef('');
      setNotes('');
      loadPendingWithdrawals();
    } else {
      toast.error(result.error || 'Failed to approve withdrawal');
    }
    setProcessing(false);
  };

  const handleReject = async () => {
    if (!selectedWithdrawal || !rejectionReason.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }
    
    setProcessing(true);
    const result = await rejectWithdrawal(selectedWithdrawal.id, rejectionReason, {
      mentorEmail: selectedWithdrawal.profiles?.email || null,
      mentorName: selectedWithdrawal.profiles?.full_name || null,
      amount: selectedWithdrawal.amount,
      requestedAt: selectedWithdrawal.requested_at,
    });
    
    if (result.success) {
      toast.success('Withdrawal rejected and funds restored to wallet');
      setShowRejectDialog(false);
      setRejectionReason('');
      loadPendingWithdrawals();
    } else {
      toast.error(result.error || 'Failed to reject withdrawal');
    }
    setProcessing(false);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(amount);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-6">
          <button
            onClick={() => navigate('/admin')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Admin Dashboard
          </button>
          <div className="flex items-center gap-3">
            <DollarSign className="h-8 w-8 text-green-500" />
            <div>
              <h1 className="text-3xl font-bold">Withdrawal Requests</h1>
              <p className="text-gray-600">Review mentor withdrawal requests and settle payouts manually</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>
              {statusFilter === 'approved' ? 'Approved Withdrawals' : statusFilter === 'rejected' ? 'Rejected Withdrawals' : 'Open Withdrawals'}
              {' '}
              (
              {statusFilter === 'approved' ? approvedWithdrawals.length : statusFilter === 'rejected' ? rejectedWithdrawals.length : pendingWithdrawals.length}
              )
            </CardTitle>
            <CardDescription>
              {statusFilter === 'approved'
                ? 'Requests already approved by admin'
                : statusFilter === 'rejected'
                  ? 'Requests rejected by admin'
                  : 'Withdrawal requests awaiting admin completion or rejection'}
            </CardDescription>
            <Tabs value={statusFilter} onValueChange={(value) => setStatusFilter(value as StatusFilter)} className="mt-2">
              <TabsList>
                <TabsTrigger value="pending">Pending ({pendingWithdrawals.length})</TabsTrigger>
                <TabsTrigger value="approved">Approved ({approvedWithdrawals.length})</TabsTrigger>
                <TabsTrigger value="rejected">Rejected ({rejectedWithdrawals.length})</TabsTrigger>
              </TabsList>
            </Tabs>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-40 w-full" />
                ))}
              </div>
            ) : filteredWithdrawals.length === 0 ? (
              <div className="text-center py-12">
                <DollarSign className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">
                  {statusFilter === 'approved'
                    ? 'No approved withdrawal requests'
                    : statusFilter === 'rejected'
                      ? 'No rejected withdrawal requests'
                      : 'No pending withdrawal requests'}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredWithdrawals.map((withdrawal) => (
                  <div key={withdrawal.id} className="border rounded-lg p-6 hover:border-primary transition-colors">
                    {(() => {
                      const accountNumber =
                        withdrawal.account_details?.account_number ||
                        withdrawal.payout_account?.account_number ||
                        withdrawal.payment_profile?.account_number ||
                        withdrawal.payout_profile?.account_number ||
                        null;
                      const payoutMethod =
                        withdrawal.account_details?.payout_method ||
                        withdrawal.payout_account?.payout_method ||
                        withdrawal.payment_profile?.payout_method ||
                        withdrawal.payout_profile?.payout_method ||
                        null;
                      const bankName =
                        withdrawal.account_details?.bank_name ||
                        withdrawal.payout_account?.bank_name ||
                        null;
                      const ifscCode =
                        withdrawal.account_details?.ifsc_code ||
                        withdrawal.payout_account?.ifsc_code ||
                        withdrawal.payment_profile?.ifsc_code ||
                        withdrawal.payout_profile?.ifsc_code ||
                        null;
                      const upiId =
                        withdrawal.account_details?.upi_id ||
                        withdrawal.payout_account?.upi_id ||
                        withdrawal.payment_profile?.upi_id ||
                        withdrawal.payout_profile?.upi_id ||
                        null;
                      const accountHolder =
                        withdrawal.account_details?.account_holder_name ||
                        withdrawal.payout_account?.account_holder_name ||
                        withdrawal.payment_profile?.account_holder_name ||
                        withdrawal.payout_profile?.account_holder_name ||
                        null;

                      return (
                        <>
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center">
                          <DollarSign className="h-6 w-6 text-green-600" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <User className="h-4 w-4 text-gray-500" />
                            <h3 className="font-semibold">{withdrawal.profiles?.full_name || 'Mentor'}</h3>
                          </div>
                          <p className="text-sm text-gray-600 mb-2">{withdrawal.profiles?.email}</p>
                          <p className="text-xs text-gray-500 mb-2">Mentor ID: {withdrawal.mentor_id}</p>
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Calendar className="h-4 w-4" />
                            Requested: {new Date(withdrawal.requested_at).toLocaleString()}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-green-600">
                          {formatCurrency(withdrawal.amount)}
                        </p>
                        <Badge variant="outline" className="mt-2">
                          {withdrawal.status}
                        </Badge>
                      </div>
                    </div>

                    {/* Account Details */}
                    {withdrawal.account_details && (
                      <div className="bg-gray-50 rounded-lg p-4 mb-4">
                        <div className="flex items-center gap-2 mb-2">
                          <CreditCard className="h-4 w-4 text-gray-600" />
                          <p className="font-medium text-sm">Bank Account Details</p>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          {payoutMethod && (
                            <div>
                              <span className="text-gray-600">Method:</span>
                              <span className="ml-2 font-medium uppercase">{payoutMethod}</span>
                            </div>
                          )}
                          {bankName && (
                            <div>
                              <span className="text-gray-600">Bank:</span>
                              <span className="ml-2 font-medium">{bankName}</span>
                            </div>
                          )}
                          {accountNumber && (
                            <div>
                              <span className="text-gray-600">Account:</span>
                              <span className="ml-2 font-medium">{accountNumber}</span>
                            </div>
                          )}
                          {ifscCode && (
                            <div>
                              <span className="text-gray-600">IFSC:</span>
                              <span className="ml-2 font-medium">{ifscCode}</span>
                            </div>
                          )}
                          {upiId && (
                            <div>
                              <span className="text-gray-600">UPI:</span>
                              <span className="ml-2 font-medium">{upiId}</span>
                            </div>
                          )}
                          {accountHolder && (
                            <div>
                              <span className="text-gray-600">Account Holder:</span>
                              <span className="ml-2 font-medium">{accountHolder}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    {statusFilter === 'pending' && (
                      <div className="flex gap-2">
                        <Button
                          variant="default"
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                          onClick={() => {
                            setSelectedWithdrawal(withdrawal);
                            setShowApproveDialog(true);
                          }}
                        >
                          <Check className="h-4 w-4 mr-2" />
                          Approve & Mark Paid
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => {
                            setSelectedWithdrawal(withdrawal);
                            setShowRejectDialog(true);
                          }}
                        >
                          <X className="h-4 w-4 mr-2" />
                          Reject
                        </Button>
                      </div>
                    )}
                        </>
                      );
                    })()}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Approve Dialog */}
      <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Withdrawal</DialogTitle>
            <DialogDescription>
              Process {formatCurrency(selectedWithdrawal?.amount || 0)} withdrawal for {selectedWithdrawal?.profiles?.full_name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded p-3">
              <p className="text-sm text-green-800">
                Amount will be marked as processed. Ensure you've transferred the funds before approving.
              </p>
            </div>
            <Input
              placeholder="Transaction Reference / ID (optional)"
              value={transactionRef}
              onChange={(e) => setTransactionRef(e.target.value)}
            />
            <Textarea
              placeholder="Admin notes (optional, internal use only)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApproveDialog(false)} disabled={processing}>
              Cancel
            </Button>
            <Button
              onClick={handleApprove}
              disabled={processing}
              className="bg-green-600 hover:bg-green-700"
            >
              {processing ? 'Processing...' : 'Approve Withdrawal'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Withdrawal Request</DialogTitle>
            <DialogDescription>
              Reject {formatCurrency(selectedWithdrawal?.amount || 0)} withdrawal for {selectedWithdrawal?.profiles?.full_name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
              <p className="text-sm text-yellow-800">
                Funds will be restored to the mentor's wallet automatically.
              </p>
            </div>
            <Textarea
              placeholder="Rejection reason (required) - Will be visible to the mentor"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              rows={4}
              required
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)} disabled={processing}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={processing || !rejectionReason.trim()}
            >
              {processing ? 'Rejecting...' : 'Reject Withdrawal'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminWithdrawals;
