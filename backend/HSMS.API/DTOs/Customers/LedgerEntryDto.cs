namespace HSMS.API.DTOs.Customers
{
    public class LedgerEntryDto
    {
        public DateTime Date { get; set; }

        // "Credit sale" or "Payment"
        public string Type { get; set; } = string.Empty;

        public string Reference { get; set; } = string.Empty;

        /// <summary>Amount added to the balance (credit sale total).</summary>
        public decimal Charge { get; set; }

        /// <summary>Amount paid off the balance (payment).</summary>
        public decimal Payment { get; set; }
    }
}
