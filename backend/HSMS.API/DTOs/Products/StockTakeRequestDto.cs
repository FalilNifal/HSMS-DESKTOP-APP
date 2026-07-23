using System.ComponentModel.DataAnnotations;

namespace HSMS.API.DTOs.Products
{
    public class StockTakeRequestDto
    {
        public List<StockTakeItemDto> Items { get; set; } = new();
    }

    public class StockTakeItemDto
    {
        public int ProductId { get; set; }

        [Range(0, int.MaxValue)]
        public int CountedQuantity { get; set; }
    }
}
