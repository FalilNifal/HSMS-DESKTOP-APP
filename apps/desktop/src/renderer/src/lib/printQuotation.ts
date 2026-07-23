import { formatMoney } from './format'
import type { Quotation } from '../api/quotations'

interface ShopHeader {
  shopName: string
  address?: string
  phoneNumber?: string
}

function esc(value: string | number | null | undefined): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function buildQuotationHtml(quotation: Quotation, shop: ShopHeader): string {
  const rows = quotation.items
    .map(
      (item) => `
      <tr>
        <td>${esc(item.productName)}<div class="sku">${esc(item.sku)}</div></td>
        <td class="num">${item.quantity} ${esc(item.unitLabel)}</td>
        <td class="num">${esc(formatMoney(item.unitPrice))}</td>
        <td class="num">${esc(formatMoney(item.lineTotal))}</td>
      </tr>`
    )
    .join('')

  const validUntil = quotation.validUntil
    ? `<div class="row"><span class="muted">Valid until</span><span>${esc(new Date(quotation.validUntil).toLocaleDateString())}</span></div>`
    : ''

  const notes = quotation.notes
    ? `<div class="notes"><b>Notes:</b> ${esc(quotation.notes)}</div>`
    : ''

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>${esc(quotation.quotationNumber)}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; color: #111; padding: 24px 28px; }
  .shop { font-size: 20px; font-weight: 700; }
  .muted { color: #555; }
  .sm { font-size: 12px; color: #555; }
  .title { font-size: 16px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: #444; margin-top: 12px; }
  .meta { margin: 12px 0; font-size: 13px; }
  .row { display: flex; justify-content: space-between; max-width: 320px; padding: 1px 0; }
  table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 13px; }
  th { text-align: left; border-bottom: 2px solid #333; padding: 6px 6px; }
  td { border-bottom: 1px solid #ddd; padding: 6px 6px; vertical-align: top; }
  .num { text-align: right; white-space: nowrap; }
  .sku { font-size: 11px; color: #888; }
  .total { margin-top: 12px; text-align: right; font-size: 16px; font-weight: 700; }
  .notes { margin-top: 16px; font-size: 12px; color: #444; }
  .foot { margin-top: 28px; font-size: 11px; color: #888; text-align: center; }
  @page { margin: 14mm; }
</style>
</head>
<body>
  <div class="shop">${esc(shop.shopName)}</div>
  ${shop.address ? `<div class="sm">${esc(shop.address)}</div>` : ''}
  ${shop.phoneNumber ? `<div class="sm">Tel: ${esc(shop.phoneNumber)}</div>` : ''}
  <div class="title">Quotation</div>
  <div class="meta">
    <div class="row"><span class="muted">Quotation #</span><span>${esc(quotation.quotationNumber)}</span></div>
    <div class="row"><span class="muted">Date</span><span>${esc(new Date(quotation.createdAt).toLocaleDateString())}</span></div>
    ${quotation.customerName ? `<div class="row"><span class="muted">Customer</span><span>${esc(quotation.customerName)}</span></div>` : ''}
    ${validUntil}
  </div>
  <table>
    <thead>
      <tr><th>Item</th><th class="num">Qty</th><th class="num">Unit price</th><th class="num">Amount</th></tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="total">Total: ${esc(formatMoney(quotation.totalAmount))}</div>
  ${notes}
  <div class="foot">This is a quotation, not a tax invoice. Prices are subject to stock availability.</div>
</body>
</html>`
}

/** Prints a quotation via a hidden, isolated iframe (avoids modal clipping). */
export function printQuotation(quotation: Quotation, shop: ShopHeader): void {
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
  doc.write(buildQuotationHtml(quotation, shop))
  doc.close()

  const doPrint = (): void => {
    win.focus()
    win.print()
    setTimeout(() => iframe.remove(), 1000)
  }

  if (doc.readyState === 'complete') {
    setTimeout(doPrint, 150)
  } else {
    iframe.onload = () => setTimeout(doPrint, 150)
  }
}
