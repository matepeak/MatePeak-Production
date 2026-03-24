import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useState } from "react";
import ScrollToTop from "./components/ScrollToTop";
import Index from "./pages/Index";
import MentorSearch from "./pages/MentorSearch";
import Explore from "./pages/Explore";
import MentorProfile from "./pages/MentorProfile";
import MentorProfileByUsername from "./pages/MentorProfileByUsername";
import MentorPublicProfile from "./pages/MentorPublicProfile";
import MentorServiceDetail from "./pages/MentorServiceDetail";
import BookingPage from "./pages/BookingPage";
import BookingConfirmed from "./pages/BookingConfirmed";
import BookingSuccess from "./pages/BookingSuccess";
import OnboardingPhase1Success from "./pages/OnboardingPhase1Success";
import Dashboard from "./pages/Dashboard";
import HowItWorks from "./pages/HowItWorks";
import NotFound from "./pages/NotFound";
import AboutUs from "./pages/AboutUs";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import RoleSelection from "./pages/RoleSelection";
import StudentSignup from "./pages/StudentSignup";
import StudentLogin from "./pages/StudentLogin";
import MentorSignup from "./pages/MentorSignup";
import ExpertLogin from "./pages/ExpertLogin";
import ExpertOnboarding from "./pages/ExpertOnboarding";
import ExpertOnboardingPhase2 from "./pages/ExpertOnboardingPhase2";
import ExpertDashboard from "./pages/ExpertDashboard";
import MentorDashboard from "./pages/MentorDashboard";
import StudentDashboard from "./pages/StudentDashboard";
import StudentSupport from "./pages/StudentSupport";
import MigrateAvailability from "./pages/MigrateAvailability";
import AuthCallback from "./pages/AuthCallback";
import ResetPassword from "./pages/ResetPassword";
import AdminDashboard from "./pages/AdminDashboard";
import AdminMentorVerification from "./pages/AdminMentorVerification";
import AdminUserManagement from "./pages/AdminUserManagement";
import AdminWithdrawals from "./pages/AdminWithdrawals";
import AdminReviewModeration from "./pages/AdminReviewModeration";
import AdminLogin from "./pages/AdminLogin";
import PayoutRequestTest from "./pages/PayoutRequestTest";
import PhoneOtpTest from "./pages/PhoneOtpTest";
import Msg91WhatsAppTest from "./pages/Msg91WhatsAppTest";
import { AdminAuthProvider } from "./contexts/AdminAuthContext";
import { ProtectedAdminRoute } from "./components/ProtectedAdminRoute";
import GlobalMentorPresence from "./components/GlobalMentorPresence";

const App = () => {
  // Create QueryClient instance per App mount for proper isolation between users/tabs
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 60 * 5, // 5 minutes
            refetchOnWindowFocus: true,
            refetchOnReconnect: true,
            retry: 1,
          },
        },
      })
  );

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AdminAuthProvider>
          <TooltipProvider>
            <Sonner />
            <BrowserRouter>
              <ScrollToTop />
              <GlobalMentorPresence />
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/mentors" element={<MentorSearch />} />
              <Route path="/explore" element={<Explore />} />
              <Route path="/mentors/:id" element={<MentorProfile />} />
              <Route path="/mentor/:username" element={<MentorPublicProfile />} />
              <Route path="/mentor/:username/services/:serviceId" element={<MentorServiceDetail />} />
              <Route
                path="/profile/:username"
                element={<MentorPublicProfile />}
              />
              <Route path="/booking" element={<BookingPage />} />
              <Route
                path="/booking/confirmed/:bookingId"
                element={<BookingConfirmed />}
              />
              <Route path="/book/:id" element={<BookingPage />} />
              <Route path="/booking-success" element={<BookingSuccess />} />
              <Route path="/dashboard" element={<StudentDashboard />} />
              <Route path="/student/dashboard" element={<StudentDashboard />} />
              <Route path="/student/support" element={<StudentSupport />} />
              <Route path="/mentor/support" element={<StudentSupport />} />
              <Route path="/support" element={<StudentSupport />} />
              <Route path="/how-it-works" element={<HowItWorks />} />
              <Route path="/about-us" element={<AboutUs />} />
              <Route path="/privacy" element={<PrivacyPolicy />} />
              <Route path="/signup" element={<RoleSelection />} />
              <Route path="/student/signup" element={<StudentSignup />} />
              <Route path="/student/login" element={<StudentLogin />} />
              <Route path="/auth/callback" element={<AuthCallback />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/mentor/signup" element={<MentorSignup />} />
              <Route path="/expert/signup" element={<MentorSignup />} />
              <Route path="/expert/login" element={<ExpertLogin />} />
              <Route path="/expert/onboarding" element={<ExpertOnboarding />} />
              <Route path="/expert/onboarding/phase-1/success" element={<OnboardingPhase1Success />} />
              <Route path="/expert/onboarding/phase-2" element={<ExpertOnboardingPhase2 />} />
              <Route path="/expert/migrate-availability" element={<MigrateAvailability />} />
              <Route path="/expert/dashboard" element={<ExpertDashboard />} />
              <Route path="/mentor/dashboard" element={<MentorDashboard />} />
              <Route path="/dashboard/:username" element={<MentorDashboard />} />
              {(import.meta.env.DEV || import.meta.env.VITE_ENABLE_PAYOUT_TEST_PAGE === "true") && (
                <Route path="/mentor/payout-test" element={<PayoutRequestTest />} />
              )}
              {(import.meta.env.DEV || import.meta.env.VITE_ENABLE_PHONE_OTP_TEST_PAGE === "true") && (
                <Route path="/test/phone-otp" element={<PhoneOtpTest />} />
              )}
              {(import.meta.env.DEV || import.meta.env.VITE_ENABLE_MSG91_WHATSAPP_TEST_PAGE === "true") && (
                <Route path="/test/msg91-whatsapp" element={<Msg91WhatsAppTest />} />
              )}
              
              {/* Admin Routes */}
              <Route path="/admin/login" element={<AdminLogin />} />
              <Route path="/admin" element={<ProtectedAdminRoute><AdminDashboard /></ProtectedAdminRoute>} />
              <Route path="/admin/mentor-verification" element={<ProtectedAdminRoute><AdminMentorVerification /></ProtectedAdminRoute>} />
              <Route path="/admin/user-management" element={<ProtectedAdminRoute><AdminUserManagement /></ProtectedAdminRoute>} />
              <Route path="/admin/withdrawals" element={<ProtectedAdminRoute><AdminWithdrawals /></ProtectedAdminRoute>} />
              <Route path="/admin/review-moderation" element={<ProtectedAdminRoute><AdminReviewModeration /></ProtectedAdminRoute>} />
              
              <Route path="*" element={<NotFound />} />
            </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </AdminAuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
