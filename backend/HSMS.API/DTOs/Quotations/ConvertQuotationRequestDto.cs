using System.ComponentModel.DataAnnotations;

namespace HSMS.API.DTOs.Quotations
{
    public class ConvertQuotationRequestDto
    {
        [Required]
        [MaxLength(20)]
        public string PaymentMethod { get; set; } = "Cash";

        /// <summary>Overrides the quotation's customer (required for a credit sale if none was set).</summary>
        public int? CustomerId { get; set; }
    }
}
