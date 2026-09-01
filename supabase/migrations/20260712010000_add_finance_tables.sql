-- 1. Alter purchase_orders to add payment_status
ALTER TABLE public.purchase_orders 
ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL CHECK (payment_status IN ('Unpaid', 'Partial', 'Paid')) DEFAULT 'Unpaid';

-- 2. Create payments table
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type TEXT NOT NULL CHECK (type IN ('Inbound', 'Outbound')),
    invoice_id UUID REFERENCES public.invoices(id) ON DELETE CASCADE,
    po_id UUID REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
    amount NUMERIC(15, 2) NOT NULL,
    payment_method TEXT NOT NULL CHECK (payment_method IN ('Cash', 'Cheque', 'Bank Transfer')),
    transaction_reference TEXT,
    status TEXT NOT NULL CHECK (status IN ('Pending Approval', 'Approved', 'Rejected')) DEFAULT 'Pending Approval',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- Enforce polymorphic relationship
    CHECK (
        (type = 'Inbound' AND invoice_id IS NOT NULL AND po_id IS NULL) OR 
        (type = 'Outbound' AND po_id IS NOT NULL AND invoice_id IS NULL)
    )
);

-- 3. Add an RPC to atomically handle Maker-Checker payment approvals
CREATE OR REPLACE FUNCTION public.approve_payment(p_payment_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_payment RECORD;
    v_invoice RECORD;
    v_po RECORD;
    v_new_status TEXT;
    v_amount_paid NUMERIC;
BEGIN
    -- Lock payment record
    SELECT * INTO v_payment FROM public.payments WHERE id = p_payment_id FOR UPDATE;
    IF v_payment IS NULL THEN RAISE EXCEPTION 'Payment not found'; END IF;
    IF v_payment.status = 'Approved' THEN RAISE EXCEPTION 'Payment is already approved'; END IF;

    IF v_payment.type = 'Inbound' THEN
        -- AR logic (Invoices)
        SELECT * INTO v_invoice FROM public.invoices WHERE id = v_payment.invoice_id FOR UPDATE;
        
        -- Calculate total approved payments so far
        SELECT COALESCE(SUM(amount), 0) INTO v_amount_paid 
        FROM public.payments 
        WHERE invoice_id = v_invoice.id AND status = 'Approved';
        
        v_amount_paid := v_amount_paid + v_payment.amount;
        
        IF v_amount_paid >= v_invoice.total_amount THEN
            v_new_status := 'Paid';
        ELSE
            v_new_status := 'Partial';
        END IF;
        
        UPDATE public.invoices SET payment_status = v_new_status, updated_at = NOW() WHERE id = v_invoice.id;

    ELSIF v_payment.type = 'Outbound' THEN
        -- AP logic (Purchase Orders)
        SELECT * INTO v_po FROM public.purchase_orders WHERE id = v_payment.po_id FOR UPDATE;
        
        -- Calculate total approved payments so far
        SELECT COALESCE(SUM(amount), 0) INTO v_amount_paid 
        FROM public.payments 
        WHERE po_id = v_po.id AND status = 'Approved';
        
        v_amount_paid := v_amount_paid + v_payment.amount;
        
        IF v_amount_paid >= COALESCE(v_po.total_amount, 0) THEN
            v_new_status := 'Paid';
        ELSE
            v_new_status := 'Partial';
        END IF;
        
        UPDATE public.purchase_orders SET payment_status = v_new_status, updated_at = NOW() WHERE id = v_po.id;
    END IF;

    -- Update the payment record itself
    UPDATE public.payments SET status = 'Approved', updated_at = NOW() WHERE id = p_payment_id;

    RETURN TRUE;
END;
$$;
