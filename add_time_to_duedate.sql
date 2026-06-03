-- 1. Altera a coluna due_date de "apenas data" para "data e hora (timestamptz)"
ALTER TABLE public.tasks 
  ALTER COLUMN due_date TYPE timestamp with time zone 
  USING due_date::timestamp with time zone;
