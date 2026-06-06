import { pdf } from '@react-pdf/renderer'
import React from 'react'

export async function generateAndDownloadPDF(documentComponent: React.ReactElement<any>, fileName: string) {
  try {
    const blob = await pdf(documentComponent).toBlob()
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = fileName
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  } catch (error) {
    console.error('Error generating PDF:', error)
    throw new Error('Could not generate PDF')
  }
}

export async function printDocument(documentComponent: React.ReactElement<any>) {
  try {
    const blob = await pdf(documentComponent).toBlob()
    const url = URL.createObjectURL(blob)
    const iframe = document.createElement('iframe')
    iframe.style.display = 'none'
    iframe.src = url
    document.body.appendChild(iframe)
    iframe.onload = () => {
      iframe.contentWindow?.focus()
      iframe.contentWindow?.print()
      // Optional cleanup after printing dialog closes
      setTimeout(() => {
        document.body.removeChild(iframe)
        URL.revokeObjectURL(url)
      }, 1000)
    }
  } catch (error) {
    console.error('Error printing document:', error)
    throw new Error('Could not print PDF')
  }
}
