/**
 * React hook for rate limiting
 */

import { useState, useCallback } from "react";
import {
  checkRateLimit,
  getRateLimitStatus,
  type RateLimitAction,
  type RateLimitResult,
  type RateLimitStatus,
} from "@/services/rateLimitService";
import { toast } from "@/components/ui/sonner";

export function useRateLimit(action: RateLimitAction) {
  const [isChecking, setIsChecking] = useState(false);
  const [status, setStatus] = useState<RateLimitStatus | null>(null);

  /**
   * Check if action is allowed
   */
  const check = useCallback(
    async (showToast = true): Promise<boolean> => {
      setIsChecking(true);

      try {
        const result = await checkRateLimit(action);

        if (!result.allowed && showToast) {
          toast.error("Rate Limit Exceeded", {
            description:
              result.message ||
              `You've exceeded the limit. Please try again later.`,
          });
        }

        return result.allowed;
      } catch (error) {
        console.error("Rate limit check failed:", error);
        // Fail open - allow action on error
        return true;
      } finally {
        setIsChecking(false);
      }
    },
    [action]
  );

  /**
   * Get current rate limit status
   */
  const getStatus = useCallback(async () => {
    try {
      const statusData = await getRateLimitStatus(action);
      setStatus(statusData);
      return statusData;
    } catch (error) {
      console.error("Failed to get rate limit status:", error);
      return null;
    }
  }, [action]);

  /**
   * Execute a function with rate limit check
   */
  const execute = useCallback(
    async <T>(fn: () => Promise<T>, showToast = true): Promise<T | null> => {
      const allowed = await check(showToast);

      if (!allowed) {
        return null;
      }

      try {
        return await fn();
      } catch (error) {
        throw error;
      }
    },
    [check]
  );

  return {
    check,
    execute,
    getStatus,
    isChecking,
    status,
  };
}
