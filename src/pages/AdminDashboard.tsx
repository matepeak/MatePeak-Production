import { useNavigate } from 'react-router-dom';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Shield, Users, UserCheck, DollarSign, Flag, Activity, LogOut } from 'lucide-react';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { logout, adminUser } = useAdminAuth();

  const handleLogout = async () => {
    await logout();
    navigate('/admin/login');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-3xl font-bold">Admin Dashboard</h1>
                <p className="text-gray-600">MatePeak Platform Administration</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm text-gray-600">Logged in as</p>
                <p className="font-medium">{adminUser?.email}</p>
              </div>
              <Button variant="outline" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Pending Verifications
              </CardTitle>
              <UserCheck className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
              <p className="text-xs text-gray-500 mt-1">Mentor applications</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Pending Withdrawals
              </CardTitle>
              <DollarSign className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
              <p className="text-xs text-gray-500 mt-1">Awaiting approval</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Flagged Reviews
              </CardTitle>
              <Flag className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
              <p className="text-xs text-gray-500 mt-1">Need moderation</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Suspended Users
              </CardTitle>
              <Users className="h-4 w-4 text-gray-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
              <p className="text-xs text-gray-500 mt-1">Active suspensions</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Navigation */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">
              <Activity className="h-4 w-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="mentors">
              <UserCheck className="h-4 w-4 mr-2" />
              Mentor Verification
            </TabsTrigger>
            <TabsTrigger value="users">
              <Users className="h-4 w-4 mr-2" />
              User Management
            </TabsTrigger>
            <TabsTrigger value="withdrawals">
              <DollarSign className="h-4 w-4 mr-2" />
              Withdrawals
            </TabsTrigger>
            <TabsTrigger value="reviews">
              <Flag className="h-4 w-4 mr-2" />
              Reviews
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <Card>
              <CardHeader>
                <CardTitle>Platform Overview</CardTitle>
                <CardDescription>
                  Quick access to key administrative functions
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <button
                    onClick={() => navigate('/admin/mentor-verification')}
                    className="p-4 bg-orange-50 hover:bg-orange-100 rounded-lg text-left transition-colors"
                  >
                    <UserCheck className="h-6 w-6 text-orange-600 mb-2" />
                    <h3 className="font-semibold">Mentor Verification</h3>
                    <p className="text-sm text-gray-600">Review and approve mentor applications</p>
                  </button>

                  <button
                    onClick={() => navigate('/admin/withdrawals')}
                    className="p-4 bg-green-50 hover:bg-green-100 rounded-lg text-left transition-colors"
                  >
                    <DollarSign className="h-6 w-6 text-green-600 mb-2" />
                    <h3 className="font-semibold">Withdrawal Requests</h3>
                    <p className="text-sm text-gray-600">Approve mentor payment withdrawals</p>
                  </button>

                  <button
                    onClick={() => navigate('/admin/user-management')}
                    className="p-4 bg-blue-50 hover:bg-blue-100 rounded-lg text-left transition-colors"
                  >
                    <Users className="h-6 w-6 text-blue-600 mb-2" />
                    <h3 className="font-semibold">User Management</h3>
                    <p className="text-sm text-gray-600">Suspend or ban problematic users</p>
                  </button>

                  <button
                    onClick={() => navigate('/admin/review-moderation')}
                    className="p-4 bg-red-50 hover:bg-red-100 rounded-lg text-left transition-colors"
                  >
                    <Flag className="h-6 w-6 text-red-600 mb-2" />
                    <h3 className="font-semibold">Review Moderation</h3>
                    <p className="text-sm text-gray-600">Hide or remove inappropriate reviews</p>
                  </button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="mentors">
            <Card>
              <CardHeader>
                <CardTitle>Mentor Verification</CardTitle>
                <CardDescription>
                  For detailed mentor verification, visit the{' '}
                  <button
                    onClick={() => navigate('/admin/mentor-verification')}
                    className="text-primary underline"
                  >
                    dedicated page
                  </button>
                </CardDescription>
              </CardHeader>
            </Card>
          </TabsContent>

          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle>User Management</CardTitle>
                <CardDescription>
                  For detailed user management, visit the{' '}
                  <button
                    onClick={() => navigate('/admin/user-management')}
                    className="text-primary underline"
                  >
                    dedicated page
                  </button>
                </CardDescription>
              </CardHeader>
            </Card>
          </TabsContent>

          <TabsContent value="withdrawals">
            <Card>
              <CardHeader>
                <CardTitle>Withdrawal Requests</CardTitle>
                <CardDescription>
                  For detailed withdrawal management, visit the{' '}
                  <button
                    onClick={() => navigate('/admin/withdrawals')}
                    className="text-primary underline"
                  >
                    dedicated page
                  </button>
                </CardDescription>
              </CardHeader>
            </Card>
          </TabsContent>

          <TabsContent value="reviews">
            <Card>
              <CardHeader>
                <CardTitle>Review Moderation</CardTitle>
                <CardDescription>
                  For detailed review moderation, visit the{' '}
                  <button
                    onClick={() => navigate('/admin/review-moderation')}
                    className="text-primary underline"
                  >
                    dedicated page
                  </button>
                </CardDescription>
              </CardHeader>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminDashboard;
