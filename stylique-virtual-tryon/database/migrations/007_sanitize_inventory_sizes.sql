-- Migration 007: sanitize legacy placeholder sizes in inventory.sizes
--
-- Problem:
-- Some synced products contain placeholder size labels (for example: "Default Title"),
-- which prevents accurate size-chart matching in Tier 3 recommendation rendering.
--
-- Action:
-- 1) Remove placeholder/empty labels from existing sizes arrays.
-- 2) If sizes becomes empty, repopulate from measurements object keys when available.

WITH normalized AS (
  SELECT
    i.id,
    COALESCE(
      (
        SELECT jsonb_agg(s.size_label ORDER BY lower(s.size_label))
        FROM (
          SELECT DISTINCT trim(value) AS size_label
          FROM jsonb_array_elements_text(
            CASE
              WHEN jsonb_typeof(i.sizes) = 'array' THEN i.sizes
              ELSE '[]'::jsonb
            END
          ) AS value
          WHERE trim(value) <> ''
            AND lower(trim(value)) NOT IN ('default title', 'default', 'title')
        ) AS s
      ),
      '[]'::jsonb
    ) AS cleaned_sizes,
    COALESCE(
      (
        SELECT jsonb_agg(m.size_label ORDER BY lower(m.size_label))
        FROM (
          SELECT DISTINCT trim(key) AS size_label
          FROM jsonb_object_keys(
            CASE
              WHEN jsonb_typeof(i.measurements) = 'object' THEN i.measurements
              ELSE '{}'::jsonb
            END
          ) AS key
          WHERE trim(key) <> ''
            AND lower(trim(key)) NOT IN ('default title', 'default', 'title')
        ) AS m
      ),
      '[]'::jsonb
    ) AS measurement_sizes
  FROM public.inventory i
),
resolved AS (
  SELECT
    n.id,
    CASE
      WHEN jsonb_array_length(n.cleaned_sizes) > 0 THEN n.cleaned_sizes
      WHEN jsonb_array_length(n.measurement_sizes) > 0 THEN n.measurement_sizes
      ELSE '[]'::jsonb
    END AS final_sizes
  FROM normalized n
)
UPDATE public.inventory i
SET
  sizes = r.final_sizes,
  updated_at = now()
FROM resolved r
WHERE i.id = r.id
  AND i.sizes IS DISTINCT FROM r.final_sizes;
