type BookingEmailRecipient = "student" | "mentor";

const getBookingServiceType = (data: any) => {
  const serviceType = String(data.serviceType || "").toLowerCase();
  const serviceName = String(data.serviceName || "").toLowerCase();

  if (serviceType === "digitalproducts" || serviceName.includes("digital")) {
    return "digitalProducts";
  }

  if (
    serviceType === "prioritydm" ||
    serviceName.includes("priority dm") ||
    serviceName.includes("priority message")
  ) {
    return "priorityDm";
  }

  return "oneOnOneSession";
};

const bookingServiceNameMap: Record<string, string> = {
  oneOnOneSession: "1:1 Mentoring Session",
  chatAdvice: "Chat Advice",
  priorityDm: "Priority DM",
  digitalProducts: "Digital Product",
  notes: "Session Notes",
};

const getBookingServiceDisplayName = (data: any) => {
  const rawServiceName = String(data.serviceName || "").trim();
  const normalizedType = getBookingServiceType(data);
  const normalizedRawName = rawServiceName.toLowerCase();

  if (!rawServiceName) {
    return bookingServiceNameMap[normalizedType] || "Session";
  }

  if (bookingServiceNameMap[normalizedRawName]) {
    return bookingServiceNameMap[normalizedRawName];
  }

  return rawServiceName;
};

const bookingRequiresScheduling = (data: any) => {
  const serviceType = getBookingServiceType(data);
  return serviceType !== "digitalProducts" && serviceType !== "priorityDm";
};

const getBookingEmailCopy = (data: any, recipient: BookingEmailRecipient) => {
  const serviceType = getBookingServiceType(data);
  const serviceName = getBookingServiceDisplayName(data);
  const mentorName = data.mentorName;
  const studentName = data.studentName;

  if (serviceType === "digitalProducts") {
    if (recipient === "student") {
      return {
        subject: `Digital Product Confirmed: ${serviceName} by ${mentorName}`,
        header: "Digital Product Confirmed",
        intro: `Your digital product from ${mentorName} is confirmed.`,
        detailsTitle: "Order Details",
      };
    }

    return {
      subject: `New Digital Product Order: ${serviceName} from ${studentName}`,
      header: "New Digital Product Order",
      intro: `You received a new digital product order from ${studentName}.`,
      detailsTitle: "Order Details",
    };
  }

  if (serviceType === "priorityDm") {
    if (recipient === "student") {
      return {
        subject: `Priority DM Confirmed: ${serviceName} with ${mentorName}`,
        header: "Priority DM Confirmed",
        intro: `Your priority DM request with ${mentorName} is confirmed.`,
        detailsTitle: "Request Details",
      };
    }

    return {
      subject: `New Priority DM Request: ${serviceName} from ${studentName}`,
      header: "New Priority DM Request",
      intro: `You have a new priority DM request from ${studentName}.`,
      detailsTitle: "Request Details",
    };
  }

  if (recipient === "student") {
    return {
      subject: `Session Confirmed: ${serviceName} with ${mentorName}`,
      header: "Session Confirmed",
      intro: `Your session with ${mentorName} is confirmed.`,
      detailsTitle: "Session Details",
    };
  }

  return {
    subject: `New Session Scheduled: ${serviceName} with ${studentName}`,
    header: "New Session Scheduled",
    intro: `You have a new session scheduled with ${studentName}.`,
    detailsTitle: "Session Details",
  };
};

