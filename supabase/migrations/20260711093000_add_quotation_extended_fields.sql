-- 1. Drop existing function to allow signature change
DROP FUNCTION IF EXISTS public.create_quotation_with_items(UUID, UUID, DATE, NUMERIC, JSONB);

-- 2. Alter public.quotations table to add new columns
ALTER TABLE public.quotations
ADD COLUMN IF NOT EXISTS category_type TEXT CHECK (category_type IN ('Conventional', 'Organic', 'Fairtrade', 'Organic & Fairtrade')) DEFAULT 'Conventional',
ADD COLUMN IF NOT EXISTS dispatch_no TEXT,
ADD COLUMN IF NOT EXISTS place_of_supply TEXT,
ADD COLUMN IF NOT EXISTS courier_charge DECIMAL(12, 2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS tc_charge DECIMAL(12, 2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS mode_of_payment TEXT;

-- 3. Alter public.quotation_items table to add new columns
ALTER TABLE public.quotation_items
ADD COLUMN IF NOT EXISTS reference_po TEXT,
ADD COLUMN IF NOT EXISTS cut_size TEXT;

-- 4. Create updated function with new signature
CREATE OR REPLACE FUNCTION public.create_quotation_with_items(
    p_customer_id UUID,
    p_created_by UUID,
    p_valid_until DATE,
    p_total_amount NUMERIC,
    p_items JSONB,
    p_category_type TEXT,
    p_dispatch_no TEXT,
    p_place_of_supply TEXT,
    p_courier_charge NUMERIC,
    p_tc_charge NUMERIC,
    p_mode_of_payment TEXT
) RETURNS JSONB AS $$
DECLARE
    v_quotation_id UUID;
    v_quotation_number TEXT;
    v_item RECORD;
    v_latest_num INT;
BEGIN
    -- Auto-generate unique quotation number
    -- Format: QTN-XXXX (e.g. QTN-0001)
    SELECT COALESCE(MAX(NULLIF(regexp_replace(quotation_number, '^QTN-', ''), '')::INTEGER), 0)
    INTO v_latest_num
    FROM public.quotations
    WHERE quotation_number LIKE 'QTN-%';

    v_quotation_number := 'QTN-' || LPAD((v_latest_num + 1)::TEXT, 4, '0');

    -- Insert quotation header
    INSERT INTO public.quotations (
        quotation_number,
        customer_id,
        created_by,
        valid_until,
        total_amount,
        md_approval_status,
        status,
        category_type,
        dispatch_no,
        place_of_supply,
        courier_charge,
        tc_charge,
        mode_of_payment
    ) VALUES (
        v_quotation_number,
        p_customer_id,
        p_created_by,
        p_valid_until,
        p_total_amount,
        'Pending Approval',
        'Active',
        p_category_type,
        p_dispatch_no,
        p_place_of_supply,
        p_courier_charge,
        p_tc_charge,
        p_mode_of_payment
    ) RETURNING id INTO v_quotation_id;

    -- Loop and insert quotation items
    FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(
        item_id UUID,
        quantity NUMERIC,
        unit_price NUMERIC,
        total_price NUMERIC,
        reference_po TEXT,
        cut_size TEXT
    ) LOOP
        INSERT INTO public.quotation_items (
            quotation_id,
            item_id,
            quantity,
            unit_price,
            total_price,
            reference_po,
            cut_size
        ) VALUES (
            v_quotation_id,
            v_item.item_id,
            v_item.quantity,
            v_item.unit_price,
            v_item.total_price,
            v_item.reference_po,
            v_item.cut_size
        );
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'quotation_id', v_quotation_id,
        'quotation_number', v_quotation_number
    );
EXCEPTION WHEN OTHERS THEN
    -- Transaction automatically rolls back on EXCEPTION
    RETURN jsonb_build_object(
        'success', false,
        'error', SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
