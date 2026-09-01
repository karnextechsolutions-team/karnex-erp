-- 1. Create quotations table
CREATE TABLE IF NOT EXISTS public.quotations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quotation_number TEXT UNIQUE NOT NULL,
    customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    valid_until DATE NOT NULL,
    total_amount DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    md_approval_status TEXT NOT NULL CHECK (md_approval_status IN ('Draft', 'Pending Approval', 'Approved', 'Rejected')) DEFAULT 'Draft',
    status TEXT NOT NULL CHECK (status IN ('Active', 'Converted to SO', 'Expired')) DEFAULT 'Active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security (RLS) as per Supabase defaults
ALTER TABLE public.quotations ENABLE ROW LEVEL SECURITY;

-- Create basic RLS policies (allow all authenticated users for now, matching other tables)
CREATE POLICY "Allow all operations for authenticated users" ON public.quotations
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 2. Create quotation_items table
CREATE TABLE IF NOT EXISTS public.quotation_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quotation_id UUID REFERENCES public.quotations(id) ON DELETE CASCADE,
    item_id UUID REFERENCES public.raw_materials(id) ON DELETE CASCADE,
    quantity DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    unit_price DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    total_price DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.quotation_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations for authenticated users" ON public.quotation_items
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 3. Update purchase_orders table
ALTER TABLE public.purchase_orders
ADD COLUMN IF NOT EXISTS md_approval_status TEXT NOT NULL CHECK (md_approval_status IN ('Pending', 'Approved', 'Rejected')) DEFAULT 'Pending',
ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
