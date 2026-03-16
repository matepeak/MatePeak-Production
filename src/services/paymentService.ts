const PAYMENT_GATEWAY_BASE_URL =
  import.meta.env.VITE_PAYMENT_GATEWAY_BASE_URL || "https://payment-gateway-psp4.onrender.com";

interface HostedGatewayParams {
  amount: number;
  bookingId?: string;
  actualBookingId?: string;
  mentorId?: string;
  sessionType?: string;
}

export const paymentService = {
  createOrder: async (amount: number) => {
    const response = await fetch(`${PAYMENT_GATEWAY_BASE_URL}/api/payment/create-order`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ amount }),
    });

    const data = await response.json();

    if (!response.ok || !data?.success) {
      return { success: false, error: data?.error || "Failed to create order on hosted payment server." };
    }

    return data;
  },

  getHostedGatewayUrl: (amount?: number) => {
    if (!amount || Number.isNaN(amount)) {
      return PAYMENT_GATEWAY_BASE_URL;
    }

    return `${PAYMENT_GATEWAY_BASE_URL}/?amount=${encodeURIComponent(amount)}`;
  },

  getHostedGatewayCheckoutUrl: ({ amount, bookingId, actualBookingId, mentorId, sessionType }: HostedGatewayParams) => {
    const params = new URLSearchParams();
    params.set("amount", String(amount));

    if (bookingId) params.set("bookingId", bookingId);
    if (actualBookingId) params.set("actualBookingId", actualBookingId);
    if (mentorId) params.set("mentorId", mentorId);
    if (sessionType) params.set("sessionType", sessionType);

    return `${PAYMENT_GATEWAY_BASE_URL}/?${params.toString()}`;
  },
};