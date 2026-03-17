-- Add digital product link snapshot support on bookings
-- This stores an immutable access link at booking time for digitalProducts orders.

ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS digital_product_link TEXT;

COMMENT ON COLUMN public.bookings.digital_product_link IS
  'Snapshot of mentor digital product access link at booking time (digitalProducts only).';

-- Normalize digitalProducts JSON shape to include productLink and migrate legacy keys.
UPDATE public.expert_profiles
SET service_pricing = jsonb_set(
  COALESCE(service_pricing, '{}'::jsonb),
  '{digitalProducts}',
  (
    (COALESCE(service_pricing -> 'digitalProducts', '{}'::jsonb) - 'product_url' - 'product_link')
    || jsonb_build_object(
      'productLink',
      COALESCE(
        NULLIF(service_pricing -> 'digitalProducts' ->> 'productLink', ''),
        NULLIF(service_pricing -> 'digitalProducts' ->> 'product_url', ''),
        NULLIF(service_pricing -> 'digitalProducts' ->> 'product_link', '')
      )
    )
  ),
  true
)
WHERE service_pricing ? 'digitalProducts';
