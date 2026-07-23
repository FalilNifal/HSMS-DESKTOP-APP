namespace HSMS.API.DTOs.Reports
{
    /// <summary>Day-end cash reconciliation ("Z-report") for a single day.</summary>
    public class ZReportDto
    {
        public DateTime Date { get; set; }

        public List<PaymentMethodTotalDto> SalesByMethod { get; set; } = new();

        public int SalesCount { get; set; }

        /// <summary>Total sales incl. tax for the day.</summary>
        public decimal GrossSales { get; set; }

        public decimal TaxCollected { get; set; }

        public decimal CashSales { get; set; }

        public decimal RefundsTotal { get; set; }

        public int RefundsCount { get; set; }

        public decimal ExpensesTotal { get; set; }

        public decimal ExpensesCash { get; set; }

        public decimal CustomerPaymentsTotal { get; set; }

        public decimal CustomerPaymentsCash { get; set; }

        public decimal SupplierPaymentsTotal { get; set; }

        public decimal SupplierPaymentsCash { get; set; }

        /// <summary>
        /// Expected cash movement for the day, excluding the opening float:
        /// cash sales + cash received from credit customers − refunds − cash expenses − cash supplier payments.
        /// </summary>
        public decimal ExpectedCashInDrawer { get; set; }
    }

    public class PaymentMethodTotalDto
    {
        public string Method { get; set; } = string.Empty;

        public int Count { get; set; }

        public decimal Total { get; set; }
    }
}
