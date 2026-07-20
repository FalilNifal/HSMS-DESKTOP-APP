using System.ComponentModel.DataAnnotations;

namespace HSMS.API.DTOs.Customers
{
    public class RecordPaymentRequestDto
    {
        [Range(0.01, double.MaxValue)]
        public decimal Amount { get; set; }

        [MaxLength(20)]
        public string Method { get; set; } = "Cash";

        [MaxLength(250)]
        public string? Note { get; set; }
    }
}
