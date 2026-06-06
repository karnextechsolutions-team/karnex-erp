export type UserRole = 'admin' | 'manager' | 'procurement' | 'production' | 'sales' | 'viewer'

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

export type Supplier = {
  id: string
  name: string
  contact_person: string | null
  phone: string | null
  email: string | null
  address: string | null
  country: string
  payment_terms: string
  rating: number | null
  notes: string | null
  is_active: boolean
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
  currency: string
  total_amount: number
  notes: string | null
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
}

export type SalesOrder = {
  id: string
  so_number: string
  customer_id: string
  created_by: string
  order_date: string
  delivery_date: string | null
  status: 'draft' | 'confirmed' | 'dispatched' | 'delivered' | 'cancelled'
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

export type Payment = {
  id: string
  invoice_id: string
  amount: number
  payment_date: string
  payment_method: string | null
  reference: string | null
  notes: string | null
  created_at: string
  invoices?: Invoice
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
    }
  }
}
