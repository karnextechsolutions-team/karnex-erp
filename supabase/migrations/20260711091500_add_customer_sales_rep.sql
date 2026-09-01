-- Add sales_rep_id column to customers table referencing profiles(id)
ALTER TABLE public.customers
ADD COLUMN IF NOT EXISTS sales_rep_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
