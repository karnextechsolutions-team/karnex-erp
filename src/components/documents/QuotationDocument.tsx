import React from 'react'
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import type { SalesOrder, SOItem, Customer, Product } from '@/types/database'
import { format } from 'date-fns'

function formatDate(date?: Date | string | null) {
  if (!date) return '—'
  if (date instanceof Date) {
    return format(date, 'dd MMM yyyy')
  }
  if (/[a-zA-Z]/.test(date) && !date.includes('T')) return date
  try {
    const parts = date.split('T')[0].split('-')
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10)
      const month = parseInt(parts[1], 10) - 1
      const day = parseInt(parts[2], 10)
      const d = new Date(year, month, day)
      return format(d, 'dd MMM yyyy')
    }
    const d = new Date(date)
    if (isNaN(d.getTime())) return date
    return format(d, 'dd MMM yyyy')
  } catch (e) {
    return date
  }
}

type SOItemWithProduct = SOItem & {
  products?: Product | null
}

interface QuotationDocumentProps {
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

export default function QuotationDocument({ order, items }: QuotationDocumentProps) {
  const customer = order.customers
  const currency = order.currency || 'LKR'

  // Standard Quotation Validity is 30 days
  const quoteDate = (() => {
    try {
      const parts = order.order_date.split('T')[0].split('-')
      if (parts.length === 3) {
        return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10))
      }
      return new Date(order.order_date)
    } catch {
      return new Date(order.order_date)
    }
  })()
  const validityDate = new Date(quoteDate)
  validityDate.setDate(quoteDate.getDate() + 30)

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header band */}
        <View style={styles.headerBand}>
          <View>
            <Text style={styles.headerTitle}>PROFORMA QUOTATION</Text>
            <Text style={{ fontSize: 10, marginTop: 4, color: '#D8F3DC' }}>
              Karnex ERP Systems (Pvt) Ltd.
            </Text>
          </View>
          <View style={styles.headerMeta}>
            <Text>Quote Number: <Text style={styles.metaTextBold}>QT-{order.so_number.replace('SO-', '')}</Text></Text>
            <Text style={{ marginTop: 2 }}>SO Reference: {order.so_number}</Text>
            <Text style={{ marginTop: 2 }}>Quote Date: {formatDate(quoteDate)}</Text>
            <Text style={{ marginTop: 2 }}>Valid Until: {formatDate(validityDate)}</Text>
          </View>
        </View>

        {/* Details section */}
        <View style={styles.detailsContainer}>
          {/* Prepared For */}
          <View style={styles.detailBox}>
            <Text style={styles.detailTitle}>Prepared For</Text>
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

          {/* Prepared By */}
          <View style={styles.detailBox}>
            <Text style={styles.detailTitle}>Prepared By</Text>
            <Text style={[styles.detailText, { fontFamily: 'Helvetica-Bold' }]}>
              Karnex Sales Department
            </Text>
            <Text style={styles.detailText}>
              456 Innovation Boulevard, High-Tech Industrial Zone
            </Text>
            <Text style={styles.detailText}>Colombo 03, Sri Lanka</Text>
            <Text style={styles.detailText}>Email: sales@karnex.com</Text>
          </View>
        </View>

        {/* Table Title */}
        <Text style={styles.sectionTitle}>Line Items & Estimation</Text>

        {/* Table */}
        <View style={styles.table}>
          {/* Header */}
          <View style={styles.tableHeader}>
            <Text style={styles.colNo}>#</Text>
            <Text style={styles.colItem}>Product / Service Description</Text>
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
          {/* Validity terms */}
          <View style={{ flex: 1.2 }}>
            <View style={styles.notesSection}>
              <Text style={styles.notesTitle}>Terms and Conditions</Text>
              <Text style={styles.notesText}>1. Prices are valid for 30 days from the date of quotation.</Text>
              <Text style={styles.notesText}>2. Delivery times will be confirmed upon sales order authorization.</Text>
              <Text style={styles.notesText}>3. Payment terms are as per customer profile agreement: {customer?.payment_terms || 'Net 30'}.</Text>
              <Text style={styles.notesText}>4. Items are subject to availability at the time of order confirmation.</Text>
            </View>

            {order.notes ? (
              <View style={[styles.notesSection, { marginTop: 10 }]}>
                <Text style={styles.notesTitle}>Special Instructions / Notes</Text>
                <Text style={styles.notesText}>{order.notes}</Text>
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
                  {currency} {Number(order.total_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Signatures */}
        <View style={styles.signContainer}>
          <View style={styles.signBox}>
            <Text style={styles.signLine}>Prepared By</Text>
            <Text style={styles.signTitle}>Sales Manager</Text>
          </View>
          <View style={styles.signBox}>
            <Text style={styles.signLine}>Authorized Representative</Text>
            <Text style={styles.signTitle}>Karnex Executive Board</Text>
          </View>
        </View>

        {/* Footer */}
        <Text style={styles.footer}>
          Karnex ERP Systems · Colombo, Sri Lanka · operations@karnex.com · Proforma Quotation Estimate
        </Text>
      </Page>
    </Document>
  )
}
