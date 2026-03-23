import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSuspendedUsers, suspendUser, unsuspendUser } from '@/services/adminService';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ArrowLeft, Ban, UserX, UserCheck, Search, Shield } from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';

interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string;
  is_suspended: boolean;
  suspension_reason: string;
  suspended_at: string;
  suspended_by: string;
}

const AdminUserManagement = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [showSuspendDialog, setShowSuspendDialog] = useState(false);
  const [showUnsuspendDialog, setShowUnsuspendDialog] = useState(false);
  const [suspensionReason, setSuspensionReason] = useState('');
  const [processing, setProcessing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);

  useEffect(() => {
    loadSuspendedUsers();
  }, []);

  const loadSuspendedUsers = async () => {
    setLoading(true);
    const { data, error } = await getSuspendedUsers();
    
    if (error) {
      toast.error('Failed to load suspended users');
    } else {
      setUsers(data || []);
    }
    setLoading(false);
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .or(`email.ilike.%${searchQuery}%,full_name.ilike.%${searchQuery}%`)
        .limit(10);

      if (error) throw error;
      setSearchResults(data || []);
    } catch (error: any) {
      toast.error('Failed to search users');
    }
    setLoading(false);
  };

  const handleSuspend = async () => {
    if (!selectedUser || !suspensionReason.trim()) {
      toast.error('Please provide a suspension reason');
      return;
    }
    
    setProcessing(true);
    const result = await suspendUser(selectedUser.id, suspensionReason);
    
    if (result.success) {
      toast.success('User suspended successfully');
      setShowSuspendDialog(false);
      setSuspensionReason('');
      setSearchQuery('');
      setSearchResults([]);
      loadSuspendedUsers();
    } else {
      toast.error(result.error || 'Failed to suspend user');
    }
    setProcessing(false);
  };

  const handleUnsuspend = async () => {
    if (!selectedUser) return;
    
    setProcessing(true);
    const result = await unsuspendUser(selectedUser.id);
    
    if (result.success) {
      toast.success('User unsuspended successfully');
      setShowUnsuspendDialog(false);
      loadSuspendedUsers();
    } else {
      toast.error(result.error || 'Failed to unsuspend user');
    }
    setProcessing(false);
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
            <Shield className="h-8 w-8 text-blue-500" />
            <div>
              <h1 className="text-3xl font-bold">User Management</h1>
              <p className="text-gray-600">Suspend or unsuspend user accounts</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* Search Users */}
        <Card>
          <CardHeader>
            <CardTitle>Search Users</CardTitle>
            <CardDescription>
              Search by email or name to suspend a user account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 mb-4">
              <Input
                placeholder="Search by email or name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
              <Button onClick={handleSearch}>
                <Search className="h-4 w-4 mr-2" />
                Search
              </Button>
            </div>

            {searchResults.length > 0 && (
              <div className="space-y-2">
                {searchResults.map((user) => (
                  <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-medium">{user.full_name || 'No name'}</p>
                      <p className="text-sm text-gray-600">{user.email}</p>
                      {user.is_suspended && (
                        <Badge variant="destructive" className="mt-1">Suspended</Badge>
                      )}
                    </div>
                    {!user.is_suspended ? (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                          setSelectedUser(user);
                          setShowSuspendDialog(true);
                        }}
                      >
                        <Ban className="h-4 w-4 mr-2" />
                        Suspend
                      </Button>
                    ) : (
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => {
                          setSelectedUser(user);
                          setShowUnsuspendDialog(true);
                        }}
                      >
                        <UserCheck className="h-4 w-4 mr-2" />
                        Unsuspend
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Suspended Users */}
        <Card>
          <CardHeader>
            <CardTitle>Suspended Users ({users.length})</CardTitle>
            <CardDescription>
              Currently suspended user accounts
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-24 w-full" />
                ))}
              </div>
            ) : users.length === 0 ? (
              <div className="text-center py-12">
                <UserCheck className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No suspended users</p>
              </div>
            ) : (
              <div className="space-y-4">
                {users.map((user) => (
                  <div key={user.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold">{user.full_name || 'No name'}</h3>
                          <Badge variant="destructive">Suspended</Badge>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{user.email}</p>
                        <div className="bg-red-50 border border-red-200 rounded p-3 mb-2">
                          <p className="text-sm font-medium text-red-800">Suspension Reason:</p>
                          <p className="text-sm text-red-700">{user.suspension_reason}</p>
                        </div>
                        <p className="text-xs text-gray-500">
                          Suspended on: {new Date(user.suspended_at).toLocaleString()}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedUser(user);
                          setShowUnsuspendDialog(true);
                        }}
                      >
                        <UserCheck className="h-4 w-4 mr-2" />
                        Unsuspend
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Suspend Dialog */}
      <Dialog open={showSuspendDialog} onOpenChange={setShowSuspendDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Suspend User Account</DialogTitle>
            <DialogDescription>
              Suspend {selectedUser?.full_name || selectedUser?.email}'s account
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
              <p className="text-sm text-yellow-800">
                <strong>Warning:</strong> The user will be immediately logged out and unable to access their account.
              </p>
            </div>
            <Textarea
              placeholder="Suspension reason (required) - Explain why this account is being suspended"
              value={suspensionReason}
              onChange={(e) => setSuspensionReason(e.target.value)}
              rows={4}
              required
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSuspendDialog(false)} disabled={processing}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleSuspend}
              disabled={processing || !suspensionReason.trim()}
            >
              {processing ? 'Suspending...' : 'Suspend Account'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Unsuspend Dialog */}
      <Dialog open={showUnsuspendDialog} onOpenChange={setShowUnsuspendDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Unsuspend User Account</DialogTitle>
            <DialogDescription>
              Restore access for {selectedUser?.full_name || selectedUser?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {selectedUser && (
              <div className="bg-gray-50 rounded p-3">
                <p className="text-sm font-medium mb-1">Original Suspension Reason:</p>
                <p className="text-sm text-gray-700">{selectedUser.suspension_reason}</p>
              </div>
            )}
            <p className="text-sm text-gray-600">
              The user will be able to log in and access their account immediately.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUnsuspendDialog(false)} disabled={processing}>
              Cancel
            </Button>
            <Button
              onClick={handleUnsuspend}
              disabled={processing}
              className="bg-green-600 hover:bg-green-700"
            >
              {processing ? 'Unsuspending...' : 'Unsuspend Account'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminUserManagement;
