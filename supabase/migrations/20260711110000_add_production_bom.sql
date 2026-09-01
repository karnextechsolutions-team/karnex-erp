-- 1. Alter public.products to include inventory tracking
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS quantity_in_stock NUMERIC(15, 2) DEFAULT 0;

-- 2. Create boms table
CREATE TABLE IF NOT EXISTS public.boms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES public.products(id),
    name TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('Active', 'Inactive')) DEFAULT 'Active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Create bom_items table
CREATE TABLE IF NOT EXISTS public.bom_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bom_id UUID NOT NULL REFERENCES public.boms(id) ON DELETE CASCADE,
    material_id UUID NOT NULL REFERENCES public.raw_materials(id),
    quantity_required NUMERIC(10, 4) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Create production_orders table
CREATE TABLE IF NOT EXISTS public.production_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_number TEXT UNIQUE NOT NULL,
    bom_id UUID NOT NULL REFERENCES public.boms(id),
    quantity_to_produce NUMERIC(15, 2) NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('Draft', 'In Progress', 'Completed')) DEFAULT 'Draft',
    produced_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Create RPC for completing production order
CREATE OR REPLACE FUNCTION public.complete_production_order(p_order_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_order RECORD;
    v_item RECORD;
    v_stock_record RECORD;
    v_required_qty NUMERIC(15, 4);
BEGIN
    -- Get order details
    SELECT * INTO v_order FROM public.production_orders WHERE id = p_order_id FOR UPDATE;
    
    IF v_order IS NULL THEN
        RAISE EXCEPTION 'Production order not found';
    END IF;

    IF v_order.status = 'Completed' THEN
        RAISE EXCEPTION 'Production order is already completed';
    END IF;

    -- Validate stock and deduct raw materials
    FOR v_item IN (SELECT * FROM public.bom_items WHERE bom_id = v_order.bom_id)
    LOOP
        v_required_qty := v_item.quantity_required * v_order.quantity_to_produce;
        
        SELECT id, name, quantity_in_stock INTO v_stock_record 
        FROM public.raw_materials 
        WHERE id = v_item.material_id FOR UPDATE;

        IF v_stock_record.quantity_in_stock < v_required_qty THEN
            RAISE EXCEPTION 'Insufficient stock for raw material % (Required: %, Available: %)', 
                v_stock_record.name, v_required_qty, v_stock_record.quantity_in_stock;
        END IF;

        -- Deduct RM Stock
        UPDATE public.raw_materials
        SET 
            quantity_in_stock = quantity_in_stock - v_required_qty,
            updated_at = NOW()
        WHERE id = v_item.material_id;
    END LOOP;

    -- Add FG Stock
    UPDATE public.products
    SET 
        quantity_in_stock = quantity_in_stock + v_order.quantity_to_produce,
        updated_at = NOW()
    WHERE id = (SELECT product_id FROM public.boms WHERE id = v_order.bom_id);

    -- Update order status
    UPDATE public.production_orders
    SET 
        status = 'Completed',
        produced_date = NOW(),
        updated_at = NOW()
    WHERE id = p_order_id;

    RETURN TRUE;
END;
$$;
