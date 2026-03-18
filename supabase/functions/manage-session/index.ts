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
      .select('*, expert:expert_profiles(full_name)')
      .eq('id', session_id)
      .single()

    if (fetchError || !booking) {
      console.error('Booking not found:', fetchError)
      return new Response(
        JSON.stringify({ success: false, message: 'Session not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

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

    console.log('Session updated successfully:', updatedBooking.id)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Session ${action}ed successfully`,
        data: updatedBooking
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
