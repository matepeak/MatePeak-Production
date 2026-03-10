import { supabase } from "@/integrations/supabase/client";
import { startOfWeek, endOfWeek } from "date-fns";

interface BookingLimitCheck {
  allowed: boolean;
  currentBookings: number;
  maxBookings: number;
  tier: 'basic' | 'verified' | 'top';
  message?: string;
}

/**
 * Check if mentor has reached their weekly booking limit based on tier
 */
export async function checkBookingLimit(mentorId: string): Promise<BookingLimitCheck> {
  try {
    // Get mentor's profile with tier info
    const { data: profile, error: profileError } = await supabase
      .from('expert_profiles')
      .select('mentor_tier, max_weekly_bookings')
      .eq('id', mentorId)
      .single();

    if (profileError) throw profileError;

    const tier = profile.mentor_tier || 'basic';
    const maxBookings = profile.max_weekly_bookings || getTierBookingLimit(tier);

    // Count this week's bookings
    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 1 }); // Monday
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 }); // Sunday

    const { count, error: countError } = await supabase
      .from('booking_requests')
      .select('*', { count: 'exact', head: true })
      .eq('mentor_id', mentorId)
      .in('status', ['pending', 'confirmed', 'completed'])
      .gte('booking_date', weekStart.toISOString())
      .lte('booking_date', weekEnd.toISOString());

    if (countError) throw countError;

    const currentBookings = count || 0;
    const allowed = currentBookings < maxBookings;

    return {
      allowed,
      currentBookings,
      maxBookings,
      tier,
      message: allowed 
        ? undefined 
        : `This mentor has reached their weekly booking limit (${maxBookings}/week for ${tier} tier)`
    };
  } catch (error) {
    console.error('Error checking booking limit:', error);
    // On error, allow booking to proceed (fail open)
    return {
      allowed: true,
      currentBookings: 0,
      maxBookings: 999,
      tier: 'basic'
    };
  }
}

/**
 * Get booking limit based on tier
 */
export function getTierBookingLimit(tier: 'basic' | 'verified' | 'top'): number {
  const limits = {
    basic: 5,
    verified: 15,
    top: 999 // Effectively unlimited
  };
  return limits[tier] || 5;
}

/**
 * Get tier requirements
 */
export function getNextTierRequirements(currentTier: 'basic' | 'verified' | 'top'): string[] {
  const requirements = {
    basic: [
      'Complete identity verification',
      'Add teaching credentials or certifications',
      'Fill profile to 70% completion'
    ],
    verified: [
      'Complete 10+ sessions',
      'Maintain 4.5+ average rating',
      'Achieve 90%+ response rate'
    ],
    top: [] // Already at top tier
  };
  return requirements[currentTier] || [];
}
