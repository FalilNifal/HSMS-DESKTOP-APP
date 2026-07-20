namespace HSMS.API.DTOs.Customers
{
    public class CustomerResponseDto
    {
        public int Id { get; set; }

        public string Name { get; set; } = string.Empty;

        public string? PhoneNumber { get; set; }

        public string? Address { get; set; }

        public decimal CreditLimit { get; set; }

        public decimal OutstandingBalance { get; set; }

        public string? Notes { get; set; }

        public bool IsActive { get; set; }

        public DateTime CreatedAt { get; set; }

        public DateTime? UpdatedAt { get; set; }
    }
}
