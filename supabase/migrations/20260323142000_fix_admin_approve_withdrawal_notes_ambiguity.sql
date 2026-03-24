-- Fix ambiguous reference to `notes` parameter in admin_approve_withdrawal.
-- This preserves the same RPC signature used by the frontend.

CREATE OR REPLACE FUNCTION public.admin_approve_withdrawal(
  withdrawal_id UUID,
  transaction_ref TEXT DEFAULT NULL,
  notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_user_id UUID;
  withdrawal_record RECORD;
  payout_record RECORD;
  settle_result JSONB;
  v_withdrawal_status TEXT;
  v_withdrawal_amount NUMERIC;
  v_withdrawal_mentor_id UUID;
  v_payout_id UUID;
  v_transaction_ref TEXT := transaction_ref;
  v_notes TEXT := notes;
  has_payout_table BOOLEAN := to_regclass('public.mentor_payouts') IS NOT NULL;
  has_mark_success_rpc BOOLEAN := to_regprocedure('public.mark_mentor_payout_success(uuid,text,jsonb)') IS NOT NULL;
  has_pending_withdrawal_column BOOLEAN := EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'mentor_wallets'
      AND column_name = 'pending_withdrawal'
  );
BEGIN
  admin_user_id := auth.uid();

  IF NOT public.is_admin(admin_user_id) THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  SELECT *
  INTO withdrawal_record
  FROM public.withdrawal_requests
  WHERE id = withdrawal_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Withdrawal request not found';
  END IF;

  v_withdrawal_status := COALESCE(to_jsonb(withdrawal_record) ->> 'status', '');
  v_withdrawal_amount := COALESCE((to_jsonb(withdrawal_record) ->> 'amount')::NUMERIC, 0);
  v_withdrawal_mentor_id := (to_jsonb(withdrawal_record) ->> 'mentor_id')::UUID;
  v_payout_id := NULLIF(to_jsonb(withdrawal_record) ->> 'payout_id', '')::UUID;

  IF v_withdrawal_status IN ('completed', 'rejected', 'failed') THEN
    RAISE EXCEPTION 'Withdrawal request is already finalized';
  END IF;

  IF has_payout_table AND v_payout_id IS NOT NULL THEN
    SELECT *
    INTO payout_record
    FROM public.mentor_payouts
    WHERE id = v_payout_id
    FOR UPDATE;

    IF FOUND AND has_mark_success_rpc THEN
      SELECT public.mark_mentor_payout_success(
        payout_record.id,
        v_transaction_ref,
        jsonb_build_object(
          'source', 'admin_manual_approve',
          'approved_by', admin_user_id,
          'notes', v_notes
        )
      )
      INTO settle_result;

      UPDATE public.withdrawal_requests
      SET
        reviewed_by = admin_user_id,
        notes = COALESCE(v_notes, public.withdrawal_requests.notes)
      WHERE id = withdrawal_id;
    ELSE
      UPDATE public.withdrawal_requests
      SET
        status = 'completed',
        reviewed_at = now(),
        completed_at = now(),
        reviewed_by = admin_user_id,
        transaction_id = COALESCE(v_transaction_ref, transaction_id),
        notes = COALESCE(v_notes, public.withdrawal_requests.notes)
      WHERE id = withdrawal_id;

      IF has_pending_withdrawal_column THEN
        UPDATE public.mentor_wallets
        SET
          pending_withdrawal = GREATEST(0, pending_withdrawal - v_withdrawal_amount),
          total_withdrawn = total_withdrawn + v_withdrawal_amount,
          updated_at = now()
        WHERE mentor_id = v_withdrawal_mentor_id;
      ELSE
        UPDATE public.mentor_wallets
        SET
          total_withdrawn = total_withdrawn + v_withdrawal_amount,
          updated_at = now()
        WHERE mentor_id = v_withdrawal_mentor_id;
      END IF;

      settle_result := jsonb_build_object('success', true, 'code', 'fallback_completed_without_payout_row');
    END IF;
  ELSE
    UPDATE public.withdrawal_requests
    SET
      status = 'completed',
      reviewed_at = now(),
      completed_at = now(),
      reviewed_by = admin_user_id,
      transaction_id = COALESCE(v_transaction_ref, transaction_id),
      notes = COALESCE(v_notes, public.withdrawal_requests.notes)
    WHERE id = withdrawal_id;

    IF has_pending_withdrawal_column THEN
      UPDATE public.mentor_wallets
      SET
        pending_withdrawal = GREATEST(0, pending_withdrawal - v_withdrawal_amount),
        total_withdrawn = total_withdrawn + v_withdrawal_amount,
        updated_at = now()
      WHERE mentor_id = v_withdrawal_mentor_id;
    ELSE
      UPDATE public.mentor_wallets
      SET
        total_withdrawn = total_withdrawn + v_withdrawal_amount,
        updated_at = now()
      WHERE mentor_id = v_withdrawal_mentor_id;
    END IF;

    settle_result := jsonb_build_object('success', true, 'code', 'legacy_completed');
  END IF;

  INSERT INTO public.admin_actions (
    admin_id,
    action_type,
    target_user_id,
    target_resource_id,
    target_resource_type,
    details
  ) VALUES (
    admin_user_id,
    'approve_withdrawal',
    v_withdrawal_mentor_id,
    withdrawal_id,
    'withdrawal_request',
    jsonb_build_object(
      'amount', v_withdrawal_amount,
      'transaction_id', v_transaction_ref,
      'notes', v_notes,
      'status_before', v_withdrawal_status,
      'status_after', 'completed',
      'settle_result', settle_result
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Withdrawal completed successfully',
    'withdrawal_id', withdrawal_id,
    'result', settle_result
  );
END;
$$;
