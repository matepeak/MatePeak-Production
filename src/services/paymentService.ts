import { env } from "@/config/env";
import { supabase } from "@/integrations/supabase/client";

const RAZORPAY_CHECKOUT_SCRIPT = "https://checkout.razorpay.com/v1/checkout.js";

type RazorpayOrder = {
  id: string;
  amount: number;
  currency: string;
};

export type RazorpayCheckoutSuccess = {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
};

type CreateOrderResponse = {
  success?: boolean;
  order?: RazorpayOrder;
  razorpay_key?: string;
  error?: string;
};

type EdgeCallResult<T> = {
  ok: boolean;
  status: number;
  data?: T;
  error?: string;
};

const toErrorMessage = (value: unknown, fallback: string): string => {
  if (typeof value === "string" && value.trim().length > 0) {
    return value;
  }

  if (value && typeof value === "object") {
    const asAny = value as Record<string, unknown>;
    if (typeof asAny.message === "string" && asAny.message.trim().length > 0) {
      return asAny.message;
    }
    try {
      return JSON.stringify(value);
    } catch {
      return fallback;
    }
  }

  return fallback;
};

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => {
      open: () => void;
      on: (event: string, handler: (response: unknown) => void) => void;
    };
  }
}

const loadRazorpayScript = async (): Promise<void> => {
  if (window.Razorpay) return;

  const scriptAlreadyPresent = document.querySelector<HTMLScriptElement>(
    `script[src="${RAZORPAY_CHECKOUT_SCRIPT}"]`
  );

  if (scriptAlreadyPresent) {
    await new Promise<void>((resolve, reject) => {
      if (window.Razorpay) {
        resolve();
        return;
      }

      scriptAlreadyPresent.addEventListener("load", () => resolve(), { once: true });
      scriptAlreadyPresent.addEventListener(
        "error",
        () => reject(new Error("Failed to load Razorpay checkout script")),
        { once: true }
      );
    });
    return;
  }

  await new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = RAZORPAY_CHECKOUT_SCRIPT;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Razorpay checkout script"));
    document.body.appendChild(script);
  });
};

const callEdgeFunction = async <T>(
  functionName: string,
  payload: Record<string, unknown>
): Promise<EdgeCallResult<T>> => {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const response = await fetch(
    `${env.VITE_SUPABASE_URL}/functions/v1/${functionName}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: env.VITE_SUPABASE_ANON_KEY,
        ...(session?.access_token
          ? { Authorization: `Bearer ${session.access_token}` }
          : {}),
      },
      body: JSON.stringify(payload),
    }
  );

  let body: any = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }

  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      error: toErrorMessage(
        body?.error ?? body?.message,
        `Edge function ${functionName} failed with status ${response.status}`
      ),
    };
  }

  return {
    ok: true,
    status: response.status,
    data: body as T,
  };
};

export const paymentService = {
  createOrder: async (amount: number, bookingId: string) => {
    const result = await callEdgeFunction<CreateOrderResponse>("payment-process", {
      amount,
      currency: "INR",
      booking_id: bookingId,
    });

    if (!result.ok || !result.data) {
      return { success: false, error: result.error || "Failed to create Razorpay order" };
    }

    const data = result.data;
    if (!data.success || !data.order || !data.razorpay_key) {
      return { success: false, error: data.error || "Invalid order response from payment-process" };
    }

    return {
      success: true,
      order: data.order,
      razorpayKey: data.razorpay_key,
    };
  },

  openCheckout: async (params: {
    key: string;
    order: RazorpayOrder;
    bookingId: string;
    customerName: string;
    customerEmail: string;
    customerPhone?: string;
    description: string;
  }): Promise<RazorpayCheckoutSuccess> => {
    await loadRazorpayScript();

    if (!window.Razorpay) {
      throw new Error("Razorpay SDK unavailable");
    }

    return await new Promise<RazorpayCheckoutSuccess>((resolve, reject) => {
      const razorpay = new window.Razorpay({
        key: params.key,
        amount: params.order.amount,
        currency: params.order.currency,
        name: "MatePeak",
        description: params.description,
        order_id: params.order.id,
        prefill: {
          name: params.customerName,
          email: params.customerEmail,
        },
        hidden: {
          contact: true,
        },
        readonly: {
          contact: true,
        },
        notes: {
          booking_id: params.bookingId,
          actualBookingId: params.bookingId,
        },
        handler: (response: unknown) => {
          resolve(response as RazorpayCheckoutSuccess);
        },
        modal: {
          ondismiss: () => {
            reject(new Error("Payment popup closed by user"));
          },
        },
        theme: {
          color: "#111827",
        },
      });

      razorpay.on("payment.failed", () => {
        reject(new Error("Payment failed"));
      });

      razorpay.open();
    });
  },

  verifyPayment: async (bookingId: string, response: RazorpayCheckoutSuccess) => {
    const result = await callEdgeFunction<any>("verify-payment", {
      booking_id: bookingId,
      status: "success",
      razorpay_order_id: response.razorpay_order_id,
      razorpay_payment_id: response.razorpay_payment_id,
      razorpay_signature: response.razorpay_signature,
    });

    if (!result.ok || !result.data) {
      return { success: false, error: result.error || "Payment verification failed" };
    }

    const data = result.data;
    if (!data?.success) {
      return { success: false, error: data?.message || "Payment verification failed" };
    }

    return { success: true, data };
  },

  markPaymentFailed: async (bookingId: string) => {
    const result = await callEdgeFunction<any>("verify-payment", {
      booking_id: bookingId,
      status: "failed",
    });

    if (!result.ok || !result.data) {
      return { success: false, error: result.error || "Failed to mark payment as failed" };
    }

    const data = result.data;
    if (!data?.success) {
      return { success: false, error: data?.message || "Failed to mark payment as failed" };
    }

    return { success: true };
  },
};