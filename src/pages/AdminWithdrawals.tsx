import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPendingWithdrawals, approveWithdrawal, rejectWithdrawal } from '@/services/adminService';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
  requested_at: string;
  profiles: {
    email: string;
    full_name: string;
  };
}

const AdminWithdrawals = () => {
  const navigate = useNavigate();
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<WithdrawalRequest | null>(null);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [transactionRef, setTransactionRef] = useState('');
  const [notes, setNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [processing, setProcessing] = useState(false);

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
      notes || undefined
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
    const result = await rejectWithdrawal(selectedWithdrawal.id, rejectionReason);
    
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
              <p className="text-gray-600">Approve mentor payment withdrawals</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Pending Withdrawals ({withdrawals.length})</CardTitle>
            <CardDescription>
              Withdrawal requests awaiting admin approval
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-40 w-full" />
                ))}
              </div>
            ) : withdrawals.length === 0 ? (
              <div className="text-center py-12">
                <DollarSign className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No pending withdrawal requests</p>
              </div>
            ) : (
              <div className="space-y-4">
                {withdrawals.map((withdrawal) => (
                  <div key={withdrawal.id} className="border rounded-lg p-6 hover:border-primary transition-colors">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center">
                          <DollarSign className="h-6 w-6 text-green-600" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <User className="h-4 w-4 text-gray-500" />
                            <h3 className="font-semibold">{withdrawal.profiles?.full_name}</h3>
                          </div>
                          <p className="text-sm text-gray-600 mb-2">{withdrawal.profiles?.email}</p>
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
                          {withdrawal.account_details.bank_name && (
                            <div>
                              <span className="text-gray-600">Bank:</span>
                              <span className="ml-2 font-medium">{withdrawal.account_details.bank_name}</span>
                            </div>
                          )}
                          {withdrawal.account_details.account_number && (
                            <div>
                              <span className="text-gray-600">Account:</span>
                              <span className="ml-2 font-medium">{withdrawal.account_details.account_number}</span>
                            </div>
                          )}
                          {withdrawal.account_details.ifsc_code && (
                            <div>
                              <span className="text-gray-600">IFSC:</span>
                              <span className="ml-2 font-medium">{withdrawal.account_details.ifsc_code}</span>
                            </div>
                          )}
                          {withdrawal.account_details.account_holder_name && (
                            <div>
                              <span className="text-gray-600">Account Holder:</span>
                              <span className="ml-2 font-medium">{withdrawal.account_details.account_holder_name}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Actions */}
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
                        Approve & Process
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
