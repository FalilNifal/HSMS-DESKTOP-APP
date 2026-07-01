namespace HSMS.API.DTOs.Suppliers
{
    public class SupplierResponseDto
    {
        public int Id { get; set; }

        public string Name { get; set; } = string.Empty;

        public string? ContactPerson { get; set; }

        public string? PhoneNumber { get; set; }

        public string? Address { get; set; }

        public bool IsActive { get; set; }

        public DateTime CreatedAt { get; set; }

        public DateTime? UpdatedAt { get; set; }
    }
}