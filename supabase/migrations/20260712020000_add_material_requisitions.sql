CREATE TABLE IF NOT EXISTS public.material_requisitions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    mrn_number TEXT UNIQUE NOT NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    department TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('Pending', 'Issued', 'Rejected')) DEFAULT 'Pending',
    requested_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.mrn_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    mrn_id UUID NOT NULL REFERENCES public.material_requisitions(id) ON DELETE CASCADE,
    item_id UUID NOT NULL REFERENCES public.raw_materials(id),
    requested_qty NUMERIC(15, 2) NOT NULL,
    issued_qty NUMERIC(15, 2)
);

CREATE OR REPLACE FUNCTION public.issue_mrn_items(
    p_mrn_id UUID,
    p_issued_items JSONB -- Array of { item_id: UUID, issued_qty: NUMERIC }
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_mrn RECORD;
    v_item JSONB;
    v_stock_record RECORD;
    v_item_id UUID;
    v_issued_qty NUMERIC;
BEGIN
    -- Lock the MRN
    SELECT * INTO v_mrn FROM public.material_requisitions WHERE id = p_mrn_id FOR UPDATE;
    IF v_mrn IS NULL THEN
        RAISE EXCEPTION 'MRN not found';
    END IF;

    IF v_mrn.status != 'Pending' THEN
        RAISE EXCEPTION 'MRN is not pending';
    END IF;

    -- Iterate and deduct stock
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_issued_items)
    LOOP
        v_item_id := (v_item->>'item_id')::UUID;
        v_issued_qty := (v_item->>'issued_qty')::NUMERIC;

        IF v_issued_qty IS NULL OR v_issued_qty < 0 THEN
            RAISE EXCEPTION 'Invalid issued quantity for item %', v_item_id;
        END IF;

        -- We allow issuing 0 quantity (partial rejection), so we only deduct if > 0
        IF v_issued_qty > 0 THEN
            -- Lock raw material record
            SELECT id, name, quantity_in_stock INTO v_stock_record
            FROM public.raw_materials
            WHERE id = v_item_id FOR UPDATE;

            IF v_stock_record IS NULL THEN
                RAISE EXCEPTION 'Raw material not found: %', v_item_id;
            END IF;

            IF COALESCE(v_stock_record.quantity_in_stock, 0) < v_issued_qty THEN
                RAISE EXCEPTION 'Insufficient stock for % (Available: %)', v_stock_record.name, COALESCE(v_stock_record.quantity_in_stock, 0);
            END IF;

            -- Deduct stock
            UPDATE public.raw_materials
            SET 
                quantity_in_stock = quantity_in_stock - v_issued_qty,
                updated_at = NOW()
            WHERE id = v_item_id;
        END IF;

        -- Update MRN item
        UPDATE public.mrn_items
        SET issued_qty = v_issued_qty
        WHERE mrn_id = p_mrn_id AND item_id = v_item_id;

    END LOOP;

    -- Update MRN status
    UPDATE public.material_requisitions
    SET status = 'Issued', updated_at = NOW()
    WHERE id = p_mrn_id;

    RETURN TRUE;
END;
$$;
