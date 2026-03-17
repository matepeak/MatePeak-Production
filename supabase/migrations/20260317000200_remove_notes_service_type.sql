-- Consolidate service types to: oneOnOneSession, priorityDm, digitalProducts
-- Migrate legacy notes service data into digitalProducts

-- 1) Migrate booking session types
UPDATE public.bookings
SET session_type = 'digitalProducts'
WHERE session_type = 'notes';

-- 2) Merge service_pricing.notes into service_pricing.digitalProducts, then remove notes
UPDATE public.expert_profiles
SET service_pricing = jsonb_set(
  COALESCE(service_pricing, '{}'::jsonb) - 'notes',
  '{digitalProducts}',
  jsonb_strip_nulls(
    jsonb_build_object(
      'enabled', COALESCE(
        (service_pricing -> 'digitalProducts' ->> 'enabled')::boolean,
        (service_pricing -> 'notes' ->> 'enabled')::boolean,
        false
      ),
      'name', COALESCE(
        NULLIF(service_pricing -> 'digitalProducts' ->> 'name', ''),
        NULLIF(service_pricing -> 'notes' ->> 'name', ''),
        'Resume & LinkedIn Starter Pack'
      ),
      'description', COALESCE(
        NULLIF(service_pricing -> 'digitalProducts' ->> 'description', ''),
        NULLIF(service_pricing -> 'notes' ->> 'description', ''),
        'Proven templates + expert guidance'
      ),
      'price', COALESCE(
        (service_pricing -> 'digitalProducts' ->> 'price')::numeric,
        (service_pricing -> 'notes' ->> 'price')::numeric,
        0
      ),
      'discount_price', COALESCE(
        (service_pricing -> 'digitalProducts' ->> 'discount_price')::numeric,
        (service_pricing -> 'notes' ->> 'discount_price')::numeric
      ),
      'hasFreeDemo', COALESCE(
        (service_pricing -> 'digitalProducts' ->> 'hasFreeDemo')::boolean,
        (service_pricing -> 'notes' ->> 'hasFreeDemo')::boolean,
        false
      ),
      'type', 'digitalProducts',
      'order', COALESCE(
        (service_pricing -> 'digitalProducts' ->> 'order')::int,
        (service_pricing -> 'notes' ->> 'order')::int
      )
    )
  ),
  true
)
WHERE service_pricing ? 'notes';

-- 3) Merge legacy services.notes into services.digitalProducts, then remove notes
UPDATE public.expert_profiles
SET services = jsonb_set(
  COALESCE(services, '{}'::jsonb) - 'notes',
  '{digitalProducts}',
  to_jsonb(
    COALESCE((services ->> 'digitalProducts')::boolean, false)
    OR COALESCE((services ->> 'notes')::boolean, false)
  ),
  true
)
WHERE services ? 'notes';

-- 4) Update session type comment to only list the 3 supported values
COMMENT ON COLUMN public.bookings.session_type IS
  'Type of session: oneOnOneSession, priorityDm, digitalProducts';
