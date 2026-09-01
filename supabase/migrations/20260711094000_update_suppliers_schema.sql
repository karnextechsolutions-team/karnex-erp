-- 1. Add 'category' column to suppliers with a CHECK constraint
ALTER TABLE public.suppliers
ADD COLUMN IF NOT EXISTS category TEXT CHECK (category IN ('Organic', 'Conventional', 'Traders')) DEFAULT 'Conventional';

-- 2. Clean up existing payment_terms to prepare for strict constraint
-- We'll set any legacy values (like 'Net 30', 'Net 60', 'Advance') to '30 Days'
UPDATE public.suppliers
SET payment_terms = '30 Days'
WHERE payment_terms NOT IN ('7 Days', '30 Days');

-- 3. In case there is an old constraint, we should attempt to drop it if it exists
-- PostgreSQL doesn't support DROP CONSTRAINT IF EXISTS out of the box in standard ALTER TABLE 
-- without knowing the name, so we just add the new constraint. We assume no strict check 
-- existed before based on the schema evaluation.
ALTER TABLE public.suppliers
ADD CONSTRAINT suppliers_payment_terms_check 
CHECK (payment_terms IN ('7 Days', '30 Days'));
