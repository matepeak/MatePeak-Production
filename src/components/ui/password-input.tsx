import { useState, useEffect } from "react";
import { Eye, EyeOff, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface PasswordRequirement {
  label: string;
  test: (password: string) => boolean;
}

const requirements: PasswordRequirement[] = [
  { label: "At least 8 characters", test: (pwd) => pwd.length >= 8 },
  { label: "One uppercase letter", test: (pwd) => /[A-Z]/.test(pwd) },
  { label: "One lowercase letter", test: (pwd) => /[a-z]/.test(pwd) },
  { label: "One number", test: (pwd) => /\d/.test(pwd) },
  { label: "One special character", test: (pwd) => /[@#$%!&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pwd) },
];

interface PasswordInputProps {
  value: string;
  onChange: (value: string) => void;
  onValidityChange?: (isValid: boolean) => void;
  showRequirements?: boolean;
  id?: string;
  name?: string;
  placeholder?: string;
  required?: boolean;
  className?: string;
}

export function PasswordInput({
  value,
  onChange,
  onValidityChange,
  showRequirements = true,
  id = "password",
  name = "password",
  placeholder = "Enter your password",
  required = false,
  className,
}: PasswordInputProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [metRequirements, setMetRequirements] = useState<boolean[]>([]);
  const [isFocused, setIsFocused] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);

  useEffect(() => {
    const results = requirements.map((req) => req.test(value));
    setMetRequirements(results);
    
    const allMet = results.every((met) => met);
    onValidityChange?.(allMet);
  }, [value, onValidityChange]);

  const allMet = metRequirements.every(Boolean);
  const showValidation = showRequirements && hasInteracted && value.length > 0;

  return (
    <div className="space-y-2">
      <div className="relative">
        <Input
          id={id}
          name={name}
          type={showPassword ? "text" : "password"}
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            if (!hasInteracted) setHasInteracted(true);
          }}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          required={required}
          className={cn(
            "pr-10 transition-all duration-200 ease-in-out bg-white",
            hasInteracted && value.length > 0 && !allMet && "border-red-400",
            hasInteracted && allMet && value.length > 0 && "border-green-400",
            className
          )}
          aria-describedby={showRequirements ? `${id}-requirements` : undefined}
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
          aria-label={showPassword ? "Hide password" : "Show password"}
        >
          {showPassword ? (
            <EyeOff className="h-4 w-4" />
          ) : (
            <Eye className="h-4 w-4" />
          )}
        </button>
      </div>

      {showValidation && (
        <div
          id={`${id}-requirements`}
          className="border border-gray-200 bg-white p-3 rounded-lg animate-fade-in"
          role="status"
          aria-live="polite"
        >
          <p className="text-xs font-medium text-gray-600 mb-2">Password requirements</p>
          <div className="space-y-2">
            {requirements.map((req, index) => {
              const isMet = metRequirements[index];
              return (
                <div
                  key={req.label}
                  className={cn(
                    "flex items-center gap-2 text-sm transition-all duration-200 ease-in-out",
                    isMet ? "text-gray-800" : "text-gray-500"
                  )}
                >
                  {isMet ? (
                    <Check className="h-4 w-4 text-green-500 flex-shrink-0" aria-hidden="true" />
                  ) : (
                    <span className="h-1.5 w-1.5 rounded-full bg-gray-300 flex-shrink-0" aria-hidden="true" />
                  )}
                  <span>{req.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
