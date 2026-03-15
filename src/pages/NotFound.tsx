import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import SEO from "@/components/SEO";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white px-4">
      <SEO
        title="Page Not Found | MatePeak"
        description="This page does not exist on MatePeak."
        noindex
      />
      <div className="flex flex-col items-center justify-center mb-8">
        {/* Clean professional info icon */}
        <svg xmlns="http://www.w3.org/2000/svg" className="h-20 w-20 mb-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1">
          <circle cx="12" cy="12" r="10" stroke="#F59E42" strokeWidth="1" fill="none" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" stroke="#F59E42" d="M12 8.5v.01M12 11v4" />
        </svg>
        <style>{`
          @keyframes spin-slow {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          .animate-spin-slow {
            animation: spin-slow 2.5s linear infinite;
          }
        `}</style>
      </div>
      <h2 className="text-2xl font-extrabold text-gray-800 mb-2 tracking-tight">Coming Soon</h2>
  <p className="text-base text-gray-500 font-light mb-8 text-center">This page is under development and will be available soon.</p>
  <a href="/" className="inline-block px-5 py-2 rounded-lg bg-matepeak-primary text-white font-normal shadow hover:bg-matepeak-primary/90 transition">Return to Home</a>
    </div>
  );
};

export default NotFound;
