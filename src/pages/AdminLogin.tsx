import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Shield, Lock, Mail, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

const AdminLogin = () => {
  const navigate = useNavigate();
  const { login, isAdminAuthenticated, isLoading } = useAdminAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // If already authenticated, redirect to admin dashboard
    if (!isLoading && isAdminAuthenticated) {
      navigate('/admin');
    }
  }, [isAdminAuthenticated, isLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please enter both email and password');
      return;
    }

    setLoading(true);
    const result = await login(email, password);
    setLoading(false);

    if (result.success) {
      navigate('/admin');
    } else {
      setError(result.error || 'Login failed');
    }
  };

  // Don't show login form if already authenticated
  if (isAdminAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8">
        <div className="text-center mb-8">
          <img
            src="/lovable-uploads/14bf0eea-1bc9-4675-9231-356df10eb82d.png"
            alt="MatePeak Logo"
            className="h-12 mx-auto mb-4"
          />
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin Portal</h1>
          <p className="text-gray-600">MatePeak Platform Administration</p>
        </div>

        <Card className="border-gray-200 shadow-none">
          <CardHeader className="pb-4">
            <CardTitle className="text-gray-900">Administrator Login</CardTitle>
            <CardDescription className="text-gray-600">
              Enter your credentials to access the admin dashboard
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <Alert variant="destructive" className="border-red-200 bg-red-50">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                  Email Address
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3.5 h-4 w-4 text-gray-500" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="admin@matepeak.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-11 pl-10 bg-gray-50 border-gray-300 text-gray-900 placeholder:text-gray-500 focus:border-black focus:ring-black transition-all"
                    required
                    autoComplete="email"
                    autoFocus
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3.5 h-4 w-4 text-gray-500" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-11 pl-10 bg-gray-50 border-gray-300 text-gray-900 placeholder:text-gray-500 focus:border-black focus:ring-black transition-all"
                    required
                    autoComplete="current-password"
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-11 bg-black hover:bg-gray-800 text-white font-semibold transition-all mt-6"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Authenticating...
                  </>
                ) : (
                  <>
                    Sign In
                  </>
                )}
              </Button>
            </form>

            <div className="mt-6 pt-6 border-t border-gray-200">
              <p className="text-center text-sm text-gray-600">
                <Lock className="inline h-3 w-3 mr-1" />
                Secure admin authentication
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="text-center mt-6">
          <button
            onClick={() => navigate('/')}
            className="text-sm text-matepeak-primary hover:text-matepeak-secondary transition-colors"
          >
            ← Back to MatePeak Home
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
