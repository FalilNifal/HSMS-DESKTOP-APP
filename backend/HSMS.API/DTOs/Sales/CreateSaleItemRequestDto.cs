using System.ComponentModel.DataAnnotations;

namespace HSMS.API.DTOs.Sales
{
    public class CreateSaleItemRequestDto
    {
        public int ProductId { get; set; }

        [Range(1, int.MaxValue)]
        public int Quantity { get; set; }

        [Range(0, double.MaxValue)]
        public decimal ActualSellingPrice { get; set; }

        /// <summary>Base units per sold unit (1 = base unit). Base stock deducted = Quantity * UnitFactor.</summary>
        [Range(1, int.MaxValue)]
        public int UnitFactor { get; set; } = 1;

        /// <summary>Unit label to record on the line, e.g. "box". Defaults to the product's base unit.</summary>
        [MaxLength(20)]
        public string? UnitLabel { get; set; }
    }
}