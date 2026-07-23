import { formatMoney } from './format'
import type { ZReport } from '../api/reports'

interface ZReportPrintExtras {
  shopName: string
  openingFloat: number
  countedCash: number | null
  expectedDrawer: number
  variance: number | null
}

function esc(value: string | number | null | undefined): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function row(label: string, value: string): string {
  return `<div class="row"><span class="muted">${esc(label)}</span><span>${esc(value)}</span></div>`
}

function buildHtml(report: ZReport, extras: ZReportPrintExtras): string {
  const methods = report.salesByMethod
    .map((m) => row(`${m.method} (${m.count})`, formatMoney(m.total)))
    .join('')

  const varianceLine =
    extras.variance === null
      ? ''
      : row(
          extras.variance === 0
            ? 'Variance'
            : extras.variance > 0
              ? 'Variance (over)'
              : 'Variance (short)',
          formatMoney(extras.variance)
        )

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>Z-Report ${esc(new Date(report.date).toLocaleDateString())}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Courier New', monospace; color: #000; padding: 8px 12px; width: 320px; }
  .center { text-align: center; }
  .shop { font-size: 15px; font-weight: 700; }
  .title { font-weight: 700; letter-spacing: 0.1em; margin-top: 4px; }
  .muted { color: #444; }
  .row { display: flex; justify-content: space-between; gap: 8px; font-size: 12px; padding: 1px 0; }
  .divider { border-top: 1px dashed #000; margin: 6px 0; }
  .big { font-size: 14px; font-weight: 700; }
  .sec { font-size: 11px; font-weight: 700; text-transform: uppercase; color: #555; margin: 6px 0 2px; }
  @page { margin: 6mm; }
</style>
</head>
<body>
  <div class="center shop">${esc(extras.shopName)}</div>
  <div class="center title">DAY-END / Z-REPORT</div>
  <div class="center muted" style="font-size:12px">${esc(new Date(report.date).toLocaleDateString())}</div>
  <div class="divider"></div>

  <div class="sec">Sales by method</div>
  ${methods || '<div class="row"><span class="muted">No sales</span><span>—</span></div>'}
  <div class="divider"></div>
  ${row('Gross sales', formatMoney(report.grossSales))}
  ${row('Tax collected', formatMoney(report.taxCollected))}
  ${row('Refunds', formatMoney(report.refundsTotal))}
  ${row('Expenses', formatMoney(report.expensesTotal))}
  ${row('Customer payments in', formatMoney(report.customerPaymentsTotal))}
  ${row('Supplier payments out', formatMoney(report.supplierPaymentsTotal))}
  <div class="divider"></div>

  <div class="sec">Cash drawer</div>
  ${row('Opening float', formatMoney(extras.openingFloat))}
  ${row('+ Cash sales', formatMoney(report.cashSales))}
  ${row('+ Cash from customers', formatMoney(report.customerPaymentsCash))}
  ${row('- Refunds', formatMoney(report.refundsTotal))}
  ${row('- Cash expenses', formatMoney(report.expensesCash))}
  ${row('- Cash to suppliers', formatMoney(report.supplierPaymentsCash))}
  <div class="divider"></div>
  <div class="row big"><span>Expected in drawer</span><span>${esc(formatMoney(extras.expectedDrawer))}</span></div>
  ${extras.countedCash !== null ? row('Counted cash', formatMoney(extras.countedCash)) : ''}
  ${varianceLine}
  <div class="divider"></div>
  <div class="center muted" style="font-size:11px">Generated ${esc(new Date().toLocaleString())}</div>
</body>
</html>`
}

/** Prints a day-end Z-report via a hidden, isolated iframe. */
export function printZReport(report: ZReport, extras: ZReportPrintExtras): void {
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
  doc.write(buildHtml(report, extras))
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
