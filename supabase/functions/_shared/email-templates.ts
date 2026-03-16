// Email templates with proper styling
export const emailTemplates = {
  bookingConfirmation: {
    student: (data: any) => ({
      subject: `Booking Confirmed: ${data.serviceName} with ${data.mentorName}`,
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f3f4f6; }
    .container { max-width: 600px; margin: 0 auto; background-color: white; }
    .header { background-color: #111827; color: white; padding: 32px; text-align: center; }
    .content { padding: 32px; }
    .card { background-color: #f9fafb; border-radius: 12px; padding: 20px; margin: 20px 0; }
    .button { display: inline-block; background-color: #111827; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600; }
    .footer { background-color: #f9fafb; padding: 24px; text-align: center; color: #6b7280; font-size: 14px; }
    h1 { margin: 0; font-size: 24px; }
    h2 { color: #111827; font-size: 20px; margin-top: 0; }
    .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
    .detail-label { color: #6b7280; font-weight: 500; }
    .detail-value { color: #111827; font-weight: 600; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <img src="https://wpltqdlvrzukghiwvxqd.supabase.co/storage/v1/object/public/avatars/lovable-uploads/MatePeak_logo_with_name.png" alt="MatePeak" style="height: 40px; margin-bottom: 16px;" />
      <h1>🎉 Booking Confirmed!</h1>
    </div>
    
    <div class="content">
      <p>Hi ${data.studentName},</p>
      <p>Great news! Your booking with <strong>${
        data.mentorName
      }</strong> has been confirmed.</p>
      
      <div class="card">
        <h2>Session Details</h2>
        <div class="detail-row">
          <span class="detail-label">Service</span>
          <span class="detail-value">${data.serviceName}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Date</span>
          <span class="detail-value">${data.date}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Time</span>
          <span class="detail-value">${data.time} (${data.timezone})</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Duration</span>
          <span class="detail-value">${data.duration} minutes</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Amount Paid</span>
          <span class="detail-value">₹${data.amount}</span>
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
        • You'll receive a reminder 24 hours before the session<br>
        • Another reminder will be sent 1 hour before<br>
        • ${data.mentorName} will reach out if they need any preparation details
      </p>
    </div>
    
    <div class="footer">
      <p>Need help? <a href="mailto:support@matepeak.com">Contact Support</a></p>
      <p>&copy; 2025 MatePeak - Be a Solopreneur. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
      `,
    }),

    mentor: (data: any) => ({
      subject: `New Booking: ${data.serviceName} with ${data.studentName}`,
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f3f4f6; }
    .container { max-width: 600px; margin: 0 auto; background-color: white; }
    .header { background-color: #111827; color: white; padding: 32px; text-align: center; }
    .content { padding: 32px; }
    .card { background-color: #f9fafb; border-radius: 12px; padding: 20px; margin: 20px 0; }
    .button { display: inline-block; background-color: #111827; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600; }
    .footer { background-color: #f9fafb; padding: 24px; text-align: center; color: #6b7280; font-size: 14px; }
    h1 { margin: 0; font-size: 24px; }
    h2 { color: #111827; font-size: 20px; margin-top: 0; }
    .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
    .detail-label { color: #6b7280; font-weight: 500; }
    .detail-value { color: #111827; font-weight: 600; }
    .message-box { background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 16px; margin: 16px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <img src="https://wpltqdlvrzukghiwvxqd.supabase.co/storage/v1/object/public/avatars/lovable-uploads/MatePeak_logo_with_name.png" alt="MatePeak" style="height: 40px; margin-bottom: 16px;" />
      <h1>📅 New Booking Received</h1>
    </div>
    
    <div class="content">
      <p>Hi ${data.mentorName},</p>
      <p>You have a new booking from <strong>${data.studentName}</strong>.</p>
      
      <div class="card">
        <h2>Session Details</h2>
        <div class="detail-row">
          <span class="detail-label">Student</span>
          <span class="detail-value">${data.studentName}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Service</span>
          <span class="detail-value">${data.serviceName}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Date</span>
          <span class="detail-value">${data.date}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Time</span>
          <span class="detail-value">${data.time} (${data.timezone})</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Duration</span>
          <span class="detail-value">${data.duration} minutes</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Earnings</span>
          <span class="detail-value">₹${data.earnings}</span>
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
        • Review the session purpose above<br>
        • Prepare any materials needed<br>
        • Generate meeting link if not already created
      </p>
    </div>
    
    <div class="footer">
      <p>Questions? <a href="mailto:support@matepeak.com">Contact Support</a></p>
      <p>&copy; 2025 MatePeak - Be a Solopreneur. All rights reserved.</p>
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
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f3f4f6; }
    .container { max-width: 600px; margin: 0 auto; background-color: white; }
    .header { background: linear-gradient(135deg, #3b82f6 0%, #1e40af 100%); color: white; padding: 32px; text-align: center; }
    .content { padding: 32px; }
    .card { background-color: #eff6ff; border-radius: 12px; padding: 20px; margin: 20px 0; border: 2px solid #3b82f6; }
    .button { display: inline-block; background-color: #3b82f6; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; }
    .footer { background-color: #f9fafb; padding: 24px; text-align: center; color: #6b7280; font-size: 14px; }
    h1 { margin: 0; font-size: 24px; }
    .time-badge { display: inline-block; background-color: #fef3c7; color: #92400e; padding: 8px 16px; border-radius: 20px; font-weight: 600; margin: 16px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <img src="https://wpltqdlvrzukghiwvxqd.supabase.co/storage/v1/object/public/avatars/lovable-uploads/MatePeak_logo_with_name.png" alt="MatePeak" style="height: 40px; margin-bottom: 16px;" />
      <h1>⏰ ${
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
          <h2 style="margin: 16px 0; color: #1e40af;">${data.date} at ${
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
        ✓ Review your session notes<br>
        ✓ Test your camera and microphone<br>
        ✓ Prepare any questions or materials<br>
        ✓ Find a quiet space for the call
      </p>
      `
          : `
      <p style="color: #dc2626; font-weight: 600; text-align: center;">
        ⚠️ Your session starts in 1 hour. Please be ready!
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
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f3f4f6; }
    .container { max-width: 600px; margin: 0 auto; background-color: white; }
    .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 32px; text-align: center; }
    .content { padding: 32px; }
    .card { background-color: #f0fdf4; border-radius: 12px; padding: 20px; margin: 20px 0; border: 2px solid #10b981; }
    .button { display: inline-block; background-color: #10b981; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; }
    .footer { background-color: #f9fafb; padding: 24px; text-align: center; color: #6b7280; font-size: 14px; }
    h1 { margin: 0; font-size: 24px; }
    .star-rating { font-size: 24px; margin: 16px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <img src="https://wpltqdlvrzukghiwvxqd.supabase.co/storage/v1/object/public/avatars/lovable-uploads/MatePeak_logo_with_name.png" alt="MatePeak" style="height: 40px; margin-bottom: 16px;" />
      <h1>✨ Session Completed!</h1>
    </div>
    
    <div class="content">
      <p>Hi ${data.studentName},</p>
      <p>We hope you had a great session with <strong>${data.mentorName}</strong>!</p>
      
      <div class="card">
        <p style="text-align: center; margin: 0;">
          <strong>Session Summary</strong><br>
          ${data.date} • ${data.duration} minutes<br>
          ${data.serviceName}
        </p>
      </div>
      
      <p>Your feedback helps us improve and helps other students find great mentors.</p>
      
      <div style="text-align: center; margin: 32px 0;">
        <div class="star-rating">⭐⭐⭐⭐⭐</div>
        <a href="${data.reviewLink}" class="button">Leave a Review</a>
      </div>
      
      <div style="text-align: center; margin: 24px 0;">
        <p><strong>Want another session with ${data.mentorName}?</strong></p>
        <a href="${data.bookAgainLink}" style="color: #3b82f6; text-decoration: none; font-weight: 600;">Book Again →</a>
      </div>
    </div>
    
    <div class="footer">
      <p>Questions? <a href="mailto:support@matepeak.com">Contact Support</a></p>
      <p>&copy; 2025 MatePeak - Be a Solopreneur. All rights reserved.</p>
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
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f3f4f6; }
    .container { max-width: 600px; margin: 0 auto; background-color: white; }
    .header { background-color: #ef4444; color: white; padding: 32px; text-align: center; }
    .content { padding: 32px; }
    .card { background-color: #fef2f2; border-radius: 12px; padding: 20px; margin: 20px 0; border: 2px solid #ef4444; }
    .button { display: inline-block; background-color: #111827; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600; }
    .footer { background-color: #f9fafb; padding: 24px; text-align: center; color: #6b7280; font-size: 14px; }
    h1 { margin: 0; font-size: 24px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <img src="https://wpltqdlvrzukghiwvxqd.supabase.co/storage/v1/object/public/avatars/lovable-uploads/MatePeak_logo_with_name.png" alt="MatePeak" style="height: 40px; margin-bottom: 16px;" />
      <h1>❌ Session Cancelled</h1>
    </div>
    
    <div class="content">
      <p>Hi ${data.recipientName},</p>
      <p>Your session with <strong>${
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
        <strong>💰 Refund Processed:</strong> ₹${data.refundAmount} has been refunded to your account. It may take 5-7 business days to reflect.
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
</body>
</html>
    `,
  }),

  reviewRequest: (data: any) => ({
    subject: `How was your session with ${data.mentorName}? ⭐`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f3f4f6; }
    .container { max-width: 600px; margin: 0 auto; background-color: white; }
    .header { background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; padding: 32px; text-align: center; }
    .content { padding: 32px; }
    .card { background-color: #f9fafb; border-radius: 12px; padding: 20px; margin: 20px 0; }
    .button { display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; }
    .stars { font-size: 32px; margin: 20px 0; }
    .footer { background-color: #f9fafb; padding: 24px; text-align: center; color: #6b7280; font-size: 14px; }
    h1 { margin: 0; font-size: 24px; }
    .highlight { background-color: #fef3c7; padding: 16px; border-radius: 8px; border-left: 4px solid #f59e0b; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <img src="https://wpltqdlvrzukghiwvxqd.supabase.co/storage/v1/object/public/avatars/lovable-uploads/MatePeak_logo_with_name.png" alt="MatePeak" style="height: 40px; margin-bottom: 16px;" />
      <h1>⭐ Share Your Experience</h1>
    </div>
    
    <div class="content">
      <p>Hi ${data.studentName},</p>
      <p>We hope you had a valuable session with <strong>${data.mentorName}</strong>!</p>
      
      <div class="card">
        <p style="text-align: center; margin: 0;">
          <strong>Session Details</strong><br>
          ${data.serviceName}<br>
          ${data.date} • ${data.duration} minutes
        </p>
      </div>

      <div class="highlight">
        <p style="margin: 0; text-align: center;">
          <strong>Your feedback matters!</strong><br>
          Help other students find great mentors and help ${data.mentorName} grow their profile.
        </p>
      </div>
      
      <div class="stars" style="text-align: center;">⭐ ⭐ ⭐ ⭐ ⭐</div>
      
      <div style="text-align: center; margin: 32px 0;">
        <a href="${data.reviewLink}" class="button">Leave Your Review</a>
      </div>

      <p style="text-align: center; color: #6b7280; font-size: 14px; margin-top: 24px;">
        This will only take 2 minutes
      </p>

      <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #e5e7eb;">
        <p style="text-align: center;">
          <strong>Enjoyed your session?</strong><br>
          <a href="${data.bookAgainLink}" style="color: #6366f1; text-decoration: none; font-weight: 600;">Book another session with ${data.mentorName} →</a>
        </p>
      </div>
    </div>
    
    <div class="footer">
      <p>Questions? <a href="mailto:support@matepeak.com">Contact Support</a></p>
      <p>&copy; 2025 Spark Mentor Connect. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
    `,
  }),
};
