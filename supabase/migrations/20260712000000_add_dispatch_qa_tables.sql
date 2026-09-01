-- 1. Alter sales_orders to link to quotations
ALTER TABLE public.sales_orders ADD COLUMN IF NOT EXISTS quotation_id UUID REFERENCES public.quotations(id);

-- 2. Create outbound_qa_checks table
CREATE TABLE IF NOT EXISTS public.outbound_qa_checks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    so_id UUID NOT NULL REFERENCES public.sales_orders(id) ON DELETE CASCADE,
    metal_inspection BOOLEAN NOT NULL DEFAULT FALSE,
    moisture_testing BOOLEAN NOT NULL DEFAULT FALSE,
    visual_quality BOOLEAN NOT NULL DEFAULT FALSE,
    sensory_testing BOOLEAN NOT NULL DEFAULT FALSE,
    foreign_matter BOOLEAN NOT NULL DEFAULT FALSE,
    packing_material BOOLEAN NOT NULL DEFAULT FALSE,
    pest_inspection BOOLEAN NOT NULL DEFAULT FALSE,
    sealing_condition BOOLEAN NOT NULL DEFAULT FALSE,
    label_accuracy BOOLEAN NOT NULL DEFAULT FALSE,
    compliant_with_coa BOOLEAN NOT NULL DEFAULT FALSE,
    remarks TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Create invoices table
CREATE TABLE IF NOT EXISTS public.invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    so_id UUID NOT NULL REFERENCES public.sales_orders(id) ON DELETE CASCADE,
    invoice_number TEXT UNIQUE NOT NULL,
    total_amount NUMERIC(15, 2) NOT NULL,
    payment_status TEXT NOT NULL CHECK (payment_status IN ('Unpaid', 'Partial', 'Paid')) DEFAULT 'Unpaid',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Create RPC for atomic dispatch and QA validation
CREATE OR REPLACE FUNCTION public.process_outbound_dispatch(p_so_id UUID, p_qa_params JSONB)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_order RECORD;
    v_item RECORD;
    v_stock_record RECORD;
    v_invoice_num TEXT;
BEGIN
    SELECT * INTO v_order FROM public.sales_orders WHERE id = p_so_id FOR UPDATE;
    IF v_order IS NULL THEN RAISE EXCEPTION 'Sales order not found'; END IF;
    IF v_order.status = 'Dispatched' THEN RAISE EXCEPTION 'Sales order already dispatched'; END IF;

    -- Validate ALL 10 QA parameters are passed
    IF NOT (
        (p_qa_params->>'metal_inspection')::boolean AND
        (p_qa_params->>'moisture_testing')::boolean AND
        (p_qa_params->>'visual_quality')::boolean AND
        (p_qa_params->>'sensory_testing')::boolean AND
        (p_qa_params->>'foreign_matter')::boolean AND
        (p_qa_params->>'packing_material')::boolean AND
        (p_qa_params->>'pest_inspection')::boolean AND
        (p_qa_params->>'sealing_condition')::boolean AND
        (p_qa_params->>'label_accuracy')::boolean AND
        (p_qa_params->>'compliant_with_coa')::boolean
    ) THEN
        RAISE EXCEPTION 'All QA checks must pass before dispatch. Dispatch aborted.';
    END IF;

    -- Insert QA record
    INSERT INTO public.outbound_qa_checks (
        so_id, metal_inspection, moisture_testing, visual_quality, sensory_testing,
        foreign_matter, packing_material, pest_inspection, sealing_condition,
        label_accuracy, compliant_with_coa, remarks
    ) VALUES (
        p_so_id, 
        (p_qa_params->>'metal_inspection')::boolean,
        (p_qa_params->>'moisture_testing')::boolean,
        (p_qa_params->>'visual_quality')::boolean,
        (p_qa_params->>'sensory_testing')::boolean,
        (p_qa_params->>'foreign_matter')::boolean,
        (p_qa_params->>'packing_material')::boolean,
        (p_qa_params->>'pest_inspection')::boolean,
        (p_qa_params->>'sealing_condition')::boolean,
        (p_qa_params->>'label_accuracy')::boolean,
        (p_qa_params->>'compliant_with_coa')::boolean,
        p_qa_params->>'remarks'
    );

    -- Deduct Finished Goods inventory
    FOR v_item IN (SELECT * FROM public.so_items WHERE so_id = p_so_id)
    LOOP
        SELECT id, name, quantity_in_stock INTO v_stock_record 
        FROM public.products 
        WHERE id = v_item.product_id FOR UPDATE;

        IF v_stock_record.quantity_in_stock < v_item.quantity THEN
            RAISE EXCEPTION 'Insufficient stock for product % (Required: %, Available: %)', 
                v_stock_record.name, v_item.quantity, v_stock_record.quantity_in_stock;
        END IF;

        UPDATE public.products
        SET quantity_in_stock = quantity_in_stock - v_item.quantity, updated_at = NOW()
        WHERE id = v_item.product_id;
    END LOOP;

    -- Generate Invoice
    v_invoice_num := 'INV-' || TO_CHAR(NOW(), 'YYMMDDHH24MISS');
    INSERT INTO public.invoices (so_id, invoice_number, total_amount, payment_status)
    VALUES (p_so_id, v_invoice_num, COALESCE(v_order.total_amount, 0), 'Unpaid');

    -- Update SO Status
    UPDATE public.sales_orders SET status = 'Dispatched', updated_at = NOW() WHERE id = p_so_id;

    RETURN TRUE;
END;
$$;
