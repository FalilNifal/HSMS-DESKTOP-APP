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
    }
}