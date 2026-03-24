-- Fix ambiguous reference to `rejection_reason` parameter in admin_reject_withdrawal.
-- Keep RPC signature unchanged for frontend compatibility.

CREATE OR REPLACE FUNCTION public.admin_reject_withdrawal(
  withdrawal_id UUID,
  rejection_reason TEXT
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
  v_rejection_reason TEXT := COALESCE(NULLIF(rejection_reason, ''), 'Rejected by admin');
  has_payout_table BOOLEAN := to_regclass('public.mentor_payouts') IS NOT NULL;
  has_mark_failed_rpc BOOLEAN := to_regprocedure('public.mark_mentor_payout_failed(uuid,text,jsonb)') IS NOT NULL;
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

    IF FOUND AND has_mark_failed_rpc THEN
      SELECT public.mark_mentor_payout_failed(
        payout_record.id,
        v_rejection_reason,
        jsonb_build_object(
          'source', 'admin_manual_reject',
          'rejected_by', admin_user_id
        )
      )
      INTO settle_result;

      UPDATE public.withdrawal_requests
      SET reviewed_by = admin_user_id
      WHERE id = withdrawal_id;
    ELSE
      IF has_pending_withdrawal_column THEN
        UPDATE public.mentor_wallets
        SET
          balance = balance + v_withdrawal_amount,
          pending_withdrawal = GREATEST(0, pending_withdrawal - v_withdrawal_amount),
          updated_at = now()
        WHERE mentor_id = v_withdrawal_mentor_id;
      ELSE
        UPDATE public.mentor_wallets
        SET
          balance = balance + v_withdrawal_amount,
          updated_at = now()
        WHERE mentor_id = v_withdrawal_mentor_id;
      END IF;

      UPDATE public.withdrawal_requests
      SET
        status = 'rejected',
        reviewed_at = now(),
        reviewed_by = admin_user_id,
        rejection_reason = v_rejection_reason
      WHERE id = withdrawal_id;

      settle_result := jsonb_build_object('success', true, 'code', 'fallback_rejected_without_payout_row');
    END IF;
  ELSE
    -- Legacy path where no mentor_payouts row exists.
    IF has_pending_withdrawal_column THEN
      UPDATE public.mentor_wallets
      SET
        balance = balance + v_withdrawal_amount,
        pending_withdrawal = GREATEST(0, pending_withdrawal - v_withdrawal_amount),
        updated_at = now()
      WHERE mentor_id = v_withdrawal_mentor_id;
    ELSE
      UPDATE public.mentor_wallets
      SET
        balance = balance + v_withdrawal_amount,
        updated_at = now()
      WHERE mentor_id = v_withdrawal_mentor_id;
    END IF;

    UPDATE public.withdrawal_requests
    SET
      status = 'rejected',
      reviewed_at = now(),
      reviewed_by = admin_user_id,
      rejection_reason = v_rejection_reason
    WHERE id = withdrawal_id;

    settle_result := jsonb_build_object('success', true, 'code', 'legacy_rejected_restored');
  END IF;

  INSERT INTO public.admin_actions (
    admin_id,
    action_type,
    target_user_id,
    target_resource_id,
    target_resource_type,
    reason,
    details
  ) VALUES (
    admin_user_id,
    'reject_withdrawal',
    v_withdrawal_mentor_id,
    withdrawal_id,
    'withdrawal_request',
    v_rejection_reason,
    jsonb_build_object(
      'amount', v_withdrawal_amount,
      'status_before', v_withdrawal_status,
      'status_after', 'rejected',
      'settle_result', settle_result
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Withdrawal rejected and funds restored',
    'withdrawal_id', withdrawal_id,
    'result', settle_result
  );
END;
$$;
