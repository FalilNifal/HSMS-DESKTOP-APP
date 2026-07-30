import { formatMoney } from './format'
import type { Invoice } from '../api/sales'

function esc(value: string | number | null | undefined): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** Builds a clean, self-contained receipt document (no app styles inherited). */
function buildReceiptHtml(invoice: Invoice): string {
  const items = invoice.items
    .map(
      (item) => `
      <div class="item">
        <div class="row">
          <span class="iname">${esc(item.productName)}</span>
          <span class="amt">${esc(formatMoney(item.lineTotal))}</span>
        </div>
        <div class="sub muted">${item.quantity}${item.unitLabel ? ' ' + esc(item.unitLabel) : ''} &times; ${esc(formatMoney(item.actualSellingPrice))}</div>
      </div>`
    )
    .join('')

  const itemCount = invoice.items.reduce((sum, item) => sum + item.quantity, 0)

  const footer = invoice.invoiceFooterMessage
    ? `<div class="dash"></div><div class="footer">${esc(invoice.invoiceFooterMessage)}</div>`
    : ''

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>${esc(invoice.invoiceNumber)}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Courier New', ui-monospace, monospace; color: #000; padding: 8px 10px; width: 300px; }
  .center { text-align: center; }
  .shop { font-size: 17px; font-weight: 700; letter-spacing: 0.02em; }
  .muted { color: #555; }
  .sm { font-size: 11px; }
  .meta { font-size: 11px; padding: 1px 0; }
  .row { display: flex; justify-content: space-between; gap: 8px; }
  .rule { border-top: 2px solid #000; margin: 7px 0; }
  .dash { border-top: 1px dashed #000; margin: 6px 0; }
  .title { text-align: center; font-size: 11px; font-weight: 700; letter-spacing: 0.28em; color: #333; margin-bottom: 5px; }
  .ihead { display: flex; justify-content: space-between; font-size: 10px; font-weight: 700; letter-spacing: 0.08em; color: #666; }
  .item { margin: 5px 0; }
  .iname { font-size: 12px; flex: 1; padding-right: 8px; }
  .amt { font-size: 12px; white-space: nowrap; }
  .sub { font-size: 11px; margin-top: 1px; }
  .totalbox { display: flex; justify-content: space-between; align-items: center; border: 1.5px solid #000; border-radius: 4px; padding: 5px 8px; margin-top: 6px; font-size: 15px; font-weight: 700; }
  .footer { font-size: 11px; text-align: center; color: #555; }
  .logo { display: block; margin: 0 auto 6px; max-width: 120px; max-height: 120px; }
  @page { margin: 6mm; }
</style>
</head>
<body>
  ${invoice.logo ? `<img class="logo" src="${esc(invoice.logo)}" alt="" />` : ''}
  <div class="center shop">${esc(invoice.shopName)}</div>
  ${invoice.address ? `<div class="center sm muted">${esc(invoice.address)}</div>` : ''}
  ${invoice.phoneNumber ? `<div class="center sm muted">Tel: ${esc(invoice.phoneNumber)}</div>` : ''}
  <div class="rule"></div>
  <div class="title">SALES RECEIPT</div>
  <div class="row meta"><span class="muted">Invoice</span><span>${esc(invoice.invoiceNumber)}</span></div>
  <div class="row meta"><span class="muted">Date</span><span>${esc(new Date(invoice.createdAt).toLocaleString())}</span></div>
  <div class="row meta"><span class="muted">Cashier</span><span>${esc(invoice.cashierName)}</span></div>
  <div class="row meta"><span class="muted">Payment</span><span>${esc(invoice.paymentMethod)}</span></div>
  <div class="dash"></div>
  <div class="ihead"><span>ITEM</span><span>AMOUNT</span></div>
  ${items}
  <div class="dash"></div>
  <div class="row meta"><span class="muted">Items</span><span>${itemCount}</span></div>
  ${
    invoice.taxAmount > 0
      ? `<div class="row meta"><span class="muted">Subtotal</span><span>${esc(formatMoney(invoice.subTotal))}</span></div>
  <div class="row meta"><span class="muted">${esc(invoice.taxLabel)}</span><span>${esc(formatMoney(invoice.taxAmount))}</span></div>`
      : ''
  }
  <div class="totalbox"><span>TOTAL</span><span>${esc(formatMoney(invoice.totalAmount))}</span></div>
  ${footer}
</body>
</html>`
}

/**
 * Prints an invoice via a hidden, isolated iframe. This avoids the app's modal
 * clipping/overflow so every line item is guaranteed to appear on the printout.
 */
export function printInvoice(invoice: Invoice): void {
  const iframe = document.createElement('iframe')
  iframe.setAttribute('aria-hidden', 'true')
  iframe.style.position = 'fixed'
  iframe.style.right = '0'
  iframe.style.bottom = '0'
  iframe.style.width = '0'
  iframe.style.height = '0'
  iframe.style.border = '0'
  document.body.appendChild(iframe)

  const win = iframe.contentWindow
  const doc = win?.document
  if (!win || !doc) {
    iframe.remove()
    return
  }

  doc.open()
  doc.write(buildReceiptHtml(invoice))
  doc.close()

  const doPrint = (): void => {
    win.focus()
    win.print()
    setTimeout(() => iframe.remove(), 1000)
  }

  // Wait for the iframe document to be laid out before printing.
  if (doc.readyState === 'complete') {
    setTimeout(doPrint, 150)
  } else {
    iframe.onload = () => setTimeout(doPrint, 150)
  }
}
