import { Button } from "@/components/ui/button";

export default function OnboardingSidebar() {
  return (
    <div className="bg-white p-10 flex flex-col justify-between min-h-screen sticky top-16 border-r border-gray-100">
      <div className="space-y-8">
        {/* Logo/Brand */}
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gray-900 flex items-center justify-center">
            <span className="text-white font-bold text-xs">SM</span>
          </div>
          <span className="font-bold text-gray-900 text-sm">SparkMentor</span>
        </div>

        {/* Decorative Avatars Pattern */}
        <div className="relative h-[400px] opacity-40">
          {/* Avatar circles arranged in decorative pattern */}
          <div className="absolute top-10 left-20 w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-purple-500"></div>
          <div className="absolute top-40 left-10 w-10 h-10 rounded-full bg-gradient-to-br from-pink-400 to-orange-400"></div>
          <div className="absolute top-80 left-16 w-14 h-14 rounded-full bg-gradient-to-br from-green-400 to-teal-500"></div>
          <div className="absolute top-[280px] left-32 w-11 h-11 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500"></div>
          <div className="absolute top-[160px] left-36 w-12 h-12 rounded-full bg-gradient-to-br from-indigo-400 to-blue-500"></div>
          <div className="absolute top-[340px] left-28 w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-pink-500"></div>
          <div className="absolute top-[100px] left-32 w-9 h-9 rounded-full bg-gradient-to-br from-cyan-400 to-blue-400"></div>
          
          {/* Dotted connecting lines */}
          <svg className="absolute inset-0 w-full h-full" style={{ overflow: 'visible' }}>
            <path d="M 80,50 Q 120,120 60,160" stroke="#e5e7eb" strokeWidth="1" fill="none" strokeDasharray="3,3" />
            <path d="M 120,180 Q 140,220 100,300" stroke="#e5e7eb" strokeWidth="1" fill="none" strokeDasharray="3,3" />
            <path d="M 80,330 Q 120,340 140,300" stroke="#e5e7eb" strokeWidth="1" fill="none" strokeDasharray="3,3" />
          </svg>
        </div>
      </div>

      {/* Contact Info at Bottom */}
      <div className="space-y-4 text-sm border-t border-gray-100 pt-6">
        <div>
          <p className="text-gray-500 text-xs mb-1">General</p>
          <p className="text-gray-900 font-medium">hello@sparkmentor.com</p>
        </div>
        <div>
          <p className="text-gray-500 text-xs mb-1">Sales</p>
          <p className="text-gray-900 font-medium">sales@sparkmentor.com</p>
        </div>
        <div>
          <p className="text-gray-500 text-xs mb-1">Support</p>
          <p className="text-gray-900 font-medium">support@sparkmentor.com</p>
        </div>
      </div>
    </div>
  );
}
