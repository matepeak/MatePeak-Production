import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function AuthCallback() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Verifying your email...');

  useEffect(() => {
    handleEmailConfirmation();
  }, []);

  const handleEmailConfirmation = async () => {
    try {
      console.log('🔐 Auth Callback - Starting email confirmation');

      const url = new URL(window.location.href);
      const query = url.searchParams;
      const hashParams = new URLSearchParams(window.location.hash.substring(1));

      const queryType = query.get('type');
      const hashType = hashParams.get('type');
      const authType = queryType || hashType;

      const code = query.get('code');
      const tokenHash = query.get('token_hash');

      console.log('🔐 Auth Callback - Type:', authType);
      console.log('🔐 Code present:', !!code);
      console.log('🔐 Token hash present:', !!tokenHash);

      // Newer Supabase flow: code exchange
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) throw error;
      } else if (tokenHash && authType) {
        // Token-hash flow used in some templates
        const { error } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: authType as any,
        });
        if (error) throw error;
      } else {
        // Legacy hash fragment flow
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');

        if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (error) throw error;
        }
      }

      if (authType === 'recovery') {
        console.log('🔑 Password recovery detected');
        navigate('/reset-password');
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error('Email verified, but no active session was found. Please sign in.');
      }

      console.log('Email confirmed for user:', user.id);
      console.log('User metadata:', user.user_metadata);

      const role = user.user_metadata?.role || user.user_metadata?.user_type || 'student';

      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          email: user.email,
          full_name: user.user_metadata?.full_name || '',
          user_type: role,
          avatar_url: user.user_metadata?.avatar_url || null,
        }, {
          onConflict: 'id'
        });

      if (profileError) {
        console.error('Profile creation/update error:', profileError);
      }

      setStatus('success');
      setMessage('Email verified successfully! Redirecting...');

      setTimeout(() => {
        console.log('🔀 Redirecting role:', role);
        if (role === 'mentor') {
          navigate('/expert/onboarding');
        } else {
          navigate('/dashboard');
        }
      }, 1200);

    } catch (error: any) {
      console.error('==========================================');
      console.error('EMAIL CONFIRMATION ERROR:');
      console.error('==========================================');
      console.error('Error:', error);
      console.error('Error Message:', error?.message);
      console.error('==========================================');
      
      setStatus('error');
      setMessage(error.message || 'Failed to verify email. The link may have expired.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-8 text-center">
        {status === 'loading' && (
          <>
            <Loader2 className="h-16 w-16 text-primary animate-spin mx-auto mb-6" />
            <h1 className="text-2xl font-bold mb-3">Verifying Email</h1>
            <p className="text-gray-600">{message}</p>
            <p className="text-sm text-gray-500 mt-4">This may take a few moments...</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="mx-auto w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
              <CheckCircle2 className="h-12 w-12 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold mb-3 text-green-600">Email Verified!</h1>
            <p className="text-gray-600">{message}</p>
            <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-800">
                Your account is now active and ready to use
              </p>
            </div>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="mx-auto w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-6">
              <XCircle className="h-12 w-12 text-red-600" />
            </div>
            <h1 className="text-2xl font-bold mb-3 text-red-600">Verification Failed</h1>
            <p className="text-gray-600 mb-6">{message}</p>
            
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-left">
              <p className="text-sm text-red-800 font-semibold mb-2">Possible reasons:</p>
              <ul className="text-sm text-red-700 list-disc list-inside space-y-1">
                <li>The confirmation link has expired</li>
                <li>The link has already been used</li>
                <li>The link is invalid or corrupted</li>
              </ul>
            </div>
            
            <div className="flex flex-col gap-3">
              <Button 
                onClick={() => navigate('/student/signup')}
                className="w-full h-11"
              >
                Try Signing Up Again
              </Button>
              <Button 
                onClick={() => navigate('/student/login')} 
                variant="outline"
                className="w-full h-11"
              >
                Go to Login
              </Button>
              <Button 
                onClick={() => navigate('/')} 
                variant="ghost"
                className="w-full h-11"
              >
                Back to Home
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
