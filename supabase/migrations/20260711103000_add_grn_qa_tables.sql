-- 1. Create grns table
CREATE TABLE IF NOT EXISTS public.grns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    grn_number TEXT UNIQUE NOT NULL,
    po_id UUID REFERENCES public.purchase_orders(id) ON DELETE SET NULL,
    supplier_id UUID NOT NULL REFERENCES public.suppliers(id),
    received_date DATE NOT NULL,
    vehicle_number TEXT,
    status TEXT NOT NULL CHECK (status IN ('QA Passed', 'QA Failed', 'Pending')) DEFAULT 'Pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Create grn_items table
CREATE TABLE IF NOT EXISTS public.grn_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    grn_id UUID NOT NULL REFERENCES public.grns(id) ON DELETE CASCADE,
    material_id UUID NOT NULL REFERENCES public.raw_materials(id),
    received_qty NUMERIC(10, 2) NOT NULL,
    unit_price NUMERIC(15, 2) NOT NULL,
    total_price NUMERIC(15, 2) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Create qa_receiving_checks table
CREATE TABLE IF NOT EXISTS public.qa_receiving_checks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    grn_id UUID NOT NULL REFERENCES public.grns(id) ON DELETE CASCADE UNIQUE,
    supplier_approved BOOLEAN NOT NULL DEFAULT false,
    vehicle_condition_ok BOOLEAN NOT NULL DEFAULT false,
    packaging_ok BOOLEAN NOT NULL DEFAULT false,
    label_verified BOOLEAN NOT NULL DEFAULT false,
    visual_quality_ok BOOLEAN NOT NULL DEFAULT false,
    pest_free BOOLEAN NOT NULL DEFAULT false,
    moisture_ok BOOLEAN NOT NULL DEFAULT false,
    no_chemical_contamination BOOLEAN NOT NULL DEFAULT false,
    docs_verified BOOLEAN NOT NULL DEFAULT false,
    sampling_tested BOOLEAN NOT NULL DEFAULT false,
    remarks TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Create RPC to process GRN safely in a transaction
CREATE OR REPLACE FUNCTION public.process_grn_with_qa(
    p_grn_number TEXT,
    p_po_id UUID,
    p_supplier_id UUID,
    p_received_date DATE,
    p_vehicle_number TEXT,
    p_items JSONB,
    p_qa_checks JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_grn_id UUID;
    v_qa_passed BOOLEAN;
    v_item JSONB;
BEGIN
    -- 1. Determine if QA Passed (all 10 checks must be true)
    v_qa_passed := (
        (p_qa_checks->>'supplier_approved')::BOOLEAN AND
        (p_qa_checks->>'vehicle_condition_ok')::BOOLEAN AND
        (p_qa_checks->>'packaging_ok')::BOOLEAN AND
        (p_qa_checks->>'label_verified')::BOOLEAN AND
        (p_qa_checks->>'visual_quality_ok')::BOOLEAN AND
        (p_qa_checks->>'pest_free')::BOOLEAN AND
        (p_qa_checks->>'moisture_ok')::BOOLEAN AND
        (p_qa_checks->>'no_chemical_contamination')::BOOLEAN AND
        (p_qa_checks->>'docs_verified')::BOOLEAN AND
        (p_qa_checks->>'sampling_tested')::BOOLEAN
    );

    -- 2. Insert GRN header
    INSERT INTO public.grns (
        grn_number, po_id, supplier_id, received_date, vehicle_number, status
    ) VALUES (
        p_grn_number, 
        p_po_id,
        p_supplier_id, 
        p_received_date, 
        p_vehicle_number,
        CASE WHEN v_qa_passed THEN 'QA Passed' ELSE 'QA Failed' END
    ) RETURNING id INTO v_grn_id;

    -- 3. Insert QA Checks
    INSERT INTO public.qa_receiving_checks (
        grn_id,
        supplier_approved, vehicle_condition_ok, packaging_ok, label_verified,
        visual_quality_ok, pest_free, moisture_ok, no_chemical_contamination,
        docs_verified, sampling_tested, remarks
    ) VALUES (
        v_grn_id,
        (p_qa_checks->>'supplier_approved')::BOOLEAN,
        (p_qa_checks->>'vehicle_condition_ok')::BOOLEAN,
        (p_qa_checks->>'packaging_ok')::BOOLEAN,
        (p_qa_checks->>'label_verified')::BOOLEAN,
        (p_qa_checks->>'visual_quality_ok')::BOOLEAN,
        (p_qa_checks->>'pest_free')::BOOLEAN,
        (p_qa_checks->>'moisture_ok')::BOOLEAN,
        (p_qa_checks->>'no_chemical_contamination')::BOOLEAN,
        (p_qa_checks->>'docs_verified')::BOOLEAN,
        (p_qa_checks->>'sampling_tested')::BOOLEAN,
        p_qa_checks->>'remarks'
    );

    -- 4. Process Line Items and Conditional Inventory Update
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        -- Insert Item
        INSERT INTO public.grn_items (
            grn_id, material_id, received_qty, unit_price, total_price
        ) VALUES (
            v_grn_id,
            (v_item->>'material_id')::UUID,
            (v_item->>'received_qty')::NUMERIC,
            (v_item->>'unit_price')::NUMERIC,
            (v_item->>'total_price')::NUMERIC
        );

        -- Update Inventory strictly if QA passed
        IF v_qa_passed THEN
            UPDATE public.raw_materials
            SET 
                quantity_in_stock = quantity_in_stock + (v_item->>'received_qty')::NUMERIC,
                updated_at = NOW()
            WHERE id = (v_item->>'material_id')::UUID;
        END IF;
    END LOOP;

    RETURN v_grn_id;
END;
$$;
