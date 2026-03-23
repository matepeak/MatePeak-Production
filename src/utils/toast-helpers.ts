/**
 * Enhanced Toast Helper Functions
 * Beautiful, consistent toast notifications with icons and animations
 */

import { toast } from "@/components/ui/sonner";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Info,
  Loader2,
} from "lucide-react";

interface ToastOptions {
  title?: string;
  description?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

/**
 * Success Toast - Green gradient with checkmark
 */
export const showSuccessToast = (message: string, options?: ToastOptions) => {
  return toast.success(message, {
    duration: options?.duration,
    action: options?.action,
  });
};

/**
 * Error Toast - Red gradient with X icon
 */
export const showErrorToast = (message: string, options?: ToastOptions) => {
  return toast.error(message, {
    description: options?.description,
    duration: options?.duration,
    action: options?.action,
  });
};

/**
 * Warning Toast - Yellow gradient with warning icon
 */
export const showWarningToast = (message: string, options?: ToastOptions) => {
  return toast.warning(message, {
    description: options?.description,
    duration: options?.duration,
    action: options?.action,
  });
};

/**
 * Info Toast - Blue gradient with info icon
 */
export const showInfoToast = (message: string, options?: ToastOptions) => {
  return toast.info(message, {
    description: options?.description,
    duration: options?.duration,
    action: options?.action,
  });
};

/**
 * Loading Toast - Gray with spinner
 */
export const showLoadingToast = (
  message: string,
  options?: Omit<ToastOptions, "action">
) => {
  return toast.loading(message, {
    description: options?.description,
    duration: Infinity, // Loading toasts don't auto-dismiss
  });
};

/**
 * Promise Toast - Shows loading, then success or error based on promise result
 */
export const showPromiseToast = <T>(
  promise: Promise<T>,
  messages: {
    loading: string;
    success: string | ((data: T) => string);
    error: string | ((error: any) => string);
  },
  options?: {
    successDuration?: number;
    errorDuration?: number;
  }
) => {
  return toast.promise(promise, {
    loading: messages.loading,
    success: messages.success,
    error: messages.error,
    duration: options?.successDuration,
  });
};

/**
 * Custom Toast - Default white toast with custom content
 */
export const showCustomToast = (message: string, options?: ToastOptions) => {
  return toast(message, {
    description: options?.description,
    duration: options?.duration,
    action: options?.action,
  });
};

/**
 * Dismiss a specific toast by ID
 */
export const dismissToast = (toastId: string | number) => {
  toast.dismiss(toastId);
};

/**
 * Dismiss all toasts
 */
export const dismissAllToasts = () => {
  toast.dismiss();
};

// Example usage in components:
// import { showSuccessToast, showErrorToast } from '@/utils/toast-helpers';
//
// showSuccessToast("Profile updated successfully!");
// showErrorToast("Failed to save changes", {
//   description: "Please try again later"
// });
// showWarningToast("Your session will expire soon");
// showInfoToast("New features available!", {
//   action: {
//     label: "Learn More",
//     onClick: () => navigate('/features')
//   }
// });
