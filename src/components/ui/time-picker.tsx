import { Clock } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface TimePickerProps {
  value: string; // HH:MM format
  onChange: (value: string) => void;
  minTime?: string; // Optional minimum time (HH:MM)
  maxTime?: string; // Optional maximum time (HH:MM)
  disabled?: boolean;
}

export function TimePicker({
  value,
  onChange,
  minTime,
  maxTime,
  disabled = false,
}: TimePickerProps) {
  // Generate time slots (every 30 minutes)
  const timeSlots = Array.from({ length: 48 }, (_, i) => {
    const hour = Math.floor(i / 2);
    const minute = i % 2 === 0 ? "00" : "30";
    return `${hour.toString().padStart(2, "0")}:${minute}`;
  });

  const isValidTime = (time: string): boolean => {
    if (minTime && time < minTime) return false;
    if (maxTime && time > maxTime) return false;
    return true;
  };

  const getAmPm = (time: string) => {
    const [hourRaw, minuteRaw] = time.split(":");
    const hour = Number(hourRaw);
    const minute = Number(minuteRaw);

    if (Number.isNaN(hour) || Number.isNaN(minute)) {
      return "";
    }

    const period = hour >= 12 ? "PM" : "AM";
    const hour12 = hour % 12 === 0 ? 12 : hour % 12;
    const minuteStr = String(minute).padStart(2, "0");
    return `${hour12}:${minuteStr} ${period}`;
  };

  const formattedAmPm = getAmPm(value);

  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className="w-full">
        <div className="flex items-center">
          <Clock className="mr-2 h-4 w-4" />
          {value ? (
            <span className="inline-flex items-baseline gap-2">
              <span className="text-sm font-medium text-foreground">{value}</span>
              <span className="text-xs font-normal text-muted-foreground">
                ({formattedAmPm})
              </span>
            </span>
          ) : (
            <SelectValue placeholder="Select time" />
          )}
        </div>
      </SelectTrigger>
      <SelectContent className="max-h-60">
        {timeSlots.filter(isValidTime).map((time) => (
          <SelectItem key={time} value={time}>
            <span className="inline-flex items-baseline gap-2">
              <span className="text-sm font-medium">{time}</span>
              <span className="text-xs font-normal text-muted-foreground">
                ({getAmPm(time)})
              </span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
