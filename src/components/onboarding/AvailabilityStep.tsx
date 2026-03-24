import { useState, useEffect, useMemo } from "react";
import { UseFormReturn } from "react-hook-form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Plus, X } from "lucide-react";
import { toast } from "@/components/ui/sonner";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const PHASE1_MAX_TOTAL_SLOTS = 5; // Phase 1 limit for unverified mentors

// Generate time slots in 15-minute intervals
const generateTimeSlots = () => {
  const slots = [];
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 15) {
      const time24 = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      slots.push(time24);
    }
  }
  return slots;
};

const TIME_SLOTS = generateTimeSlots();

// Helper function to convert 24-hour time to 12-hour AM/PM format
const formatTimeToAMPM = (time24: string): string => {
  const [hour, minute] = time24.split(':').map(Number);
  const period = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${hour12}:${minute.toString().padStart(2, '0')} ${period}`;
};

// Helper function to check if a specific time on a specific day is in the past
const isTimeInPast = (dayName: string, time24: string): boolean => {
  const now = new Date();
  const currentDayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
  
  // Map day names to JavaScript day numbers
  const dayMap: { [key: string]: number } = {
    'Sunday': 0,
    'Monday': 1,
    'Tuesday': 2,
    'Wednesday': 3,
    'Thursday': 4,
    'Friday': 5,
    'Saturday': 6
  };
  
  const targetDay = dayMap[dayName];
  if (targetDay === undefined) return false;
  
  // Only check for current day - other days are for future weeks
  if (targetDay !== currentDayOfWeek) return false;
  
  // For current day, check if the time has passed
  const [hours, minutes] = time24.split(':').map(Number);
  const currentHours = now.getHours();
  const currentMinutes = now.getMinutes();
  
  const timeInMinutes = hours * 60 + minutes;
  const nowInMinutes = currentHours * 60 + currentMinutes;
  
  return timeInMinutes <= nowInMinutes;
};

// Helper function to get available time slots (excluding past times for current day)
const getAvailableTimeSlots = (dayName: string): string[] => {
  const now = new Date();
  const currentDayOfWeek = now.getDay();
  
  const dayMap: { [key: string]: number } = {
    'Sunday': 0,
    'Monday': 1,
    'Tuesday': 2,
    'Wednesday': 3,
    'Thursday': 4,
    'Friday': 5,
    'Saturday': 6
  };
  
  const targetDay = dayMap[dayName];
  
  // For non-current days, return all time slots (they're for future weeks)
  if (targetDay !== currentDayOfWeek) {
    return TIME_SLOTS;
  }
  
  // For current day, filter out past times (add 30 min buffer)
  const currentHours = now.getHours();
  const currentMinutes = now.getMinutes();
  const nowInMinutes = currentHours * 60 + currentMinutes + 30; // 30-minute buffer
  
  return TIME_SLOTS.filter(time => {
    const [hours, minutes] = time.split(':').map(Number);
    const timeInMinutes = hours * 60 + minutes;
    return timeInMinutes > nowInMinutes;
  });
};

const TIMEZONES = [
  { value: "GMT-12:00", label: "(GMT-12:00) International Date Line West" },
  { value: "GMT-11:00", label: "(GMT-11:00) Midway Island, Samoa" },
  { value: "GMT-10:00", label: "(GMT-10:00) Hawaii" },
  { value: "GMT-09:00", label: "(GMT-09:00) Alaska" },
  { value: "GMT-08:00", label: "(GMT-08:00) Pacific Time (US & Canada)" },
  { value: "GMT-07:00", label: "(GMT-07:00) Mountain Time (US & Canada)" },
  { value: "GMT-06:00", label: "(GMT-06:00) Central Time (US & Canada)" },
  { value: "GMT-05:00", label: "(GMT-05:00) Eastern Time (US & Canada)" },
  { value: "GMT-04:00", label: "(GMT-04:00) Atlantic Time (Canada)" },
  { value: "GMT-03:30", label: "(GMT-03:30) Newfoundland" },
  { value: "GMT-03:00", label: "(GMT-03:00) Brasilia, Buenos Aires" },
  { value: "GMT-02:00", label: "(GMT-02:00) Mid-Atlantic" },
  { value: "GMT-01:00", label: "(GMT-01:00) Azores, Cape Verde Islands" },
  { value: "GMT+00:00", label: "(GMT+00:00) London, Dublin, Lisbon" },
  { value: "GMT+01:00", label: "(GMT+01:00) Paris, Berlin, Rome" },
  { value: "GMT+02:00", label: "(GMT+02:00) Cairo, Athens, Istanbul" },
  { value: "GMT+03:00", label: "(GMT+03:00) Moscow, Kuwait, Riyadh" },
  { value: "GMT+03:30", label: "(GMT+03:30) Tehran" },
  { value: "GMT+04:00", label: "(GMT+04:00) Abu Dhabi, Muscat, Baku" },
  { value: "GMT+04:30", label: "(GMT+04:30) Kabul" },
  { value: "GMT+05:00", label: "(GMT+05:00) Islamabad, Karachi, Tashkent" },
  { value: "GMT+05:30", label: "(GMT+05:30) Mumbai, Kolkata, New Delhi" },
  { value: "GMT+05:45", label: "(GMT+05:45) Kathmandu" },
  { value: "GMT+06:00", label: "(GMT+06:00) Dhaka, Almaty" },
  { value: "GMT+06:30", label: "(GMT+06:30) Yangon, Cocos Islands" },
  { value: "GMT+07:00", label: "(GMT+07:00) Bangkok, Hanoi, Jakarta" },
  { value: "GMT+08:00", label: "(GMT+08:00) Beijing, Singapore, Hong Kong" },
  { value: "GMT+09:00", label: "(GMT+09:00) Tokyo, Seoul" },
  { value: "GMT+09:30", label: "(GMT+09:30) Adelaide, Darwin" },
  { value: "GMT+10:00", label: "(GMT+10:00) Sydney, Melbourne, Brisbane" },
  { value: "GMT+11:00", label: "(GMT+11:00) Magadan, Solomon Islands" },
  { value: "GMT+12:00", label: "(GMT+12:00) Auckland, Wellington, Fiji" },
];

interface TimeSlot {
  from: string;
  to: string;
}

interface DayAvailability {
  day: string;
  enabled: boolean;
  timeslots: TimeSlot[];
}

export default function AvailabilityStep({ form }: { form: UseFormReturn<any> }) {
  const [timeZone, setTimeZone] = useState("GMT+05:30");
  const [dayAvailability, setDayAvailability] = useState<DayAvailability[]>(
    DAYS.map(day => ({
      day,
      enabled: false,
      timeslots: [{ from: "09:00", to: "17:00" }]
    }))
  );

  // Calculate total slots across all enabled days
  const totalSlots = useMemo(() => {
    return dayAvailability
      .filter(day => day.enabled)
      .reduce((total, day) => total + day.timeslots.length, 0);
  }, [dayAvailability]);

  // Get user's timezone on mount
  useEffect(() => {
    const now = new Date();
    const offset = -now.getTimezoneOffset() / 60;
    const sign = offset >= 0 ? "+" : "-";
    const absOffset = Math.abs(offset);
    const hours = Math.floor(absOffset);
    const minutes = (absOffset - hours) * 60;
    const gmtOffset = `GMT${sign}${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    
    const matchedTz = TIMEZONES.find(tz => tz.value === gmtOffset);
    if (matchedTz) {
      setTimeZone(matchedTz.value);
    }
  }, []);

  // Update form value when availability changes
  useEffect(() => {
    // Convert to object format expected by saveAvailabilitySlots
    const availableHours: { [key: string]: { enabled: boolean; slots: { start: string; end: string }[] } } = {};
    
    dayAvailability.forEach(day => {
      const dayKey = day.day.toLowerCase();
      availableHours[dayKey] = {
        enabled: day.enabled,
        slots: day.timeslots.map(slot => ({
          start: slot.from,
          end: slot.to
        }))
      };
    });
    
    // Save as availableHours (expected by expertProfileService)
    form.setValue("availableHours", availableHours);
    // Also save timezone
    form.setValue("timezone", timeZone);
  }, [dayAvailability, timeZone, form]);

  const toggleDay = (dayIndex: number) => {
    setDayAvailability(prev => {
      const targetDay = prev[dayIndex];
      
      // If enabling a day, check validations
      if (!targetDay.enabled) {
        // Check if available time slots exist for this day
        const availableTimes = getAvailableTimeSlots(targetDay.day);
        if (availableTimes.length === 0) {
          toast.error('Cannot Set Availability for Past Times', {
            description: 'All times for today have passed. You can set availability for other days or try again tomorrow.',
          });
          return prev;
        }
        
        const currentTotalSlots = prev
          .filter(d => d.enabled)
          .reduce((total, d) => total + d.timeslots.length, 0);
        
        const newDaySlots = targetDay.timeslots.length;
        
        if (currentTotalSlots + newDaySlots > PHASE1_MAX_TOTAL_SLOTS) {
          const slotsRemaining = PHASE1_MAX_TOTAL_SLOTS - currentTotalSlots;
          toast.error('Phase 1 Slot Limit Reached', {
            description: `You can only add ${slotsRemaining} more slot${slotsRemaining !== 1 ? 's' : ''}. Phase 1 mentors can have up to ${PHASE1_MAX_TOTAL_SLOTS} total availability slots.`,
          });
          return prev;
        }
        
        // When enabling, set initial slot to 09:00 - 09:30 (or first available time)
        const preferredStartTime = '09:00';
        const preferredEndTime = '09:30';
        
        // Check if preferred time is available, otherwise use first available
        const defaultFrom = availableTimes.includes(preferredStartTime) ? preferredStartTime : availableTimes[0];
        const fromIndex = availableTimes.indexOf(defaultFrom);
        const defaultTo = availableTimes[Math.min(fromIndex + 2, availableTimes.length - 1)]; // 30 minutes later (2 slots of 15 min)
        
        return prev.map((day, i) => 
          i === dayIndex ? { 
            ...day, 
            enabled: true,
            timeslots: [{ from: defaultFrom, to: defaultTo }]
          } : day
        );
      }
      
      return prev.map((day, i) => 
        i === dayIndex ? { ...day, enabled: !day.enabled } : day
      );
    });
  };

  const addTimeslot = (dayIndex: number) => {
    setDayAvailability(prev => {
      // Check Phase 1 total limit first
      const currentTotalSlots = prev
        .filter(d => d.enabled)
        .reduce((total, d) => total + d.timeslots.length, 0);
      
      if (currentTotalSlots >= PHASE1_MAX_TOTAL_SLOTS) {
        toast.error('Phase 1 Limit Reached', {
          description: `Phase 1 mentors can add up to ${PHASE1_MAX_TOTAL_SLOTS} total availability slots across all days. Complete verification to add more.`,
        });
        return prev;
      }
      
      return prev.map((day, i) => {
        if (i !== dayIndex) return day;
        
        // Limit to maximum 5 slots per day
        if (day.timeslots.length >= 5) {
          toast.error('Maximum Slots Reached', {
            description: 'You can add up to 5 time slots per day',
          });
          return day;
        }
        
        // Default new slot - consecutive slots start where previous ended
        const availableTimes = getAvailableTimeSlots(day.day);
        
        // If no available times (all times in the past), show error
        if (availableTimes.length === 0) {
          toast.error('Cannot Add Slot', {
            description: 'All times for today have passed. You can set availability for other days or try again tomorrow.',
          });
          return day;
        }
        
        let newFrom = '09:00'; // Default to 9:00 AM
        let newTo = '09:30';   // Default to 9:30 AM (30 minutes)
        
        // If there are existing slots, new slot starts where last one ended
        if (day.timeslots.length > 0) {
          const sortedSlots = [...day.timeslots].sort((a, b) => a.from.localeCompare(b.from));
          const lastSlot = sortedSlots[sortedSlots.length - 1];
          
          // New slot starts where last slot ended
          newFrom = lastSlot.to;
          
          // Find the index and add 30 minutes (2 slots of 15 min)
          const fromIndex = availableTimes.indexOf(newFrom);
          if (fromIndex !== -1 && fromIndex + 2 < availableTimes.length) {
            newTo = availableTimes[fromIndex + 2]; // 30 minutes later
          } else {
            // If end time not available, show error
            toast.error('Cannot Add Slot', {
              description: 'No more time available after the last slot. Try removing a slot or choosing different times.',
            });
            return day;
          }
        } else {
          // First slot: use 09:00-09:30 if available, otherwise first available time
          if (!availableTimes.includes(newFrom)) {
            newFrom = availableTimes[0];
          }
          const fromIndex = availableTimes.indexOf(newFrom);
          newTo = availableTimes[Math.min(fromIndex + 2, availableTimes.length - 1)]; // 30 minutes later
        }
        
        const newSlots = [...day.timeslots, { from: newFrom, to: newTo }];
        const sortedSlots = newSlots.sort((a, b) => a.from.localeCompare(b.from));
        
        return { ...day, timeslots: sortedSlots };
      });
    });
  };

  const updateTimeslot = (dayIndex: number, slotIndex: number, field: 'from' | 'to', value: string) => {
    setDayAvailability(prev =>
      prev.map((day, i) => {
        if (i !== dayIndex) return day;
        
        // Check if the selected time is in the past
        if (isTimeInPast(day.day, value)) {
          toast.error('Cannot Select Past Time', {
            description: 'Please select a time in the future. Past times cannot be used for availability.',
          });
          return day;
        }
        
        const updatedSlots = day.timeslots.map((slot, j) =>
          j === slotIndex ? { ...slot, [field]: value } : slot
        );
        
        const updatedSlot = updatedSlots[slotIndex];
        
        // Validate: start and end time cannot be the same
        if (updatedSlot.from === updatedSlot.to) {
          toast.error('Invalid Time Range', {
            description: 'Start and end time cannot be the same',
          });
          return day;
        }
        
        // Validate: start time must be before end time
        if (updatedSlot.from > updatedSlot.to) {
          toast.error('Invalid Time Range', {
            description: 'Start time must be before end time',
          });
          return day;
        }
        
        // Validate: minimum duration of 15 minutes
        const [startHours, startMins] = updatedSlot.from.split(':').map(Number);
        const [endHours, endMins] = updatedSlot.to.split(':').map(Number);
        const durationMinutes = (endHours * 60 + endMins) - (startHours * 60 + startMins);
        
        if (durationMinutes < 15) {
          toast.error('Slot Too Short', {
            description: 'Time slot must be at least 15 minutes long',
          });
          return day;
        }
        
        // Check for overlaps with other slots
        for (let k = 0; k < updatedSlots.length; k++) {
          if (k === slotIndex) continue;
          
          const otherSlot = updatedSlots[k];
          const overlap = (
            (updatedSlot.from >= otherSlot.from && updatedSlot.from < otherSlot.to) ||
            (updatedSlot.to > otherSlot.from && updatedSlot.to <= otherSlot.to) ||
            (updatedSlot.from <= otherSlot.from && updatedSlot.to >= otherSlot.to)
          );
          
          if (overlap) {
            toast.error('Overlapping Time Slots', {
              description: `This time overlaps with another slot (${otherSlot.from} - ${otherSlot.to})`,
            });
            return day;
          }
        }
        
        return { ...day, timeslots: updatedSlots };
      })
    );
  };

  const removeTimeslot = (dayIndex: number, slotIndex: number) => {
    setDayAvailability(prev =>
      prev.map((day, i) => {
        if (i !== dayIndex) return day;
        
        // Ensure at least one slot remains
        if (day.timeslots.length <= 1) {
          toast.error('Cannot Remove', {
            description: 'Each enabled day must have at least one time slot',
          });
          return day;
        }
        
        return { ...day, timeslots: day.timeslots.filter((_, j) => j !== slotIndex) };
      })
    );
  };
  
  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h3 className="text-2xl font-bold text-gray-900 mb-2">Availability</h3>
      </div>

      {/* Timezone Selection */}
      <div className="space-y-3">
        <h4 className="text-lg font-semibold text-gray-900">Set your timezone</h4>
        <p className="text-sm text-gray-600">
          A correct timezone is essential to coordinate lessons with international students
        </p>
        
        <div className="space-y-2">
          <label htmlFor="timezone" className="text-sm font-medium text-gray-700">
            Choose your timezone
          </label>
          <Select value={timeZone} onValueChange={setTimeZone}>
            <SelectTrigger id="timezone">
              <SelectValue placeholder="Select timezone" />
            </SelectTrigger>
            <SelectContent>
              {TIMEZONES.map((tz) => (
                <SelectItem key={tz.value} value={tz.value}>
                  {tz.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Availability Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-lg font-semibold text-gray-900 mb-1">Set your availability</h4>
            <p className="text-sm text-gray-600">
              Availability shows your potential working hours. Students can book lessons at these times.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className={`text-sm font-semibold ${
              totalSlots >= PHASE1_MAX_TOTAL_SLOTS ? 'text-red-600' : 'text-green-600'
            }`}>
              {totalSlots}/{PHASE1_MAX_TOTAL_SLOTS} slots used
            </span>
            <span className="text-xs text-gray-500">Min 15 min</span>
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

        {/* Days List with Inline Layout */}
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          {dayAvailability.map((day, dayIndex) => {
            const slotCount = day.timeslots.length;
            const canEnableDay = day.enabled || totalSlots < PHASE1_MAX_TOTAL_SLOTS;
            
            return (
            <div 
              key={day.day} 
              className={`grid grid-cols-[180px_1fr] items-start gap-4 py-3 px-4 ${
                dayIndex !== dayAvailability.length - 1 ? 'border-b border-gray-200' : ''
              } ${!canEnableDay ? 'opacity-60' : ''}`}
            >
              {/* Left: Day checkbox */}
              <div className="flex items-center gap-3">
                <Checkbox
                  id={`day-${dayIndex}`}
                  checked={day.enabled}
                  disabled={!canEnableDay}
                  onCheckedChange={() => toggleDay(dayIndex)}
                  className="h-5 w-5 border-gray-300"
                />
                <label
                  htmlFor={`day-${dayIndex}`}
                  className={`text-sm font-medium cursor-pointer select-none ${
                    canEnableDay ? 'text-gray-900' : 'text-gray-400 cursor-not-allowed'
                  }`}
                >
                  {day.day}
                  {day.enabled && slotCount > 1 && (
                    <span className="ml-2 text-xs text-gray-500">({slotCount})</span>
                  )}
                  {!canEnableDay && (
                    <span className="ml-2 text-xs text-amber-600 font-medium">(Limit reached)</span>
                  )}
                </label>
              </div>

              {/* Right: Time slots or Unavailable */}
              <div className="min-h-[40px]">
                {day.enabled ? (
                  <div className="space-y-3">
                    {day.timeslots.map((slot, slotIndex) => (
                      <div key={slotIndex} className="flex items-center gap-2 flex-wrap">
                        {slotCount > 1 && (
                          <span className="text-xs text-gray-500 font-medium min-w-[45px]">
                            #{slotIndex + 1}
                          </span>
                        )}
                        {/* From selector */}
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500 font-medium">from</span>
                          <Select
                            value={slot.from}
                            onValueChange={(value) => updateTimeslot(dayIndex, slotIndex, 'from', value)}
                          >
                            <SelectTrigger className="h-10 w-44">
                              <SelectValue>
                                <span className="font-semibold">{slot.from}</span>
                                <span className="text-xs text-gray-500 ml-1">({formatTimeToAMPM(slot.from)})</span>
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent className="max-h-[240px]">
                              {getAvailableTimeSlots(day.day).map((time) => (
                                <SelectItem key={`from-${time}`} value={time}>
                                  <span className="font-semibold">{time}</span>
                                  <span className="text-xs text-gray-500 ml-1">({formatTimeToAMPM(time)})</span>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Dash separator */}
                        <span className="text-gray-400 font-medium">-</span>

                        {/* To selector */}
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500 font-medium">to</span>
                          <Select
                            value={slot.to}
                            onValueChange={(value) => updateTimeslot(dayIndex, slotIndex, 'to', value)}
                          >
                            <SelectTrigger className="h-10 w-44">
                              <SelectValue>
                                <span className="font-semibold">{slot.to}</span>
                                <span className="text-xs text-gray-500 ml-1">({formatTimeToAMPM(slot.to)})</span>
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent className="max-h-[240px]">
                              {getAvailableTimeSlots(day.day).map((time) => (
                                <SelectItem key={`to-${time}`} value={time}>
                                  <span className="font-semibold">{time}</span>
                                  <span className="text-xs text-gray-500 ml-1">({formatTimeToAMPM(time)})</span>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Remove button - show if more than 1 slot */}
                        {day.timeslots.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeTimeslot(dayIndex, slotIndex)}
                            className="p-1.5 rounded-full hover:bg-red-50 text-gray-500 hover:text-red-600 transition-colors"
                            aria-label="Remove time slot"
                            title="Remove this time slot"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}

                        {/* Add button - show on last slot if under 5 slots */}
                        {slotIndex === day.timeslots.length - 1 && slotCount < 5 && totalSlots < PHASE1_MAX_TOTAL_SLOTS && (
                          <button
                            type="button"
                            onClick={() => addTimeslot(dayIndex)}
                            className="p-1.5 rounded-full hover:bg-green-50 text-gray-500 hover:text-green-600 transition-colors"
                            aria-label="Add time slot"
                            title="Add another time slot"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <span className="text-sm text-gray-400">Unavailable</span>
                )}
              </div>
            </div>
          );
          })}
        </div>
        
        {/* Helper text */}
        <div className="text-xs text-gray-500 space-y-1 pl-1 mt-3">
          <p>• <strong>Phase 1 Limit:</strong> You can add up to {PHASE1_MAX_TOTAL_SLOTS} total availability slots across all days</p>
          <p>• Slots must be at least 15 minutes long and cannot overlap</p>
          <p>• You can add multiple slots per day (max 5 per day) for breaks or split schedules</p>
        </div>
      </div>
    </div>
  );
}
