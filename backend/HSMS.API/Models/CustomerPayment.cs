using System.ComponentModel.DataAnnotations;

namespace HSMS.API.Models
{
    public class CustomerPayment
    {
        public int Id { get; set; }

        public int CustomerId { get; set; }

        public decimal Amount { get; set; }

        [MaxLength(20)]
        public string Method { get; set; } = "Cash";

        [MaxLength(250)]
        public string? Note { get; set; }

        public int ReceivedByUserId { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.Now;

        public Customer? Customer { get; set; }
    }
}
