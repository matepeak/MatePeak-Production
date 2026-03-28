import { Link } from "react-router-dom";

export default function OnboardingHeader() {
  return (
    <>
      {/* Minimal Header - Apple Style */}
      <nav className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 sm:px-12">
          <div className="flex justify-between items-center h-20">
            {/* Logo - Clean and Simple */}
            <Link to="/" className="flex items-center">
              <img
                src="/lovable-uploads/14bf0eea-1bc9-4675-9231-356df10eb82d.png"
                alt="MatePeak"
                className="h-10 w-auto"
              />
              <span className="ml-2.5 text-xl font-semibold tracking-tight text-gray-900">
                MatePeak
              </span>
            </Link>

            {/* Exit Link - Subtle */}
            <Link
              to="/"
              className="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors"
            >
              Exit
            </Link>
          </div>
        </div>
      </nav>
    </>
  );
}
