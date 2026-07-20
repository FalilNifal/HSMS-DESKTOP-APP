using System.ComponentModel.DataAnnotations;

namespace HSMS.API.Models
{
    public class ReturnItem
    {
        public int Id { get; set; }

        public int ReturnId { get; set; }

        public int ProductId { get; set; }

        [MaxLength(150)]
        public string ProductNameAtSale { get; set; } = string.Empty;

        [MaxLength(50)]
        public string SKUAtSale { get; set; } = string.Empty;

        public int Quantity { get; set; }

        public decimal UnitPrice { get; set; }

        public decimal LineRefund { get; set; }

        public Return? Return { get; set; }
    }
}
