using System.ComponentModel.DataAnnotations;

namespace HSMS.API.DTOs.Suppliers
{
    public class CreateSupplierBillRequestDto
    {
        [Range(0.01, double.MaxValue)]
        public decimal Amount { get; set; }

        [MaxLength(50)]
        public string? BillNumber { get; set; }

        public DateTime? BillDate { get; set; }

        [MaxLength(250)]
        public string? Notes { get; set; }
    }

    public class CreateSupplierPaymentRequestDto
    {
        [Range(0.01, double.MaxValue)]
        public decimal Amount { get; set; }

        [MaxLength(30)]
        public string PaymentMethod { get; set; } = "Cash";

        public DateTime? PaymentDate { get; set; }

        [MaxLength(250)]
        public string? Notes { get; set; }
    }

    public class SupplierLedgerEntryDto
    {
        /// <summary>"Bill" (money owed) or "Payment" (money paid).</summary>
        public string Type { get; set; } = string.Empty;

        public DateTime Date { get; set; }

        public string Reference { get; set; } = string.Empty;

        public decimal Amount { get; set; }

        public string Notes { get; set; } = string.Empty;
    }

    public class SupplierLedgerDto
    {
        public int SupplierId { get; set; }

        public string SupplierName { get; set; } = string.Empty;

        public decimal OutstandingBalance { get; set; }

        public List<SupplierLedgerEntryDto> Entries { get; set; } = new();
    }
}
