import React from 'react'
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import type { PurchaseOrder, POItem, Supplier, RawMaterial } from '@/types/database'
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

type POItemWithMaterial = POItem & {
  raw_materials?: RawMaterial | null
}

interface PODocumentProps {
  order: PurchaseOrder & { suppliers?: Supplier | null }
  items: POItemWithMaterial[]
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

export default function PODocument({ order, items }: PODocumentProps) {
  const supplier = order.suppliers
  const currency = order.currency || 'LKR'

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header band */}
        <View style={styles.headerBand}>
          <View>
            <Text style={styles.headerTitle}>PURCHASE ORDER</Text>
            <Text style={{ fontSize: 10, marginTop: 4, color: '#D8F3DC' }}>
              Karnex ERP Systems (Pvt) Ltd.
            </Text>
          </View>
          <View style={styles.headerMeta}>
            <Text>PO Number: <Text style={styles.metaTextBold}>{order.po_number}</Text></Text>
            <Text style={{ marginTop: 2 }}>Date: {formatDate(order.order_date)}</Text>
            <Text style={{ marginTop: 2 }}>Status: {order.status.toUpperCase()}</Text>
          </View>
        </View>

        {/* Details section */}
        <View style={styles.detailsContainer}>
          {/* Supplier details */}
          <View style={styles.detailBox}>
            <Text style={styles.detailTitle}>Vendor / Supplier</Text>
            <Text style={[styles.detailText, { fontFamily: 'Helvetica-Bold' }]}>
              {supplier?.name || '—'}
            </Text>
            {supplier?.contact_person && (
              <Text style={styles.detailText}>Attn: {supplier.contact_person}</Text>
            )}
            {supplier?.address && (
              <Text style={styles.detailText}>{supplier.address}</Text>
            )}
            {supplier?.phone && (
              <Text style={styles.detailText}>Tel: {supplier.phone}</Text>
            )}
            {supplier?.email && (
              <Text style={styles.detailText}>Email: {supplier.email}</Text>
            )}
          </View>

          {/* Shipping details */}
          <View style={styles.detailBox}>
            <Text style={styles.detailTitle}>Ship To</Text>
            <Text style={[styles.detailText, { fontFamily: 'Helvetica-Bold' }]}>
              Karnex ERP Warehouse
            </Text>
            <Text style={styles.detailText}>
              456 Innovation Boulevard, High-Tech Industrial Zone
            </Text>
            <Text style={styles.detailText}>Colombo 03, Sri Lanka</Text>
            <Text style={styles.detailText}>Expected Delivery: {formatDate(order.expected_date)}</Text>
          </View>
        </View>

        {/* Table Title */}
        <Text style={styles.sectionTitle}>Line Items</Text>

        {/* Table */}
        <View style={styles.table}>
          {/* Header */}
          <View style={styles.tableHeader}>
            <Text style={styles.colNo}>#</Text>
            <Text style={styles.colItem}>Material / Item Description</Text>
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
                {item.raw_materials?.name || 'Unknown Material'}{' '}
                {item.raw_materials?.code ? `(${item.raw_materials.code})` : ''}
              </Text>
              <Text style={styles.colQty}>
                {item.quantity.toLocaleString(undefined, { minimumFractionDigits: 2 })}
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
          {/* Notes */}
          <View style={{ flex: 1.2 }}>
            {order.notes ? (
              <View style={styles.notesSection}>
                <Text style={styles.notesTitle}>Special Instructions / Notes</Text>
                <Text style={styles.notesText}>{order.notes}</Text>
              </View>
            ) : null}
            
            <View style={[styles.notesSection, { marginTop: order.notes ? 10 : 0 }]}>
              <Text style={styles.notesTitle}>Payment & Terms</Text>
              <Text style={styles.notesText}>
                Payment terms are as per vendor contract: {supplier?.payment_terms || 'Net 30'}.
              </Text>
            </View>
          </View>

          {/* Totals */}
          <View style={{ flex: 0.8, alignItems: 'flex-end' }}>
            <View style={[styles.totalsBox, { width: '100%' }]}>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Subtotal</Text>
                <Text style={styles.totalVal}>
                  {Number(order.total_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </Text>
              </View>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Tax (0.00%)</Text>
                <Text style={styles.totalVal}>0.00</Text>
              </View>
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
            <Text style={styles.signTitle}>Procurement Officer</Text>
          </View>
          <View style={styles.signBox}>
            <Text style={styles.signLine}>Authorized Signature</Text>
            <Text style={styles.signTitle}>Finance Director / Admin</Text>
          </View>
        </View>

        {/* Footer */}
        <Text style={styles.footer}>
          Karnex ERP Systems · Colombo, Sri Lanka · operations@karnex.com · Confidential Document
        </Text>
      </Page>
    </Document>
  )
}
