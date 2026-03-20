import { cn } from "@/lib/utils";

interface PresenceDotProps {
  className?: string;
  sizeClassName?: string;
}

const PresenceDot = ({
  className,
  sizeClassName = "h-3.5 w-3.5",
}: PresenceDotProps) => {
  return (
    <span
      aria-label="Mentor is online"
      title="Online"
      className={cn(
        "rounded-full bg-green-500 border-2 border-white",
        sizeClassName,
        className
      )}
    />
  );
};

export default PresenceDot;