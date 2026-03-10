import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Shield, CheckCircle, TrendingUp, Award, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface VerificationUpgradeCardProps {
  currentTier: 'basic' | 'verified' | 'top';
  verificationStatus?: 'pending' | 'verified' | 'failed' | null;
  currentBookings?: number;
  maxBookings?: number;
  profileCompletion?: number;
}

export const VerificationUpgradeCard = ({
  currentTier,
  verificationStatus,
  currentBookings = 0,
  maxBookings = 5,
  profileCompletion = 0
}: VerificationUpgradeCardProps) => {
  const navigate = useNavigate();

  // Don't show if already verified
  if (currentTier === 'verified' || currentTier === 'top' || verificationStatus === 'verified') {
    return null;
  }

  // Show pending status if in review
  if (verificationStatus === 'pending') {
    return (
      <Card className="p-6 bg-blue-50 border-blue-200">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-blue-100 rounded-full">
            <Shield className="w-6 h-6 text-blue-600" />
          </div>
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold text-blue-900">Verification In Review</h3>
              <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                Pending
              </Badge>
            </div>
            <p className="text-sm text-blue-800">
              Your verification documents are being reviewed. We'll notify you within 24 hours.
            </p>
            <div className="flex items-center gap-2 text-xs text-blue-600">
              <CheckCircle className="w-4 h-4" />
              <span>Documents submitted successfully</span>
            </div>
          </div>
        </div>
      </Card>
    );
  }

  // Show retry if failed
  if (verificationStatus === 'failed') {
    return (
      <Card className="p-6 bg-orange-50 border-orange-200">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-orange-100 rounded-full">
            <Shield className="w-6 h-6 text-orange-600" />
          </div>
          <div className="flex-1 space-y-3">
            <h3 className="text-lg font-semibold text-orange-900">Verification Needs Attention</h3>
            <p className="text-sm text-orange-800">
              Your verification couldn't be completed. Please review the feedback and try again.
            </p>
            <Button 
              variant="outline" 
              className="border-orange-300 hover:bg-orange-100"
              onClick={() => navigate('/verification')}
            >
              Review & Resubmit
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  // Calculate urgency level
  const bookingProgress = (currentBookings / maxBookings) * 100;
  const isNearLimit = bookingProgress >= 80;
  const showUrgent = isNearLimit || currentBookings >= maxBookings;

  return (
    <Card className={`p-6 ${showUrgent ? 'bg-gradient-to-br from-orange-50 to-red-50 border-orange-200' : 'bg-gradient-to-br from-blue-50 to-purple-50 border-blue-200'}`}>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-full ${showUrgent ? 'bg-orange-100' : 'bg-blue-100'}`}>
              <Shield className={`w-6 h-6 ${showUrgent ? 'text-orange-600' : 'text-blue-600'}`} />
            </div>
            <div className="space-y-1">
              <h3 className={`text-lg font-semibold ${showUrgent ? 'text-orange-900' : 'text-blue-900'}`}>
                {showUrgent ? '⚠️ Upgrade to Accept More Bookings' : '📈 Upgrade to Verified Tier'}
              </h3>
              <p className={`text-sm ${showUrgent ? 'text-orange-800' : 'text-blue-800'}`}>
                {showUrgent 
                  ? `You're at ${currentBookings}/${maxBookings} weekly bookings. Get verified to accept 15/week!`
                  : 'Unlock verified badge and accept 3x more bookings per week'
                }
              </p>
            </div>
          </div>
          <Badge variant="secondary" className={showUrgent ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}>
            Basic Tier
          </Badge>
        </div>

        {/* Booking Progress (if near limit) */}
        {isNearLimit && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-orange-700 font-medium">Weekly Booking Limit</span>
              <span className="text-orange-900 font-bold">{currentBookings}/{maxBookings}</span>
            </div>
            <Progress value={bookingProgress} className="h-2" />
          </div>
        )}

        {/* Benefits Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className={`p-3 rounded-lg ${showUrgent ? 'bg-white/80' : 'bg-white/60'}`}>
            <div className="flex items-start gap-2">
              <CheckCircle className={`w-4 h-4 mt-0.5 ${showUrgent ? 'text-orange-600' : 'text-blue-600'}`} />
              <div>
                <p className="text-sm font-semibold">15 Bookings/Week</p>
                <p className="text-xs text-muted-foreground">vs. 5 in Basic</p>
              </div>
            </div>
          </div>

          <div className={`p-3 rounded-lg ${showUrgent ? 'bg-white/80' : 'bg-white/60'}`}>
            <div className="flex items-start gap-2">
              <Award className={`w-4 h-4 mt-0.5 ${showUrgent ? 'text-orange-600' : 'text-blue-600'}`} />
              <div>
                <p className="text-sm font-semibold">Verified Badge</p>
                <p className="text-xs text-muted-foreground">Build trust</p>
              </div>
            </div>
          </div>

          <div className={`p-3 rounded-lg ${showUrgent ? 'bg-white/80' : 'bg-white/60'}`}>
            <div className="flex items-start gap-2">
              <TrendingUp className={`w-4 h-4 mt-0.5 ${showUrgent ? 'text-orange-600' : 'text-blue-600'}`} />
              <div>
                <p className="text-sm font-semibold">Higher Ranking</p>
                <p className="text-xs text-muted-foreground">Better visibility</p>
              </div>
            </div>
          </div>

          <div className={`p-3 rounded-lg ${showUrgent ? 'bg-white/80' : 'bg-white/60'}`}>
            <div className="flex items-start gap-2">
              <CheckCircle className={`w-4 h-4 mt-0.5 ${showUrgent ? 'text-orange-600' : 'text-blue-600'}`} />
              <div>
                <p className="text-sm font-semibold">+25% Earnings</p>
                <p className="text-xs text-muted-foreground">Average increase</p>
              </div>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="flex items-center gap-3 pt-2">
          <Button 
            className={`flex-1 ${showUrgent ? 'bg-orange-600 hover:bg-orange-700' : 'bg-blue-600 hover:bg-blue-700'}`}
            onClick={() => navigate('/verification')}
          >
            Get Verified Now
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
          <Button 
            variant="outline" 
            className="border-gray-300"
            onClick={() => navigate('/verification/learn-more')}
          >
            Learn More
          </Button>
        </div>

        {/* Quick Info */}
        <p className="text-xs text-center text-muted-foreground">
          ⚡ Review in 24 hours • 📸 Upload ID + selfie • ✅ Keep accepting bookings while pending
        </p>
      </div>
    </Card>
  );
};
