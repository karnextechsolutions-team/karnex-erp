export type UserRole = 'admin' | 'manager' | 'procurement' | 'production' | 'sales' | 'viewer' | 'ADMIN' | 'SALES' | 'PROCUREMENT' | 'QA' | 'PRODUCTION' | 'FINANCE' | 'HR' | 'qa' | 'finance' | 'hr'

export type Profile = {
  id: string
  full_name: string
  role: UserRole
  email: string
  phone: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export type Employee = {
  id: string
  name: string
  emp_number: string
  designation: string | null
  department: string | null
  contact_number: string | null
  basic_salary: number
  joined_date: string
  status: 'Active' | 'Inactive'
  created_at: string
  updated_at: string
}

export type Attendance = {
  id: string
  employee_id: string
  date: string
  check_in_time: string | null
  check_out_time: string | null
  status: 'Present' | 'Absent' | 'Half-Day'
  created_at: string
  employees?: Employee
}

export type Leave = {
  id: string
  employee_id: string
  leave_type: 'Annual' | 'Casual' | 'Medical' | 'No-Pay'
  start_date: string
  end_date: string
  reason: string | null
  status: 'Pending' | 'Approved' | 'Rejected'
  created_at: string
  updated_at: string
  employees?: Employee
}

export type Payslip = {
  id: string
  employee_id: string
  month_year: string
  basic_amount: number
  allowances: number
  deductions: number
  net_salary: number
  status: 'Generated' | 'Paid'
  created_at: string
  employees?: Employee
}

export type Supplier = {
  id: string
  name: string
  contact_person: string | null
  phone: string | null
  email: string | null
  address: string | null
  country: string
  category: 'Organic' | 'Conventional' | 'Traders'
  payment_terms: '7 Days' | '30 Days'
  rating: number | null
  notes: string | null
  is_active: boolean
  bank_name: string | null
  account_name: string | null
  account_number: string | null
  branch: string | null
  created_at: string
  updated_at: string
}

export type RawMaterial = {
  id: string
  name: string
  code: string | null
  category: string | null
  unit: string
  reorder_point: number
  notes: string | null
  is_active: boolean
  quantity_in_stock: number
  created_at: string
  updated_at: string
}

export type PurchaseOrder = {
  id: string
  po_number: string
  supplier_id: string
  created_by: string
  order_date: string
  expected_date: string | null
  status: 'draft' | 'sent' | 'partial' | 'received' | 'cancelled'
  approval_status: 'pending' | 'approved' | 'rejected'
  md_approval_status: 'Pending' | 'Approved' | 'Rejected'
  approved_by: string | null
  approved_at: string | null
  currency: string
  total_amount: number
  notes: string | null
  payment_status: 'Unpaid' | 'Partial' | 'Paid'
  created_at: string
  updated_at: string
  suppliers?: Supplier
  profiles?: Profile
}

export type POItem = {
  id: string
  po_id: string
  material_id: string
  quantity: number
  unit_price: number
  total_price: number
  received_qty: number
  created_at: string
  raw_materials?: RawMaterial
}

export type GoodsReceipt = {
  id: string
  grn_number: string
  po_id: string
  received_by: string
  received_date: string
  notes: string | null
  created_at: string
  purchase_orders?: PurchaseOrder
  profiles?: Profile
}

export type GRN = {
  id: string
  grn_number: string
  po_id: string | null
  supplier_id: string
  received_date: string
  vehicle_number: string | null
  status: 'QA Passed' | 'QA Failed' | 'Pending'
  created_at: string
  updated_at: string
  suppliers?: Supplier
}

export type GRNItem = {
  id: string
  grn_id: string
  material_id: string
  received_qty: number
  unit_price: number
  total_price: number
  created_at: string
  raw_materials?: RawMaterial
}

export type BOM = {
  id: string
  product_id: string
  name: string
  status: 'Active' | 'Inactive'
  created_at: string
  updated_at: string
  products?: Product
}

export type BOMItem = {
  id: string
  bom_id: string
  material_id: string
  quantity_required: number
  created_at: string
  raw_materials?: RawMaterial
}

export type ProductionOrder = {
  id: string
  order_number: string
  bom_id: string
  quantity_to_produce: number
  status: 'Draft' | 'In Progress' | 'Completed'
  produced_date: string | null
  created_at: string
  updated_at: string
  boms?: BOM
}

export type QAReceivingCheck = {
  id: string
  grn_id: string
  supplier_approved: boolean
  vehicle_condition_ok: boolean
  packaging_ok: boolean
  label_verified: boolean
  visual_quality_ok: boolean
  pest_free: boolean
  moisture_ok: boolean
  no_chemical_contamination: boolean
  docs_verified: boolean
  sampling_tested: boolean
  remarks: string | null
  created_at: string
}

export type InventoryStock = {
  id: string
  material_id: string
  batch_number: string | null
  quantity: number
  expiry_date: string | null
  location: string | null
  grn_item_id: string | null
  created_at: string
  updated_at: string
  raw_materials?: RawMaterial
}

export type Product = {
  id: string
  name: string
  sku: string | null
  category: string | null
  unit: string
  selling_price: number | null
  cost_price: number | null
  description: string | null
  is_active: boolean
  quantity_in_stock: number
  created_at: string
  updated_at: string
}

export type BillOfMaterial = {
  id: string
  product_id: string
  material_id: string
  quantity_required: number
  notes: string | null
  created_at: string
  raw_materials?: RawMaterial
}

export type WorkOrder = {
  id: string
  wo_number: string
  product_id: string
  created_by: string
  planned_date: string
  planned_qty: number
  actual_qty: number | null
  waste_qty: number
  status: 'planned' | 'in_progress' | 'completed' | 'cancelled'
  notes: string | null
  started_at: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
  products?: Product
  profiles?: Profile
}

export type Customer = {
  id: string
  name: string
  type: 'local' | 'export'
  contact_person: string | null
  phone: string | null
  email: string | null
  address: string | null
  country: string
  currency: string
  credit_limit: number
  payment_terms: string
  is_active: boolean
  created_at: string
  updated_at: string
  sales_rep_id: string | null
  profiles?: Profile | null
}

export type Quotation = {
  id: string
  quotation_number: string
  customer_id: string
  created_by: string
  valid_until: string
  total_amount: number
  md_approval_status: 'Draft' | 'Pending Approval' | 'Approved' | 'Rejected'
  status: 'Active' | 'Converted to SO' | 'Expired'
  created_at: string
  updated_at: string
  customers?: Customer
  profiles?: Profile
  category_type?: 'Conventional' | 'Organic' | 'Fairtrade' | 'Organic & Fairtrade'
  dispatch_no?: string | null
  place_of_supply?: string | null
  courier_charge?: number
  tc_charge?: number
  mode_of_payment?: string | null
}

export type QuotationItem = {
  id: string
  quotation_id: string
  item_id: string
  quantity: number
  unit_price: number
  total_price: number
  created_at: string
  raw_materials?: RawMaterial
  reference_po?: string | null
  cut_size?: string | null
}

export type SalesOrder = {
  id: string
  quotation_id?: string | null
  so_number: string
  customer_id: string
  created_by: string
  order_date: string
  delivery_date: string | null
  status: 'draft' | 'confirmed' | 'Pending QA' | 'Dispatched' | 'delivered' | 'cancelled'
  approval_status: 'pending' | 'approved' | 'rejected'
  currency: string
  exchange_rate: number
  subtotal: number
  discount: number
  total_amount: number
  shipping_address: string | null
  notes: string | null
  created_at: string
  updated_at: string
  customers?: Customer
  profiles?: Profile
}

export type SOItem = {
  id: string
  so_id: string
  product_id: string
  quantity: number
  unit_price: number
  total_price: number
  created_at: string
  products?: Product
}

export type OutboundQACheck = {
  id: string
  so_id: string
  metal_inspection: boolean
  moisture_testing: boolean
  visual_quality: boolean
  sensory_testing: boolean
  foreign_matter: boolean
  packing_material: boolean
  pest_inspection: boolean
  sealing_condition: boolean
  label_accuracy: boolean
  compliant_with_coa: boolean
  remarks: string | null
  created_at: string
  updated_at: string
}

export type Invoice = {
  id: string
  invoice_number: string
  so_id: string
  invoice_date: string
  due_date: string | null
  status: 'unpaid' | 'partial' | 'paid' | 'overdue' | 'cancelled'
  total_amount: number
  amount_paid: number
  balance: number
  notes: string | null
  created_at: string
  updated_at: string
  sales_orders?: SalesOrder
}

export type Payment = {
  id: string
  type: 'Inbound' | 'Outbound'
  invoice_id: string | null
  po_id: string | null
  amount: number
  payment_method: 'Cash' | 'Cheque' | 'Bank Transfer'
  transaction_reference: string | null
  status: 'Pending Approval' | 'Approved' | 'Rejected'
  created_at: string
  updated_at: string
  invoices?: Invoice
  purchase_orders?: PurchaseOrder
}

export type FinishedGoodsStock = {
  id: string
  product_id: string
  batch_number: string | null
  quantity: number
  production_date: string | null
  expiry_date: string | null
  location: string | null
  created_at: string
  updated_at: string
  products?: Product
}

export type StockMovement = {
  id: string
  movement_type: 'in' | 'out' | 'adjustment'
  stock_type: 'raw_material' | 'finished_good'
  reference_id: string | null
  material_id: string | null
  product_id: string | null
  quantity: number
  batch_number: string | null
  notes: string | null
  created_by: string | null
  created_at: string
  raw_materials?: RawMaterial
  products?: Product
}

export type Expense = {
  id: string
  category: string
  description: string
  amount: number
  expense_date: string
  paid_by: string | null
  receipt_url: string | null
  notes: string | null
  created_at: string
}

export type Notification = {
  id: string
  user_id: string | null
  title: string
  message: string
  type: string
  read: boolean
  created_at: string
}

export type MaterialRequisition = {
  id: string
  mrn_number: string
  user_id: string
  department: string
  status: 'Pending' | 'Issued' | 'Rejected'
  requested_date: string
  updated_at: string
  profiles?: Profile
}

export type MRNItem = {
  id: string
  mrn_id: string
  item_id: string
  requested_qty: number
  issued_qty: number | null
  raw_materials?: RawMaterial
}
export type DirectReceipt = {
  id: string
  item_id: string
  supplier_id: string | null
  received_qty: number
  unit_cost: number
  received_date: string
  remarks: string | null
  created_at: string
}

export interface Database {
  public: {
    Tables: {
      profiles: { Row: Profile; Insert: Partial<Profile>; Update: Partial<Profile> }
      suppliers: { Row: Supplier; Insert: Partial<Supplier>; Update: Partial<Supplier> }
      raw_materials: { Row: RawMaterial; Insert: Partial<RawMaterial>; Update: Partial<RawMaterial> }
      purchase_orders: { Row: PurchaseOrder; Insert: Partial<PurchaseOrder>; Update: Partial<PurchaseOrder> }
      po_items: { Row: POItem; Insert: Partial<POItem>; Update: Partial<POItem> }
      goods_receipts: { Row: GoodsReceipt; Insert: Partial<GoodsReceipt>; Update: Partial<GoodsReceipt> }
      inventory_stock: { Row: InventoryStock; Insert: Partial<InventoryStock>; Update: Partial<InventoryStock> }
      products: { Row: Product; Insert: Partial<Product>; Update: Partial<Product> }
      bill_of_materials: { Row: BillOfMaterial; Insert: Partial<BillOfMaterial>; Update: Partial<BillOfMaterial> }
      work_orders: { Row: WorkOrder; Insert: Partial<WorkOrder>; Update: Partial<WorkOrder> }
      customers: { Row: Customer; Insert: Partial<Customer>; Update: Partial<Customer> }
      sales_orders: { Row: SalesOrder; Insert: Partial<SalesOrder>; Update: Partial<SalesOrder> }
      so_items: { Row: SOItem; Insert: Partial<SOItem>; Update: Partial<SOItem> }
      invoices: { Row: Invoice; Insert: Partial<Invoice>; Update: Partial<Invoice> }
      payments: { Row: Payment; Insert: Partial<Payment>; Update: Partial<Payment> }
      expenses: { Row: Expense; Insert: Partial<Expense>; Update: Partial<Expense> }
      finished_goods_stock: { Row: FinishedGoodsStock; Insert: Partial<FinishedGoodsStock>; Update: Partial<FinishedGoodsStock> }
      stock_movements: { Row: StockMovement; Insert: Partial<StockMovement>; Update: Partial<StockMovement> }
      notifications: { Row: Notification; Insert: Partial<Notification>; Update: Partial<Notification> }
      quotations: { Row: Quotation; Insert: Partial<Quotation>; Update: Partial<Quotation> }
      quotation_items: { Row: QuotationItem; Insert: Partial<QuotationItem>; Update: Partial<QuotationItem> }
    }
  }
}
