import React, { useState, useEffect, useMemo } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Clock, Info, Sparkles, Coffee, Briefcase, Sunset, Plus, X } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface AvailabilitySetupStepProps {
  form: UseFormReturn<any>;
}

interface TimeSlot {
  start: string;
  end: string;
}

interface DayAvailability {
  enabled: boolean;
  slots: TimeSlot[];
}

type WeeklyAvailability = {
  [key: string]: DayAvailability;
};

const DAYS_OF_WEEK = [
  { key: 'monday', label: 'Monday' },
  { key: 'tuesday', label: 'Tuesday' },
  { key: 'wednesday', label: 'Wednesday' },
  { key: 'thursday', label: 'Thursday' },
  { key: 'friday', label: 'Friday' },
  { key: 'saturday', label: 'Saturday' },
  { key: 'sunday', label: 'Sunday' },
];

const TIME_OPTIONS = Array.from({ length: 24 }, (_, i) => {
  const hour = i.toString().padStart(2, '0');
  return [`${hour}:00`, `${hour}:30`];
}).flat();

// Helper function to convert 24-hour time to 12-hour AM/PM format
const formatTimeToAMPM = (time24: string): string => {
  const [hour, minute] = time24.split(':').map(Number);
  const period = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${hour12}:${minute.toString().padStart(2, '0')} ${period}`;
};

// For Phase 1 onboarding, mentors set their weekly schedule pattern
// This will be converted to specific dates for the next 7 days
const getAvailableTimeOptions = (dayKey: string): string[] => {
  // Return all time options - mentors can set their weekly pattern regardless of current day/time
  // The actual slots will be created for the next 7 days starting from today
  return TIME_OPTIONS;
};

const SESSION_DURATIONS = [
  { value: 15, label: '15 minutes' },
  { value: 30, label: '30 minutes' },
  { value: 45, label: '45 minutes' },
  { value: 60, label: '1 hour' },
  { value: 90, label: '1.5 hours' },
  { value: 120, label: '2 hours' },
  { value: 180, label: '3 hours' },
];

const BUFFER_TIMES = [
  { value: 0, label: 'No buffer (back-to-back)' },
  { value: 5, label: '5 minutes' },
  { value: 10, label: '10 minutes' },
  { value: 15, label: '15 minutes' },
  { value: 30, label: '30 minutes' },
];

const ADVANCE_BOOKING_OPTIONS = [
  { value: 0, label: 'Same day booking allowed' },
  { value: 1, label: 'At least 1 day in advance' },
  { value: 2, label: 'At least 2 days in advance' },
  { value: 3, label: 'At least 3 days in advance' },
  { value: 7, label: 'At least 1 week in advance' },
  { value: 14, label: 'At least 2 weeks in advance' },
];

const SCHEDULE_TEMPLATES = [
  {
    name: 'Full-time Mentor',
    icon: Briefcase,
    description: 'Mon-Fri, 9 AM - 5 PM',
    schedule: {
      monday: { enabled: true, slots: [{ start: '09:00', end: '17:00' }] },
      tuesday: { enabled: true, slots: [{ start: '09:00', end: '17:00' }] },
      wednesday: { enabled: true, slots: [{ start: '09:00', end: '17:00' }] },
      thursday: { enabled: true, slots: [{ start: '09:00', end: '17:00' }] },
      friday: { enabled: true, slots: [{ start: '09:00', end: '17:00' }] },
      saturday: { enabled: false, slots: [{ start: '09:00', end: '17:00' }] },
      sunday: { enabled: false, slots: [{ start: '09:00', end: '17:00' }] },
    }
  },
  {
    name: 'Evening & Weekends',
    icon: Sunset,
    description: 'Evenings + Sat-Sun',
    schedule: {
      monday: { enabled: true, slots: [{ start: '18:00', end: '21:00' }] },
      tuesday: { enabled: true, slots: [{ start: '18:00', end: '21:00' }] },
      wednesday: { enabled: true, slots: [{ start: '18:00', end: '21:00' }] },
      thursday: { enabled: true, slots: [{ start: '18:00', end: '21:00' }] },
      friday: { enabled: true, slots: [{ start: '18:00', end: '21:00' }] },
      saturday: { enabled: true, slots: [{ start: '10:00', end: '13:00' }, { start: '14:00', end: '18:00' }] },
      sunday: { enabled: true, slots: [{ start: '10:00', end: '13:00' }, { start: '14:00', end: '18:00' }] },
    }
  },
  {
    name: 'Flexible Schedule',
    icon: Coffee,
    description: 'Variable hours daily',
    schedule: {
      monday: { enabled: true, slots: [{ start: '10:00', end: '14:00' }] },
      tuesday: { enabled: true, slots: [{ start: '10:00', end: '14:00' }] },
      wednesday: { enabled: true, slots: [{ start: '10:00', end: '14:00' }] },
      thursday: { enabled: true, slots: [{ start: '10:00', end: '14:00' }] },
      friday: { enabled: true, slots: [{ start: '10:00', end: '14:00' }] },
      saturday: { enabled: false, slots: [{ start: '09:00', end: '17:00' }] },
      sunday: { enabled: false, slots: [{ start: '09:00', end: '17:00' }] },
    }
  },
];

const TIMEZONES = [
  // India (Default)
  'Asia/Kolkata',
  // Asia - Major
  'Asia/Dubai',
  'Asia/Singapore',
  'Asia/Bangkok',
  'Asia/Hong_Kong',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Asia/Seoul',
  'Asia/Dhaka',
  'Asia/Karachi',
  'Asia/Jakarta',
  'Asia/Manila',
  // Europe - Major
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Europe/Istanbul',
  'Europe/Moscow',
  // Americas - Major
  'America/New_York',
  'America/Chicago',
  'America/Los_Angeles',
  'America/Toronto',
  'America/Mexico_City',
  'America/Sao_Paulo',
  // Australia
  'Australia/Sydney',
  'Australia/Melbourne',
  // Pacific
  'Pacific/Auckland',
  // Africa
  'Africa/Cairo',
  'Africa/Johannesburg',
  // UTC
  'UTC',
];

export const AvailabilitySetupStep = ({
  form
}: AvailabilitySetupStepProps) => {
  const [timezone, setTimezone] = useState('Asia/Kolkata');
  const [sessionDuration, setSessionDuration] = useState(60);
  const [bufferTime, setBufferTime] = useState(15);
  const [advanceBooking, setAdvanceBooking] = useState(1);
  const [maxSessionsPerDay, setMaxSessionsPerDay] = useState<number | null>(null);
  const [maxSessionsPerWeek, setMaxSessionsPerWeek] = useState<number | null>(null);
  const [availability, setAvailability] = useState<WeeklyAvailability>(() => {
    const initial: WeeklyAvailability = {};
    DAYS_OF_WEEK.forEach(day => {
      initial[day.key] = {
        enabled: false,
        slots: [{ start: '09:00', end: '17:00' }]
      };
    });
    return initial;
  });



  // Check which services require scheduling
  const hasSchedulingService = useMemo(() => {
    const servicePricing = form.getValues('servicePricing');
    return servicePricing?.oneOnOneSession?.enabled || servicePricing?.chatAdvice?.enabled;
  }, [form.watch('servicePricing')]);

  // Helper function to sort time slots
  const sortSlots = (slots: TimeSlot[]): TimeSlot[] => {
    return [...slots].sort((a, b) => a.start.localeCompare(b.start));
  };

  // Load existing availability from form if any
  useEffect(() => {
    const existingHours = form.getValues('availableHours');
    const existingTimezone = form.getValues('timezone');
    const existingSessionDuration = form.getValues('sessionDuration');
    const existingBufferTime = form.getValues('bufferTime');
    const existingAdvanceBooking = form.getValues('advanceBooking');
    const existingMaxSessionsPerDay = form.getValues('maxSessionsPerDay');
    const existingMaxSessionsPerWeek = form.getValues('maxSessionsPerWeek');
    
    if (existingHours && Object.keys(existingHours).length > 0) {
      setAvailability(existingHours);
    }
    if (existingTimezone) {
      setTimezone(existingTimezone);
    }
    if (existingSessionDuration) {
      setSessionDuration(existingSessionDuration);
    }
    if (existingBufferTime !== undefined) {
      setBufferTime(existingBufferTime);
    }
    if (existingAdvanceBooking !== undefined) {
      setAdvanceBooking(existingAdvanceBooking);
    }
    if (existingMaxSessionsPerDay) {
      setMaxSessionsPerDay(existingMaxSessionsPerDay);
    }
    if (existingMaxSessionsPerWeek) {
      setMaxSessionsPerWeek(existingMaxSessionsPerWeek);
    }
  }, [form]);

  // Update form values whenever availability or settings change
  useEffect(() => {
    form.setValue('availableHours', availability);
    form.setValue('timezone', timezone);
    form.setValue('sessionDuration', sessionDuration);
    form.setValue('bufferTime', bufferTime);
    form.setValue('advanceBooking', advanceBooking);
    form.setValue('maxSessionsPerDay', maxSessionsPerDay);
    form.setValue('maxSessionsPerWeek', maxSessionsPerWeek);
  }, [availability, timezone, sessionDuration, bufferTime, advanceBooking, maxSessionsPerDay, maxSessionsPerWeek, form]);

  const toggleDay = (dayKey: string) => {
    setAvailability(prev => {
      const currentDay = prev[dayKey];
      
      // If trying to enable a day, check validations
      if (!currentDay.enabled) {
        const currentTotalSlots = Object.values(prev).reduce((total, day) => {
          return total + (day.enabled ? day.slots.length : 0);
        }, 0);
        
        // Each day starts with 1 slot, so check if enabling would exceed limit
        if (currentTotalSlots >= PHASE1_MAX_TOTAL_SLOTS) {
          toast.error('Maximum Slots Reached', {
            description: `Phase 1 mentors can add up to ${PHASE1_MAX_TOTAL_SLOTS} total availability slots. You've used all ${PHASE1_MAX_TOTAL_SLOTS} slots.`,
          });
          return prev;
        }
        
        // When enabling a day, set initial slot to 09:00 - 09:30 (or first available time)
        const preferredStartTime = '09:00';
        const preferredEndTime = '09:30';
        
        // Get available times for this day
        const availableTimes = getAvailableTimeOptions(dayKey);
        
        // Check if preferred time is available, otherwise use first available
        const defaultStart = availableTimes.includes(preferredStartTime) ? preferredStartTime : availableTimes[0];
        const startIndex = availableTimes.indexOf(defaultStart);
        const defaultEnd = availableTimes[Math.min(startIndex + 1, availableTimes.length - 1)]; // 30 minutes later
        
        return {
          ...prev,
          [dayKey]: {
            enabled: true,
            slots: [{ start: defaultStart, end: defaultEnd }]
          }
        };
      }
      
      // Disabling day
      return {
        ...prev,
        [dayKey]: {
          ...prev[dayKey],
          enabled: false
        }
      };
    });
  };

  const updateDayTime = (dayKey: string, slotIndex: number, field: 'start' | 'end', value: string) => {
    setAvailability(prev => {
      // Check if the selected time is in the past
      if (isTimeInPast(dayKey, value)) {
        toast.error('Cannot Select Past Time', {
          description: 'Please select a time in the future. Past times cannot be used for availability.',
        });
        return prev;
      }
      
      const updatedSlots = prev[dayKey].slots.map((slot, idx) =>
        idx === slotIndex ? { ...slot, [field]: value } : slot
      );

      // Validate the updated slot
      const updatedSlot = updatedSlots[slotIndex];
      
      // Check if start time equals end time
      if (updatedSlot.start === updatedSlot.end) {
        toast.error('Invalid Time Range', {
          description: 'Start and end time cannot be the same',
        });
        return prev; // Don't update if invalid
      }

      // Check if start time is after end time (no overnight slots in onboarding)
      if (updatedSlot.start > updatedSlot.end) {
        toast.error('Invalid Time Range', {
          description: 'Start time must be before end time',
        });
        return prev; // Don't update if invalid
      }

      // Check duration is at least 15 minutes
      const [startHours, startMins] = updatedSlot.start.split(':').map(Number);
      const [endHours, endMins] = updatedSlot.end.split(':').map(Number);
      const durationMinutes = (endHours * 60 + endMins) - (startHours * 60 + startMins);
      
      if (durationMinutes < 15) {
        toast.error('Slot Too Short', {
          description: 'Time slot must be at least 15 minutes long',
        });
        return prev; // Don't update if invalid
      }

      // Check for overlaps with other slots in the same day
      for (let i = 0; i < updatedSlots.length; i++) {
        if (i === slotIndex) continue; // Skip comparing with itself
        
        const otherSlot = updatedSlots[i];
        const overlap = (
          (updatedSlot.start >= otherSlot.start && updatedSlot.start < otherSlot.end) ||
          (updatedSlot.end > otherSlot.start && updatedSlot.end <= otherSlot.end) ||
          (updatedSlot.start <= otherSlot.start && updatedSlot.end >= otherSlot.end)
        );

        if (overlap) {
          toast.error('Overlapping Time Slots', {
            description: `This time overlaps with another slot (${otherSlot.start} - ${otherSlot.end})`,
          });
          return prev; // Don't update if overlapping
        }
      }

      // All validations passed, update the state
      return {
        ...prev,
        [dayKey]: {
          ...prev[dayKey],
          slots: updatedSlots
        }
      };
    });
  };

  const addTimeSlot = (dayKey: string) => {
    setAvailability(prev => {
      // Check total slots across all days (Phase 1 limit)
      const currentTotalSlots = Object.values(prev).reduce((total, day) => {
        return total + (day.enabled ? day.slots.length : 0);
      }, 0);
      
      if (currentTotalSlots >= PHASE1_MAX_TOTAL_SLOTS) {
        toast.error('Maximum Slots Reached', {
          description: `Phase 1 mentors can add up to ${PHASE1_MAX_TOTAL_SLOTS} total availability slots across all days. Complete verification to add more.`,
        });
        return prev;
      }
      
      const currentSlots = prev[dayKey].slots;
      
      // Limit to maximum 5 slots per day to avoid UI clutter
      if (currentSlots.length >= 5) {
        toast.error('Maximum Slots Per Day', {
          description: 'You can add up to 5 time slots per day',
        });
        return prev;
      }

      // Default new slot times - consecutive slots start where previous ended
      const availableTimes = getAvailableTimeOptions(dayKey);
      
      let newStart = '09:00'; // Default to 9:00 AM
      let newEnd = '09:30';   // Default to 9:30 AM (30 minutes)
      
      // If there are existing slots, new slot starts where last one ended
      if (currentSlots.length > 0) {
        const sortedSlots = [...currentSlots].sort((a, b) => a.start.localeCompare(b.start));
        const lastSlot = sortedSlots[sortedSlots.length - 1];
        
        // New slot starts where last slot ended
        newStart = lastSlot.end;
        
        // Find the index of this start time and add 30 minutes (1 slot)
        const startIndex = availableTimes.indexOf(newStart);
        if (startIndex !== -1 && startIndex + 1 < availableTimes.length) {
          newEnd = availableTimes[startIndex + 1]; // 30 minutes later
        } else {
          // If end time not available, show error
          toast.error('Cannot Add Slot', {
            description: 'No more time available after the last slot. Try removing a slot or choosing different times.',
          });
          return prev;
        }
      } else {
        // First slot: use 09:00-09:30 if available, otherwise first available time
        if (!availableTimes.includes(newStart)) {
          newStart = availableTimes[0];
        }
        const startIndex = availableTimes.indexOf(newStart);
        newEnd = availableTimes[Math.min(startIndex + 1, availableTimes.length - 1)];
      }
      
      const newSlots = [...currentSlots, { start: newStart, end: newEnd }];
      
      // Sort slots by start time for better UX
      const sortedSlots = newSlots.sort((a, b) => a.start.localeCompare(b.start));
      
      toast.success('Time slot added');
      
      return {
        ...prev,
        [dayKey]: {
          ...prev[dayKey],
          slots: sortedSlots
        }
      };
    });
  };

  const removeTimeSlot = (dayKey: string, slotIndex: number) => {
    setAvailability(prev => {
      const currentSlots = prev[dayKey].slots;
      
      // Ensure at least one slot remains
      if (currentSlots.length <= 1) {
        toast.error('Cannot Remove', {
          description: 'Each enabled day must have at least one time slot',
        });
        return prev;
      }
      
      const updatedSlots = currentSlots.filter((_, idx) => idx !== slotIndex);
      toast.success('Time slot removed');
      
      return {
        ...prev,
        [dayKey]: {
          ...prev[dayKey],
          slots: updatedSlots
        }
      };
    });
  };

  const applyTemplate = (template: typeof SCHEDULE_TEMPLATES[0]) => {
    // Sort slots in each day of the template
    const sortedTemplate: WeeklyAvailability = {};
    Object.keys(template.schedule).forEach(dayKey => {
      sortedTemplate[dayKey] = {
        ...template.schedule[dayKey],
        slots: sortSlots(template.schedule[dayKey].slots)
      };
    });
    
    setAvailability(sortedTemplate);
    toast.success(`Applied "${template.name}" template`);
  };

  const enabledDaysCount = Object.values(availability).filter(day => day.enabled).length;

  // Calculate total slots across all days (Phase 1 limit: 5 total slots)
  const totalSlots = useMemo(() => {
    return Object.values(availability).reduce((total, day) => {
      return total + (day.enabled ? day.slots.length : 0);
    }, 0);
  }, [availability]);

  const PHASE1_MAX_TOTAL_SLOTS = 5; // Limit for unverified mentors
  const slotsRemaining = PHASE1_MAX_TOTAL_SLOTS - totalSlots;

  // Phase 1 mentors (5 total slots) are limited to max 30-minute sessions
  const PHASE1_MAX_SESSION_DURATION = 30;
  const availableSessionDurations = useMemo(() => {
    // For Phase 1 mentors, only show 15 and 30 minute options
    return SESSION_DURATIONS.filter(duration => duration.value <= PHASE1_MAX_SESSION_DURATION);
  }, []);

  // Auto-cap session duration if it exceeds Phase 1 limit
  useEffect(() => {
    if (sessionDuration > PHASE1_MAX_SESSION_DURATION) {
      setSessionDuration(PHASE1_MAX_SESSION_DURATION);
      toast.info('Session Duration Adjusted', {
        description: `Phase 1 mentors are limited to ${PHASE1_MAX_SESSION_DURATION}-minute sessions. Verify your account to offer longer sessions.`,
      });
    }
  }, [sessionDuration]);

  // Calculate sessions per day example
  const calculateMaxSessions = () => {
    if (enabledDaysCount === 0) return 0;
    const firstEnabledDay = Object.values(availability).find(day => day.enabled);
    if (!firstEnabledDay) return 0;
    
    const sessionWithBuffer = sessionDuration + bufferTime;
    let totalSessions = 0;
    
    // Calculate sessions for all slots in the day
    firstEnabledDay.slots.forEach(slot => {
      const [startHour, startMin] = slot.start.split(':').map(Number);
      const [endHour, endMin] = slot.end.split(':').map(Number);
      const totalMinutes = (endHour * 60 + endMin) - (startHour * 60 + startMin);
      totalSessions += Math.floor(totalMinutes / sessionWithBuffer);
    });
    
    return totalSessions;
  };

  return (
    <div className="space-y-8">
      {/* Optional vs Required Notice */}
      {!hasSchedulingService && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="font-semibold text-blue-900 mb-1">Availability is Optional for Your Services</h4>
              <p className="text-sm text-blue-700">
                You're offering digital products or resources that students can access anytime. 
                You can skip setting availability and proceed to complete your profile.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Explanatory Header */}
      <div className="bg-gray-50 rounded-xl p-5">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-gray-600 mt-0.5 flex-shrink-0" />
          <div className="space-y-2">
            <h4 className="font-bold text-gray-900">What does availability mean?</h4>
            <ul className="text-sm text-gray-600 space-y-1.5">
              <li className="flex items-start gap-2">
                <span className="text-gray-500 mt-1">•</span>
                <span><strong>Your booking window:</strong> These are times when students CAN book sessions with you</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-gray-600 mt-1">•</span>
                <span><strong>Not a commitment:</strong> You won't work all these hours - only when students book you</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-gray-600 mt-1">•</span>
                <span><strong>Flexible control:</strong> You can block specific dates later (vacations, busy days, etc.)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-gray-600 mt-1">•</span>
                <span><strong>Manage limits:</strong> Set how many sessions per day/week you're comfortable with</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-600 mt-1">•</span>
                <span><strong>Phase 1 Limits:</strong> Max {PHASE1_MAX_TOTAL_SLOTS} availability slots for the next 7 days and {PHASE1_MAX_SESSION_DURATION}-minute sessions - both expand after verification</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Timezone Selection */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-gray-600" />
          <Label htmlFor="timezone" className="text-sm font-bold text-gray-900">
            Your Timezone
          </Label>
        </div>
        <p className="text-sm text-gray-600">
          Essential for coordinating with international students
        </p>
        <Select value={timezone} onValueChange={setTimezone}>
          <SelectTrigger id="timezone" className="h-11 border-gray-200 focus:border-gray-400 focus:ring-1 focus:ring-gray-400 rounded-lg transition-colors">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TIMEZONES.map(tz => (
              <SelectItem key={tz} value={tz}>
                {tz.replace(/_/g, ' ')}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Weekly Schedule */}
      <div className="space-y-3 mt-10">
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-sm font-bold text-gray-900">Your Weekly Availability Pattern (Next 7 Days){hasSchedulingService ? '*' : ' (Optional)'}</Label>
            <p className="text-xs text-gray-600 mt-1">
              {hasSchedulingService 
                ? "Choose your typical weekly schedule - we'll create slots for the next 7 days" 
                : "Optional: Set availability if you want to offer scheduled sessions in the future"}
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-600">
              {enabledDaysCount} {enabledDaysCount === 1 ? 'day' : 'days'} selected
            </span>
            <span className="text-gray-400">•</span>
            <span className={cn(
              "font-semibold",
              totalSlots >= PHASE1_MAX_TOTAL_SLOTS ? "text-red-600" : "text-green-600"
            )}>
              {totalSlots}/{PHASE1_MAX_TOTAL_SLOTS} slots used
            </span>
            <span className="text-gray-400">•</span>
            <span className="text-gray-500">Min 15 min each</span>
          </div>
        </div>
        
        {/* Phase 1 Limit Notice */}
        {totalSlots >= PHASE1_MAX_TOTAL_SLOTS && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-sm text-amber-800">
              <strong>Phase 1 Limit Reached:</strong> You've used all {PHASE1_MAX_TOTAL_SLOTS} availability slots. 
              Complete Phase 2 verification to add unlimited slots.
            </p>
          </div>
        )}
        
        {DAYS_OF_WEEK.map(day => {
          const isEnabled = availability[day.key].enabled;
          const slotCount = availability[day.key].slots.length;
          const canEnableDay = isEnabled || totalSlots < PHASE1_MAX_TOTAL_SLOTS;
          
          return (
            <div 
              key={day.key} 
              className={cn(
                "flex flex-col gap-3 p-4 border rounded-xl transition-all",
                isEnabled ? "border-gray-900 bg-gray-50" : "border-gray-200 bg-white",
                !canEnableDay && "opacity-60"
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Checkbox
                    id={day.key}
                    checked={isEnabled}
                    disabled={!canEnableDay}
                    onCheckedChange={() => toggleDay(day.key)}
                  />
                  <Label
                    htmlFor={day.key}
                    className={cn(
                      "font-medium cursor-pointer text-gray-900",
                      !canEnableDay && "cursor-not-allowed text-gray-400"
                    )}
                  >
                    {day.label}
                  </Label>
                  {!canEnableDay && (
                    <span className="text-xs text-amber-600 font-medium">(Limit reached)</span>
                  )}
                </div>
                {isEnabled && slotCount > 1 && (
                  <span className="text-xs text-gray-500 font-medium">
                    {slotCount} time slots
                  </span>
                )}
              </div>

              {isEnabled && (
                <div className="space-y-2 ml-7">
                  {availability[day.key].slots.map((slot, slotIndex) => (
                    <div key={slotIndex} className="flex items-center gap-3 flex-wrap">
                      {slotCount > 1 && (
                        <span className="text-xs text-gray-500 font-medium min-w-[60px]">
                          Slot {slotIndex + 1}:
                        </span>
                      )}
                      <Select
                        value={slot.start}
                        onValueChange={(value) => updateDayTime(day.key, slotIndex, 'start', value)}
                      >
                        <SelectTrigger className="w-[180px] h-10 border-gray-200 focus:border-gray-400 focus:ring-1 focus:ring-gray-400 rounded-lg transition-colors">
                          <SelectValue>
                            <span className="font-semibold">{slot.start}</span>
                            <span className="text-xs text-gray-500 ml-1">({formatTimeToAMPM(slot.start)})</span>
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent className="max-h-60">
                          {getAvailableTimeOptions(day.key).map(time => (
                            <SelectItem key={time} value={time}>
                              <span className="font-semibold">{time}</span>
                              <span className="text-xs text-gray-500 ml-1">({formatTimeToAMPM(time)})</span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <span className="text-gray-400 text-sm font-medium">to</span>

                      <Select
                        value={slot.end}
                        onValueChange={(value) => updateDayTime(day.key, slotIndex, 'end', value)}
                      >
                        <SelectTrigger className="w-[180px] h-10 border-gray-200 focus:border-gray-400 focus:ring-1 focus:ring-gray-400 rounded-lg transition-colors">
                          <SelectValue>
                            <span className="font-semibold">{slot.end}</span>
                            <span className="text-xs text-gray-500 ml-1">({formatTimeToAMPM(slot.end)})</span>
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent className="max-h-60">
                          {getAvailableTimeOptions(day.key).map(time => (
                            <SelectItem key={time} value={time}>
                              <span className="font-semibold">{time}</span>
                              <span className="text-xs text-gray-500 ml-1">({formatTimeToAMPM(time)})</span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      {/* Remove button - show if more than 1 slot */}
                      {availability[day.key].slots.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeTimeSlot(day.key, slotIndex)}
                          className="p-2 rounded-lg hover:bg-red-50 text-gray-500 hover:text-red-600 transition-colors"
                          aria-label="Remove time slot"
                          title="Remove this time slot"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}

                      {/* Add button - show on last slot */}
                      {slotIndex === availability[day.key].slots.length - 1 && slotCount < 5 && totalSlots < PHASE1_MAX_TOTAL_SLOTS && (
                        <button
                          type="button"
                          onClick={() => addTimeSlot(day.key)}
                          className="p-2 rounded-lg hover:bg-green-50 text-gray-500 hover:text-green-600 transition-colors"
                          aria-label="Add time slot"
                          title="Add another time slot"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
        
        {/* Helper text */}
        <div className="text-xs text-gray-500 space-y-1 pl-1">
          <p>• Slots must be at least 15 minutes and max {PHASE1_MAX_SESSION_DURATION} minutes (verification is done after Phase 2 completion, you can complete Phase 2 from your dashboard)</p>
          <p>• You can add multiple slots per day for breaks or split schedules</p>
        </div>
      </div>
    </div>
  );
};