// Email templates with proper styling
export const emailTemplates = {
  bookingConfirmation: {
    student: (data: any) => ({
      subject: getBookingEmailCopy(data, "student").subject,
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { margin: 0; padding: 0; background-color: #f6f7f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
    .wrapper { width: 100%; padding: 60px 0; display: flex; justify-content: center; }
    .container { width: 520px; background: #ffffff; border-radius: 10px; padding: 40px; }
    .logo { text-align: center; font-size: 22px; font-weight: 600; color: #000; margin-bottom: 28px; }
    .header { text-align: center; margin-bottom: 28px; background: #ffffff; }
    .content { background: #ffffff; }
    h1 { text-align: center; font-size: 24px; font-weight: 600; color: #111; margin: 0; }
    h2 { font-size: 14px; font-weight: 600; margin-bottom: 16px; color: #111; margin-top: 0; }
    p { font-size: 14px; color: #555; margin-bottom: 18px; line-height: 1.6; }
    .card { background: #f4f5f7; border-radius: 8px; padding: 20px; margin: 30px 0; }
    .button { background-color: #000; color: #fff; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-size: 14px; font-weight: 500; display: inline-block; }
    .footer { text-align: center; font-size: 12px; color: #888; margin-top: 12px; }
    .detail-row { font-size: 13px; color: #444; padding: 10px 0; border-bottom: 1px solid #e5e5e5; }
    .detail-label { color: #111; font-weight: 600; display: inline-block; min-width: 110px; margin-right: 12px; }
    .detail-value { color: #444; }
  </style>
</head>
<body>
  <div class="wrapper">
  <div class="container">
    <div class="logo">MatePeak</div>
    <div class="header">
      <img src="https://wpltqdlvrzukghiwvxqd.supabase.co/storage/v1/object/public/avatars/lovable-uploads/MatePeak_logo_with_name.png" alt="MatePeak" style="height: 40px; margin-bottom: 16px;" />
      <h1>${getBookingEmailCopy(data, "student").header}</h1>
    </div>
    
    <div class="content">
      <p>Hi ${data.studentName},</p>
      <p>${getBookingEmailCopy(data, "student").intro}</p>
      
      <div class="card">
        <h2>${getBookingEmailCopy(data, "student").detailsTitle}</h2>
        <div class="detail-row">
          <span class="detail-label">Service:&nbsp;</span>
          <span class="detail-value">${getBookingServiceDisplayName(data)}</span>
        </div>
        ${
          bookingRequiresScheduling(data)
            ? `
        <div class="detail-row">
          <span class="detail-label">Date:&nbsp;</span>
          <span class="detail-value">${data.date}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Time:&nbsp;</span>
          <span class="detail-value">${data.time} (${data.timezone})</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Duration:&nbsp;</span>
          <span class="detail-value">${data.duration} minutes</span>
        </div>
        `
            : ""
        }
        <div class="detail-row">
          <span class="detail-label">Amount Paid:&nbsp;</span>
          <span class="detail-value">INR ${data.amount}</span>
        </div>
      </div>
      
      ${
        data.meetingLink
          ? `
      <div style="text-align: center; margin: 24px 0;">
        <a href="${data.meetingLink}" class="button">Join Meeting</a>
      </div>
      `
          : ""
      }
      
      <p style="color: #6b7280; font-size: 14px;">
        <strong>What to expect:</strong><br>
        ${
          bookingRequiresScheduling(data)
            ? `
        - You'll receive a reminder 24 hours before the session<br>
        - Another reminder will be sent 1 hour before<br>
        ${
          data.meetingLink
            ? "- Use the meeting link above to join at the scheduled time<br>"
            : "- Meeting link will be available in your dashboard<br>"
        }
        `
            : getBookingServiceType(data) === "digitalProducts"
            ? "- Access details will be shared in your dashboard and email updates<br>"
            : "- You will receive a response update in your dashboard and email<br>"
        }
      </p>
    </div>
    
    <div class="footer">
      <p>Need help? <a href="mailto:support@matepeak.com">Contact Support</a></p>
      <p>&copy; 2025 MatePeak - Be a Solopreneur. All rights reserved.</p>
    </div>
  </div>
  </div>
</body>
</html>
      `,
    }),

    mentor: (data: any) => ({
      subject: getBookingEmailCopy(data, "mentor").subject,
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { margin: 0; padding: 0; background-color: #f6f7f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
    .wrapper { width: 100%; padding: 60px 0; display: flex; justify-content: center; }
    .container { width: 520px; background: #ffffff; border-radius: 10px; padding: 40px; }
    .logo { text-align: center; font-size: 22px; font-weight: 600; color: #000; margin-bottom: 28px; }
    .header { text-align: center; margin-bottom: 28px; background: #ffffff; }
    .content { background: #ffffff; }
    h1 { text-align: center; font-size: 24px; font-weight: 600; color: #111; margin: 0; }
    h2 { font-size: 14px; font-weight: 600; margin-bottom: 16px; color: #111; margin-top: 0; }
    p { font-size: 14px; color: #555; margin-bottom: 18px; line-height: 1.6; }
    .card { background: #f4f5f7; border-radius: 8px; padding: 20px; margin: 30px 0; }
    .button { background-color: #000; color: #fff; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-size: 14px; font-weight: 500; display: inline-block; }
    .footer { text-align: center; font-size: 12px; color: #888; margin-top: 12px; }
    .detail-row { font-size: 13px; color: #444; padding: 10px 0; border-bottom: 1px solid #e5e5e5; }
    .detail-label { color: #111; font-weight: 600; display: inline-block; min-width: 110px; margin-right: 12px; }
    .detail-value { color: #444; }
    .message-box { background: #f4f5f7; border-radius: 8px; padding: 20px; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="wrapper">
  <div class="container">
    <div class="logo">MatePeak</div>
    <div class="header">
      <img src="https://wpltqdlvrzukghiwvxqd.supabase.co/storage/v1/object/public/avatars/lovable-uploads/MatePeak_logo_with_name.png" alt="MatePeak" style="height: 40px; margin-bottom: 16px;" />
      <h1>${getBookingEmailCopy(data, "mentor").header}</h1>
    </div>
    
    <div class="content">
      <p>Hi ${data.mentorName},</p>
      <p>${getBookingEmailCopy(data, "mentor").intro}</p>
      
      <div class="card">
        <h2>${getBookingEmailCopy(data, "mentor").detailsTitle}</h2>
        <div class="detail-row">
          <span class="detail-label">Student:&nbsp;</span>
          <span class="detail-value">${data.studentName}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Service:&nbsp;</span>
          <span class="detail-value">${getBookingServiceDisplayName(data)}</span>
        </div>
        ${
          bookingRequiresScheduling(data)
            ? `
        <div class="detail-row">
          <span class="detail-label">Date:&nbsp;</span>
          <span class="detail-value">${data.date}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Time:&nbsp;</span>
          <span class="detail-value">${data.time} (${data.timezone})</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Duration:&nbsp;</span>
          <span class="detail-value">${data.duration} minutes</span>
        </div>
        `
            : ""
        }
        <div class="detail-row">
          <span class="detail-label">Earnings:&nbsp;</span>
          <span class="detail-value">INR ${data.earnings}</span>
        </div>
      </div>
      
      ${
        data.purpose
          ? `
      <div class="message-box">
        <strong>Session Purpose:</strong><br>
        ${data.purpose}
      </div>
      `
          : ""
      }
      
      <div style="text-align: center; margin: 24px 0;">
        <a href="${data.dashboardLink}" class="button">View in Dashboard</a>
      </div>
      
      <p style="color: #6b7280; font-size: 14px;">
        <strong>Next Steps:</strong><br>
        ${
          bookingRequiresScheduling(data)
            ? `
        - Review the session purpose above<br>
        - Prepare any materials needed<br>
        - Generate meeting link if not already created
        `
            : getBookingServiceType(data) === "digitalProducts"
            ? `
        - Review the order details above<br>
        - Share access details with the student promptly<br>
        - Follow up if the student needs support
        `
            : `
        - Review the request details above<br>
        - Respond promptly in your dashboard<br>
        - Follow up with the student if clarifications are needed
        `
        }
      </p>
    </div>
    
    <div class="footer">
      <p>Questions? <a href="mailto:support@matepeak.com">Contact Support</a></p>
      <p>&copy; 2025 MatePeak - Be a Solopreneur. All rights reserved.</p>
    </div>
  </div>
  </div>
</body>
</html>
      `,
    }),
  },

  sessionReminder: (data: any, hoursUntil: number) => ({
    subject: `Reminder: Session ${
      hoursUntil === 24 ? "Tomorrow" : "in 1 Hour"
    } with ${data.otherPersonName}`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { margin: 0; padding: 0; background-color: #f6f7f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
    .wrapper { width: 100%; padding: 60px 0; display: flex; justify-content: center; }
    .container { width: 520px; background: #ffffff; border-radius: 10px; padding: 40px; }
    .logo { text-align: center; font-size: 22px; font-weight: 600; color: #000; margin-bottom: 28px; }
    .header { text-align: center; margin-bottom: 28px; background: #ffffff; }
    .content { background: #ffffff; }
    h1 { text-align: center; font-size: 24px; font-weight: 600; color: #111; margin: 0; }
    h2 { font-size: 14px; font-weight: 600; margin-bottom: 16px; color: #111; margin-top: 0; }
    p { font-size: 14px; color: #555; margin-bottom: 18px; line-height: 1.6; }
    .card { background: #f4f5f7; border-radius: 8px; padding: 20px; margin: 30px 0; }
    .button { background-color: #000; color: #fff; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-size: 14px; font-weight: 500; display: inline-block; }
    .footer { text-align: center; font-size: 12px; color: #888; margin-top: 12px; }
    .time-badge { display: inline-block; background: #ffffff; color: #444; border: 1px solid #e5e5e5; border-radius: 20px; padding: 8px 16px; font-weight: 600; margin: 16px 0; }
  </style>
</head>
<body>
  <div class="wrapper">
  <div class="container">
    <div class="logo">MatePeak</div>
    <div class="header">
      <img src="https://wpltqdlvrzukghiwvxqd.supabase.co/storage/v1/object/public/avatars/lovable-uploads/MatePeak_logo_with_name.png" alt="MatePeak" style="height: 40px; margin-bottom: 16px;" />
      <h1>${
        hoursUntil === 24 ? "Session Tomorrow!" : "Session Starting Soon!"
      }</h1>
    </div>
    
    <div class="content">
      <p>Hi ${data.recipientName},</p>
      <p>This is a friendly reminder about your upcoming session with <strong>${
        data.otherPersonName
      }</strong>.</p>
      
      <div class="card">
        <div style="text-align: center;">
          <div class="time-badge">
            ${hoursUntil === 24 ? "Tomorrow" : "In 1 Hour"}
          </div>
          <h2 style="margin: 16px 0; color: #111827;">${data.date} at ${
      data.time
    }</h2>
          <p style="color: #6b7280; margin: 8px 0;">Duration: ${
            data.duration
          } minutes</p>
          <p style="color: #6b7280; margin: 8px 0;">Timezone: ${
            data.timezone
          }</p>
        </div>
      </div>
      
      ${
        data.meetingLink
          ? `
      <div style="text-align: center; margin: 24px 0;">
        <a href="${data.meetingLink}" class="button">Join Meeting Room</a>
      </div>
      `
          : ""
      }
      
      ${
        hoursUntil === 24
          ? `
      <p style="color: #6b7280; font-size: 14px;">
        <strong>Preparation Checklist:</strong><br>
        - Review your session notes<br>
        - Test your camera and microphone<br>
        - Prepare any questions or materials<br>
        - Find a quiet space for the call
      </p>
      `
          : `
      <p style="color: #dc2626; font-weight: 600; text-align: center;">
        Your session starts in 1 hour. Please be ready.
      </p>
      `
      }
    </div>
    
    <div class="footer">
      <p>Need to reschedule? <a href="${
        data.dashboardLink
      }">Manage Booking</a></p>
      <p>&copy; 2025 MatePeak - Be a Solopreneur. All rights reserved.</p>
    </div>
  </div>
  </div>
</body>
</html>
    `,
  }),

  sessionFollowUp: (data: any) => ({
    subject: `How was your session with ${data.otherPersonName}?`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { margin: 0; padding: 0; background-color: #f6f7f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
    .wrapper { width: 100%; padding: 60px 0; display: flex; justify-content: center; }
    .container { width: 520px; background: #ffffff; border-radius: 10px; padding: 40px; }
    .logo { text-align: center; font-size: 22px; font-weight: 600; color: #000; margin-bottom: 28px; }
    .header { text-align: center; margin-bottom: 28px; background: #ffffff; }
    .content { background: #ffffff; }
    h1 { text-align: center; font-size: 24px; font-weight: 600; color: #111; margin: 0; }
    p { font-size: 14px; color: #555; margin-bottom: 18px; line-height: 1.6; }
    .card { background: #f4f5f7; border-radius: 8px; padding: 20px; margin: 30px 0; }
    .button { background-color: #000; color: #fff; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-size: 14px; font-weight: 500; display: inline-block; }
    .footer { text-align: center; font-size: 12px; color: #888; margin-top: 12px; }
    .star-rating { font-size: 24px; margin: 16px 0; }
  </style>
</head>
<body>
  <div class="wrapper">
  <div class="container">
    <div class="logo">MatePeak</div>
    <div class="header">
      <img src="https://wpltqdlvrzukghiwvxqd.supabase.co/storage/v1/object/public/avatars/lovable-uploads/MatePeak_logo_with_name.png" alt="MatePeak" style="height: 40px; margin-bottom: 16px;" />
      <h1>Session Completed</h1>
    </div>
    
    <div class="content">
      <p>Hi ${data.studentName},</p>
      <p>We hope you had a great session with <strong>${data.mentorName}</strong>!</p>
      
      <div class="card">
        <p style="text-align: center; margin: 0;">
          <strong>Session Summary</strong><br>
          ${data.date} - ${data.duration} minutes<br>
          ${data.serviceName}
        </p>
      </div>
      
      <p>Your feedback helps us improve and helps other students find great mentors.</p>
      
      <div style="text-align: center; margin: 32px 0;">
        <a href="${data.reviewLink}" class="button">Leave a Review</a>
      </div>
      
      <div style="text-align: center; margin: 24px 0;">
        <p><strong>Want another session with ${data.mentorName}?</strong></p>
        <a href="${data.bookAgainLink}" style="color: #222222; text-decoration: none; font-weight: 600;">Book Again</a>
      </div>
    </div>
    
    <div class="footer">
      <p>Questions? <a href="mailto:support@matepeak.com">Contact Support</a></p>
      <p>&copy; 2025 MatePeak - Be a Solopreneur. All rights reserved.</p>
    </div>
  </div>
  </div>
</body>
</html>
    `,
  }),

  cancellationNotice: (data: any) => ({
    subject: `Session Cancelled: ${data.serviceName}`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { margin: 0; padding: 0; background-color: #f6f7f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
    .wrapper { width: 100%; padding: 60px 0; display: flex; justify-content: center; }
    .container { width: 520px; background: #ffffff; border-radius: 10px; padding: 40px; }
    .logo { text-align: center; font-size: 22px; font-weight: 600; color: #000; margin-bottom: 28px; }
    .header { text-align: center; margin-bottom: 28px; background: #ffffff; }
    .content { background: #ffffff; }
    h1 { text-align: center; font-size: 24px; font-weight: 600; color: #111; margin: 0; }
    p { font-size: 14px; color: #555; margin-bottom: 18px; line-height: 1.6; }
    .card { background: #f4f5f7; border-radius: 8px; padding: 20px; margin: 30px 0; }
    .button { background-color: #000; color: #fff; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-size: 14px; font-weight: 500; display: inline-block; }
    .footer { text-align: center; font-size: 12px; color: #888; margin-top: 12px; }
  </style>
</head>
<body>
  <div class="wrapper">
  <div class="container">
    <div class="logo">MatePeak</div>
    <div class="header">
      <img src="https://wpltqdlvrzukghiwvxqd.supabase.co/storage/v1/object/public/avatars/lovable-uploads/MatePeak_logo_with_name.png" alt="MatePeak" style="height: 40px; margin-bottom: 16px;" />
      <h1>Session Cancelled</h1>
    </div>
    
    <div class="content">
      <p>Hi ${data.recipientName},</p>
      <p style="margin: 0 0 12px 0;">Your session with <strong>${
        data.otherPersonName
      }</strong> has been cancelled.</p>
      
      <div class="card">
        <p style="margin: 0;">
          <strong>Cancelled Session:</strong><br>
          ${data.serviceName}<br>
          ${data.date} at ${data.time}
        </p>
        ${
          data.reason
            ? `<p style="margin-top: 16px; color: #6b7280;"><strong>Reason:</strong> ${data.reason}</p>`
            : ""
        }
      </div>
      
      ${
        data.refundAmount
          ? `
      <p style="background-color: #d1fae5; border-radius: 8px; padding: 16px; color: #065f46;">
        <strong>Refund Processed:</strong> INR ${data.refundAmount} has been refunded to your account. It may take 5-7 business days to reflect.
      </p>
      `
          : ""
      }
      
      <div style="text-align: center; margin: 32px 0;">
        <p><strong>We're sorry for the inconvenience!</strong></p>
        <a href="${data.rescheduleLink}" class="button">Book Another Session</a>
      </div>
    </div>
    
    <div class="footer">
      <p>Need help? <a href="mailto:support@matepeak.com">Contact Support</a></p>
      <p>&copy; 2025 MatePeak - Be a Solopreneur. All rights reserved.</p>
    </div>
  </div>
  </div>
</body>
</html>
    `,
  }),

  reviewRequest: (data: any) => ({
    subject: `How was your session with ${data.mentorName}?`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { margin: 0; padding: 0; background-color: #f6f7f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
    .wrapper { width: 100%; padding: 60px 0; display: flex; justify-content: center; }
    .container { width: 520px; background: #ffffff; border-radius: 10px; padding: 40px; }
    .logo { text-align: center; font-size: 22px; font-weight: 600; color: #000; margin-bottom: 28px; }
    .header { text-align: center; margin-bottom: 28px; background: #ffffff; }
    .content { background: #ffffff; }
    h1 { text-align: center; font-size: 24px; font-weight: 600; color: #111; margin: 0; }
    p { font-size: 14px; color: #555; margin-bottom: 18px; line-height: 1.6; }
    .card { background: #f4f5f7; border-radius: 8px; padding: 20px; margin: 30px 0; }
    .button { background-color: #000; color: #fff; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-size: 14px; font-weight: 500; display: inline-block; }
    .stars { font-size: 32px; margin: 20px 0; }
    .footer { text-align: center; font-size: 12px; color: #888; margin-top: 12px; }
    .highlight { background: #f4f5f7; padding: 16px; border-radius: 8px; }
  </style>
</head>
<body>
  <div class="wrapper">
  <div class="container">
    <div class="logo">MatePeak</div>
    <div class="header">
      <img src="https://wpltqdlvrzukghiwvxqd.supabase.co/storage/v1/object/public/avatars/lovable-uploads/MatePeak_logo_with_name.png" alt="MatePeak" style="height: 40px; margin-bottom: 16px;" />
      <h1>Share Your Experience</h1>
    </div>
    
    <div class="content">
      <p>Hi ${data.studentName},</p>
      <p>We hope you had a valuable session with <strong>${data.mentorName}</strong>!</p>
      
      <div class="card">
        <p style="text-align: center; margin: 0;">
          <strong>Session Details</strong><br>
          ${data.serviceName}<br>
          ${data.date} - ${data.duration} minutes
        </p>
      </div>

      <div class="highlight">
        <p style="margin: 0; text-align: center;">
          <strong>Your feedback matters!</strong><br>
          Help other students find great mentors and help ${data.mentorName} grow their profile.
        </p>
      </div>
      
      <div style="text-align: center; margin: 32px 0;">
        <a href="${data.reviewLink}" class="button">Leave Your Review</a>
      </div>

      <p style="text-align: center; color: #6b7280; font-size: 14px; margin-top: 24px;">
        This will only take 2 minutes
      </p>

      <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #e5e7eb;">
        <p style="text-align: center;">
          <strong>Enjoyed your session?</strong><br>
          <a href="${data.bookAgainLink}" style="color: #111827; text-decoration: none; font-weight: 600;">Book another session with ${data.mentorName}</a>
        </p>
      </div>
    </div>
    
    <div class="footer">
      <p>Questions? <a href="mailto:support@matepeak.com">Contact Support</a></p>
      <p>&copy; 2025 Spark Mentor Connect. All rights reserved.</p>
    </div>
  </div>
  </div>
</body>
</html>
    `,
  }),
};
