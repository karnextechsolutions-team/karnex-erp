import React from 'react'
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import type { SalesOrder, SOItem, Customer, Product, Invoice } from '@/types/database'
import { format } from 'date-fns'

function formatDate(dateStr?: string | null) {
  if (!dateStr) return '—'
  if (/[a-zA-Z]/.test(dateStr) && !dateStr.includes('T')) return dateStr
  try {
    const parts = dateStr.split('T')[0].split('-')
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10)
      const month = parseInt(parts[1], 10) - 1
      const day = parseInt(parts[2], 10)
      const date = new Date(year, month, day)
      return format(date, 'dd MMM yyyy')
    }
    const date = new Date(dateStr)
    if (isNaN(date.getTime())) return dateStr
    return format(date, 'dd MMM yyyy')
  } catch (e) {
    return dateStr
  }
}

type SOItemWithProduct = SOItem & {
  products?: Product | null
}

interface InvoiceDocumentProps {
  invoice: Invoice
  order: SalesOrder & { customers?: Customer | null }
  items: SOItemWithProduct[]
}

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 10,
    padding: 30,
    color: '#1A2E25',
    backgroundColor: '#FFFFFF',
  },
  headerBand: {
    backgroundColor: '#2D6A4F',
    padding: 15,
    borderRadius: 6,
    color: '#FFFFFF',
    marginBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    fontFamily: 'Helvetica-Bold',
  },
  headerMeta: {
    fontSize: 10,
    textAlign: 'right',
  },
  metaTextBold: {
    fontFamily: 'Helvetica-Bold',
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    color: '#2D6A4F',
    borderBottomWidth: 1,
    borderBottomColor: '#E2EBE7',
    paddingBottom: 4,
    marginBottom: 10,
  },
  detailsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    gap: 15,
  },
  detailBox: {
    flex: 1,
    backgroundColor: '#F8FAF9',
    borderRadius: 6,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2EBE7',
  },
  detailTitle: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#4A6358',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  detailText: {
    lineHeight: 1.4,
    fontSize: 9,
    color: '#1A2E25',
  },
  table: {
    marginTop: 10,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E2EBE7',
    borderRadius: 6,
    overflow: 'hidden',
  },
  tableHeader: {
    backgroundColor: '#2D6A4F',
    flexDirection: 'row',
    color: '#FFFFFF',
    fontFamily: 'Helvetica-Bold',
    fontSize: 9,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E2EBE7',
    alignItems: 'center',
  },
  tableRowEven: {
    backgroundColor: '#FFFFFF',
  },
  tableRowOdd: {
    backgroundColor: '#F0F7F4',
  },
  colNo: { width: '8%', padding: 6, textAlign: 'center' },
  colItem: { width: '42%', padding: 6 },
  colQty: { width: '15%', padding: 6, textAlign: 'right' },
  colPrice: { width: '15%', padding: 6, textAlign: 'right' },
  colTotal: { width: '20%', padding: 6, textAlign: 'right' },
  totalsBox: {
    borderWidth: 1,
    borderColor: '#E2EBE7',
    borderRadius: 6,
    padding: 10,
    backgroundColor: '#F8FAF9',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  totalRowGrand: {
    borderTopWidth: 1,
    borderTopColor: '#2D6A4F',
    marginTop: 5,
    paddingTop: 5,
    fontFamily: 'Helvetica-Bold',
    color: '#2D6A4F',
  },
  totalLabel: {
    color: '#4A6358',
    fontSize: 9,
  },
  totalVal: {
    fontSize: 9,
    textAlign: 'right',
  },
  notesSection: {
    marginBottom: 25,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2EBE7',
    borderRadius: 6,
    backgroundColor: '#F8FAF9',
  },
  notesTitle: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#4A6358',
    marginBottom: 4,
  },
  notesText: {
    fontSize: 8.5,
    lineHeight: 1.3,
    color: '#4A6358',
  },
  signContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 40,
    paddingHorizontal: 20,
  },
  signBox: {
    width: '40%',
    textAlign: 'center',
  },
  signLine: {
    borderTopWidth: 1,
    borderTopColor: '#4A6358',
    marginTop: 35,
    paddingTop: 4,
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#1A2E25',
  },
  signTitle: {
    fontSize: 8,
    color: '#4A6358',
    marginTop: 2,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 30,
    right: 30,
    borderTopWidth: 1,
    borderTopColor: '#E2EBE7',
    paddingTop: 10,
    textAlign: 'center',
    color: '#8FAF9F',
    fontSize: 8,
  },
})

