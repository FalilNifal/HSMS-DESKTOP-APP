using System.ComponentModel.DataAnnotations;

namespace HSMS.API.DTOs.Quotations
{
    public class CreateQuotationRequestDto
    {
        public int? CustomerId { get; set; }

        [MaxLength(150)]
        public string? CustomerName { get; set; }

        [MaxLength(300)]
        public string? Notes { get; set; }

        public DateTime? ValidUntil { get; set; }

        public List<CreateQuotationItemRequestDto> Items { get; set; } = new();
    }

    public class CreateQuotationItemRequestDto
    {
        public int ProductId { get; set; }

        [Range(1, int.MaxValue)]
        public int Quantity { get; set; }

        [Range(0, double.MaxValue)]
        public decimal UnitPrice { get; set; }

        [Range(1, int.MaxValue)]
        public int UnitFactor { get; set; } = 1;

        [MaxLength(20)]
        public string? UnitLabel { get; set; }
    }
}
