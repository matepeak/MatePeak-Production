import React, { useEffect } from 'react';
import { paymentService } from '@/services/paymentService';

const PaymentTest = () => {
  useEffect(() => {
    const redirectUrl = paymentService.getHostedGatewayUrl(1);
    window.location.replace(redirectUrl);
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4 text-sm text-gray-600">
      Redirecting to payment gateway...
    </div>
  );
};

export default PaymentTest;
