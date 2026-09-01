CREATE TABLE IF NOT EXISTS public.direct_receipts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    item_id UUID NOT NULL REFERENCES public.raw_materials(id),
    supplier_id UUID REFERENCES public.suppliers(id),
    received_qty NUMERIC(15, 2) NOT NULL,
    unit_cost NUMERIC(15, 2) NOT NULL,
    received_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    remarks TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION public.receive_consumable(
    p_item_id UUID,
    p_supplier_id UUID,
    p_received_qty NUMERIC,
    p_unit_cost NUMERIC,
    p_remarks TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_stock_record RECORD;
    v_receipt_id UUID;
BEGIN
    IF p_received_qty <= 0 THEN
        RAISE EXCEPTION 'Received quantity must be greater than zero';
    END IF;

    -- Lock raw material record
    SELECT id INTO v_stock_record
    FROM public.raw_materials
    WHERE id = p_item_id FOR UPDATE;

    IF v_stock_record IS NULL THEN
        RAISE EXCEPTION 'Item not found';
    END IF;

    -- Update inventory
    UPDATE public.raw_materials
    SET 
        quantity_in_stock = COALESCE(quantity_in_stock, 0) + p_received_qty,
        updated_at = NOW()
    WHERE id = p_item_id;

    -- Insert log
    INSERT INTO public.direct_receipts(item_id, supplier_id, received_qty, unit_cost, remarks)
    VALUES (p_item_id, p_supplier_id, p_received_qty, p_unit_cost, p_remarks)
    RETURNING id INTO v_receipt_id;

    RETURN jsonb_build_object('success', true, 'receipt_id', v_receipt_id);
END;
$$;
