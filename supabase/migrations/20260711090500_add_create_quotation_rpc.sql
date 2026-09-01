CREATE OR REPLACE FUNCTION public.create_quotation_with_items(
    p_customer_id UUID,
    p_created_by UUID,
    p_valid_until DATE,
    p_total_amount NUMERIC,
    p_items JSONB
) RETURNS JSONB AS $$
DECLARE
    v_quotation_id UUID;
    v_quotation_number TEXT;
    v_item RECORD;
    v_latest_num INT;
BEGIN
    -- 1. Auto-generate unique quotation number
    -- Format: QTN-XXXX (e.g. QTN-0001)
    SELECT COALESCE(MAX(NULLIF(regexp_replace(quotation_number, '^QTN-', ''), '')::INTEGER), 0)
    INTO v_latest_num
    FROM public.quotations
    WHERE quotation_number LIKE 'QTN-%';

    v_quotation_number := 'QTN-' || LPAD((v_latest_num + 1)::TEXT, 4, '0');

    -- 2. Insert quotation header
    INSERT INTO public.quotations (
        quotation_number,
        customer_id,
        created_by,
        valid_until,
        total_amount,
        md_approval_status,
        status
    ) VALUES (
        v_quotation_number,
        p_customer_id,
        p_created_by,
        p_valid_until,
        p_total_amount,
        'Pending Approval',
        'Active'
    ) RETURNING id INTO v_quotation_id;

    -- 3. Loop and insert quotation items
    FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(
        item_id UUID,
        quantity NUMERIC,
        unit_price NUMERIC,
        total_price NUMERIC
    ) LOOP
        INSERT INTO public.quotation_items (
            quotation_id,
            item_id,
            quantity,
            unit_price,
            total_price
        ) VALUES (
            v_quotation_id,
            v_item.item_id,
            v_item.quantity,
            v_item.unit_price,
            v_item.total_price
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
