// @ts-nocheck
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface UpdateSessionRequest {
  session_id: string
  action: 'confirm' | 'complete' | 'cancel'
  payment_status?: 'paid' | 'refunded'
  cancellation_reason?: string
}

const resendApiKey = Deno.env.get('RESEND_API_KEY') ?? ''
const resendFrom = Deno.env.get('RESEND_FROM') || 'MatePeak <support@matepeak.com>'
const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

const formatSessionDateTime = (scheduledDate: string, scheduledTime: string) => {
  try {
    const date = new Date(`${scheduledDate}T${scheduledTime}`)
    return {
      date: date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
      time: date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      }),
    }
  } catch {
    return {
      date: scheduledDate || 'Scheduled date not available',
      time: scheduledTime || 'Scheduled time not available',
    }
  }
}

const sendMentorCancellationEmail = async (payload: {
  to: string
  studentName: string
  mentorName: string
  sessionType: string
  scheduledDate: string
  scheduledTime: string
  cancellationReason: string
}) => {
  if (!resendApiKey) {
    throw new Error('RESEND_API_KEY is not configured')
  }

  const { date, time } = formatSessionDateTime(payload.scheduledDate, payload.scheduledTime)
  const serviceName = payload.sessionType || 'Session'

  const subject = `Session Cancelled by ${payload.mentorName}`
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#111827;">
  <div style="max-width:600px;margin:0 auto;background:#ffffff;">
    <div style="background:#111827;color:#ffffff;padding:24px 28px;">
      <h2 style="margin:0;font-size:22px;">Session Cancelled</h2>
    </div>
    <div style="padding:24px 28px;line-height:1.6;">
      <p style="margin-top:0;">Hi ${payload.studentName},</p>
      <p>${payload.mentorName} has cancelled your upcoming ${serviceName}.</p>
      <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;padding:16px;margin:16px 0;">
        <p style="margin:0 0 6px 0;"><strong>Date:</strong> ${date}</p>
        <p style="margin:0 0 6px 0;"><strong>Time:</strong> ${time}</p>
        <p style="margin:0;"><strong>Reason:</strong> ${payload.cancellationReason}</p>
      </div>
      <p style="margin-bottom:0;color:#4b5563;">If you need help rebooking, please contact support@matepeak.com.</p>
    </div>
  </div>
</body>
</html>
`

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${resendApiKey}`,
    },
    body: JSON.stringify({
      from: resendFrom,
      to: payload.to,
      subject,
      html,
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Resend error (${res.status}): ${text}`)
  }
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Get authenticated user
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    
    if (authError || !user) {
      console.error('Auth error:', authError)
      return new Response(
        JSON.stringify({ success: false, message: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const body: UpdateSessionRequest = await req.json()
    const { session_id, action, payment_status, cancellation_reason } = body

    // Validate input
    if (!session_id || !action) {
      return new Response(
        JSON.stringify({ success: false, message: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Managing session:', { session_id, action, user_id: user.id })

    // Get the booking
    const { data: booking, error: fetchError } = await supabaseClient
      .from('bookings')
      .select('*, expert:expert_profiles(full_name), student:profiles(full_name, email)')
      .eq('id', session_id)
      .single()

    if (fetchError || !booking) {
      console.error('Booking not found:', fetchError)
      return new Response(
        JSON.stringify({ success: false, message: 'Session not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const serviceSupabaseClient = supabaseUrl && supabaseServiceRoleKey
      ? createClient(supabaseUrl, supabaseServiceRoleKey)
      : null

    // Check authorization
    const isMentor = booking.expert_id === user.id
    const isStudent = booking.user_id === user.id

    if (!isMentor && !isStudent) {
      return new Response(
        JSON.stringify({ success: false, message: 'You are not authorized to manage this session' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Determine new status and payment status based on action
    let newStatus = booking.status
    let newPaymentStatus = booking.payment_status

    const sessionStartTime = new Date(`${booking.scheduled_date}T${booking.scheduled_time}`)
    const now = new Date()

    switch (action) {
      case 'confirm':
        if (!isMentor) {
          return new Response(
            JSON.stringify({ success: false, message: 'Only mentors can confirm sessions' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        if (booking.status !== 'pending') {
          return new Response(
            JSON.stringify({ success: false, message: 'Only pending sessions can be confirmed' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        newStatus = 'confirmed'
        break

      case 'complete':
        if (!isMentor) {
          return new Response(
            JSON.stringify({ success: false, message: 'Only mentors can mark sessions as complete' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        if (booking.status !== 'confirmed') {
          return new Response(
            JSON.stringify({ success: false, message: 'Only confirmed sessions can be completed' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        newStatus = 'completed'
        if (payment_status) {
          newPaymentStatus = payment_status
        }
        break

      case 'cancel':
        if (!['pending', 'confirmed'].includes(booking.status)) {
          return new Response(
            JSON.stringify({ success: false, message: 'Only pending or confirmed sessions can be cancelled' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        if (sessionStartTime <= now) {
          return new Response(
            JSON.stringify({ success: false, message: 'Cannot cancel a session that has already started' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        newStatus = 'cancelled'
        // Auto-refund if student cancels or if specified
        if (isStudent || payment_status === 'refunded') {
          newPaymentStatus = 'refunded'
        }
        break

      default:
        return new Response(
          JSON.stringify({ success: false, message: 'Invalid action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }

    // Generate meet link for confirmed sessions
    const meetLink = action === 'confirm' 
      ? `https://meet.matepeak.com/${session_id.substring(0, 8)}` 
      : undefined;

    // Update the booking
    const updateData: any = {
      status: newStatus,
      payment_status: newPaymentStatus,
      updated_at: new Date().toISOString()
    };

    if (action === 'cancel') {
      updateData.cancelled_at = new Date().toISOString()
      updateData.cancelled_by = user.id
      updateData.cancellation_reason = (cancellation_reason || `${isMentor ? 'Mentor' : 'Student'} cancelled this session`).trim()
      if (booking.meeting_link) {
        updateData.meeting_link = null
      }
    }

    // Add meet link to message for now (until meet_link column is added)
    if (meetLink && action === 'confirm') {
      updateData.message = (booking.message || '') + `\n\nMeet Link: ${meetLink}`;
    }

    const { data: updatedBooking, error: updateError } = await supabaseClient
      .from('bookings')
      .update(updateData)
      .eq('id', session_id)
      .select('*, expert:expert_profiles(full_name, category)')
      .single()

    if (updateError) {
      console.error('Update error:', updateError)
      return new Response(
        JSON.stringify({ success: false, message: 'Failed to update session', error: updateError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let cancellationEmailSent = false
    let cancellationEmailError: string | null = null

    if (action === 'cancel' && isMentor) {
      try {
        const studentProfileEmail = booking?.student?.email || ''
        let studentEmail = studentProfileEmail || booking.user_email || ''

        if (!studentEmail && serviceSupabaseClient && booking.user_id) {
          const { data: authUserData, error: authUserError } =
            await serviceSupabaseClient.auth.admin.getUserById(booking.user_id)

          if (authUserError) {
            console.warn('Could not resolve student email via auth admin', {
              user_id: booking.user_id,
              error: authUserError.message,
            })
          } else {
            studentEmail = authUserData?.user?.email || ''
          }
        }

        if (studentEmail) {
          await sendMentorCancellationEmail({
            to: studentEmail,
            studentName: booking?.student?.full_name || 'Student',
            mentorName: booking?.expert?.full_name || 'Your mentor',
            sessionType: booking.session_type || 'session',
            scheduledDate: booking.scheduled_date,
            scheduledTime: booking.scheduled_time,
            cancellationReason:
              updateData.cancellation_reason || 'Cancelled by mentor from dashboard',
          })
          cancellationEmailSent = true
        } else {
          cancellationEmailError = 'Student email not found'
          console.warn('Skipping mentor cancellation email: student email not found', {
            booking_id: session_id,
            user_id: booking.user_id,
          })
        }
      } catch (emailError) {
        cancellationEmailError =
          emailError instanceof Error ? emailError.message : 'Unknown email error'
        console.error('Failed to send mentor cancellation email', {
          booking_id: session_id,
          error: cancellationEmailError,
        })
      }
    }

    console.log('Session updated successfully:', updatedBooking.id)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Session ${action}ed successfully`,
        data: updatedBooking,
        cancellation_email_sent: cancellationEmailSent,
        cancellation_email_error: cancellationEmailError,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ success: false, message: 'Internal server error', error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
