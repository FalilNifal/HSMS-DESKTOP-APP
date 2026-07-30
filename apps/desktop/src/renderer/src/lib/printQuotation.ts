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
  body { font-family: Arial, Helvetica, sans-serif; color: #111; padding: 28px 30px; border-top: 5px solid #1f2937; }
  .head { display: flex; justify-content: space-between; align-items: flex-start; }
  .shop { font-size: 20px; font-weight: 700; }
  .muted { color: #555; }
  .sm { font-size: 12px; color: #555; }
  .qbadge { text-align: right; }
  .qtitle { font-size: 22px; font-weight: 800; letter-spacing: 0.06em; color: #1f2937; }
  .qnum { font-size: 12px; color: #555; margin-top: 2px; }
  .meta { margin: 16px 0 4px; font-size: 13px; }
  .row { display: flex; justify-content: space-between; max-width: 300px; padding: 1px 0; }
  table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 13px; }
  th { text-align: left; background: #f3f4f6; border-bottom: 2px solid #333; padding: 7px 8px; font-size: 11px; letter-spacing: 0.04em; text-transform: uppercase; color: #444; }
  td { border-bottom: 1px solid #e5e7eb; padding: 7px 8px; vertical-align: top; }
  .num { text-align: right; white-space: nowrap; }
  .sku { font-size: 11px; color: #888; }
  .totalwrap { display: flex; justify-content: flex-end; margin-top: 14px; }
  .totalbox { min-width: 240px; border: 1.5px solid #1f2937; border-radius: 6px; padding: 8px 12px; display: flex; justify-content: space-between; font-size: 16px; font-weight: 800; }
  .notes { margin-top: 18px; font-size: 12px; color: #444; }
  .foot { margin-top: 30px; font-size: 11px; color: #888; text-align: center; border-top: 1px solid #eee; padding-top: 8px; }
  @page { margin: 14mm; }
</style>
</head>
<body>
  <div class="head">
    <div>
      <div class="shop">${esc(shop.shopName)}</div>
      ${shop.address ? `<div class="sm">${esc(shop.address)}</div>` : ''}
      ${shop.phoneNumber ? `<div class="sm">Tel: ${esc(shop.phoneNumber)}</div>` : ''}
    </div>
    <div class="qbadge">
      <div class="qtitle">QUOTATION</div>
      <div class="qnum">${esc(quotation.quotationNumber)}</div>
    </div>
  </div>
  <div class="meta">
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
  <div class="totalwrap"><div class="totalbox"><span>Total</span><span>${esc(formatMoney(quotation.totalAmount))}</span></div></div>
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