export default function InvoiceDocument({ invoice, order, items }: InvoiceDocumentProps) {
  const customer = order.customers
  const currency = order.currency || 'LKR'

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header band */}
        <View style={styles.headerBand}>
          <View>
            <Text style={styles.headerTitle}>INVOICE</Text>
            <Text style={{ fontSize: 10, marginTop: 4, color: '#D8F3DC' }}>
              Karnex ERP Systems (Pvt) Ltd.
            </Text>
          </View>
          <View style={styles.headerMeta}>
            <Text>Invoice No: <Text style={styles.metaTextBold}>{invoice.invoice_number}</Text></Text>
            <Text style={{ marginTop: 2 }}>SO Number: {order.so_number}</Text>
            <Text style={{ marginTop: 2 }}>Date: {formatDate(invoice.invoice_date)}</Text>
            <Text style={{ marginTop: 2 }}>Due Date: {formatDate(invoice.due_date)}</Text>
            <Text style={{ marginTop: 2 }}>Status: {invoice.status.toUpperCase()}</Text>
          </View>
        </View>

        {/* Details section */}
        <View style={styles.detailsContainer}>
          {/* Bill To */}
          <View style={styles.detailBox}>
            <Text style={styles.detailTitle}>Bill To</Text>
            <Text style={[styles.detailText, { fontFamily: 'Helvetica-Bold' }]}>
              {customer?.name || '—'}
            </Text>
            {customer?.contact_person && (
              <Text style={styles.detailText}>Attn: {customer.contact_person}</Text>
            )}
            {customer?.address && (
              <Text style={styles.detailText}>{customer.address}</Text>
            )}
            {customer?.phone && (
              <Text style={styles.detailText}>Tel: {customer.phone}</Text>
            )}
            {customer?.email && (
              <Text style={styles.detailText}>Email: {customer.email}</Text>
            )}
          </View>

          {/* Ship To */}
          <View style={styles.detailBox}>
            <Text style={styles.detailTitle}>Ship To</Text>
            <Text style={[styles.detailText, { fontFamily: 'Helvetica-Bold' }]}>
              {customer?.name || '—'}
            </Text>
            {order.shipping_address ? (
              <Text style={styles.detailText}>{order.shipping_address}</Text>
            ) : customer?.address ? (
              <Text style={styles.detailText}>{customer.address}</Text>
            ) : (
              <Text style={styles.detailText}>—</Text>
            )}
            {order.delivery_date && (
              <Text style={{ ...styles.detailText, marginTop: 4 }}>
                Delivery Date: {formatDate(order.delivery_date)}
              </Text>
            )}
          </View>
        </View>

        {/* Table Title */}
        <Text style={styles.sectionTitle}>Line Items</Text>

        {/* Table */}
        <View style={styles.table}>
          {/* Header */}
          <View style={styles.tableHeader}>
            <Text style={styles.colNo}>#</Text>
            <Text style={styles.colItem}>Product / Goods Description</Text>
            <Text style={styles.colQty}>Qty</Text>
            <Text style={styles.colPrice}>Unit Price</Text>
            <Text style={styles.colTotal}>Total</Text>
          </View>
          {/* Rows */}
          {items.map((item, idx) => (
            <View
              key={item.id}
              style={[
                styles.tableRow,
                idx % 2 === 0 ? styles.tableRowEven : styles.tableRowOdd,
              ]}
            >
              <Text style={styles.colNo}>{idx + 1}</Text>
              <Text style={styles.colItem}>
                {item.products?.name || 'Unknown Product'}{' '}
                {item.products?.sku ? `(${item.products.sku})` : ''}
              </Text>
              <Text style={styles.colQty}>
                {item.quantity.toLocaleString()}{' '}
                <Text style={{ fontSize: 7, color: '#4A6358' }}>{item.products?.unit || 'pcs'}</Text>
              </Text>
              <Text style={styles.colPrice}>
                {Number(item.unit_price).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </Text>
              <Text style={styles.colTotal}>
                {Number(item.total_price).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </Text>
            </View>
          ))}
        </View>

        {/* Totals & Notes */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 15 }}>
          {/* Bank Instructions / Notes */}
          <View style={{ flex: 1.2 }}>
            <View style={styles.notesSection}>
              <Text style={styles.notesTitle}>Bank Transfer Instructions</Text>
              <Text style={styles.notesText}>Bank: SL National Commerce Bank</Text>
              <Text style={styles.notesText}>Account Name: Karnex ERP Systems (Pvt) Ltd.</Text>
              <Text style={styles.notesText}>Account No: 1092-3847-1902-8374</Text>
              <Text style={styles.notesText}>Swift Code: SLNCBLKX</Text>
            </View>

            {invoice.notes || order.notes ? (
              <View style={[styles.notesSection, { marginTop: 10 }]}>
                <Text style={styles.notesTitle}>Special Instructions / Notes</Text>
                <Text style={styles.notesText}>{invoice.notes || order.notes}</Text>
              </View>
            ) : null}
          </View>

          {/* Totals */}
          <View style={{ flex: 0.8, alignItems: 'flex-end' }}>
            <View style={[styles.totalsBox, { width: '100%' }]}>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Subtotal</Text>
                <Text style={styles.totalVal}>
                  {Number(order.subtotal).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </Text>
              </View>
              {Number(order.discount) > 0 ? (
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Discount</Text>
                  <Text style={[styles.totalVal, { color: '#DC2626' }]}>
                    - {Number(order.discount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </Text>
                </View>
              ) : null}
              <View style={[styles.totalRow, styles.totalRowGrand]}>
                <Text style={{ fontFamily: 'Helvetica-Bold', color: '#2D6A4F' }}>Grand Total</Text>
                <Text style={{ fontFamily: 'Helvetica-Bold', color: '#2D6A4F' }}>
                  {currency} {Number(invoice.total_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </Text>
              </View>
              <View style={[styles.totalRow, { borderTopWidth: 1, borderTopColor: '#E2EBE7', marginTop: 4, paddingTop: 4 }]}>
                <Text style={styles.totalLabel}>Amount Paid</Text>
                <Text style={styles.totalVal}>
                  {Number(invoice.amount_paid).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </Text>
              </View>
              <View style={[styles.totalRow, { fontFamily: 'Helvetica-Bold' }]}>
                <Text style={{ color: '#1A2E25' }}>Balance Due</Text>
                <Text style={{ color: '#1A2E25' }}>
                  {currency} {Number(invoice.balance).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Signatures */}
        <View style={styles.signContainer}>
          <View style={styles.signBox}>
            <Text style={styles.signLine}>Prepared By</Text>
            <Text style={styles.signTitle}>Operations Manager</Text>
          </View>
          <View style={styles.signBox}>
            <Text style={styles.signLine}>Authorized Representative</Text>
            <Text style={styles.signTitle}>Finance Director</Text>
          </View>
        </View>

        {/* Footer */}
        <Text style={styles.footer}>
          Karnex ERP Systems · Colombo, Sri Lanka · operations@karnex.com · Thank you for your business!
        </Text>
      </Page>
    </Document>
  )
}
