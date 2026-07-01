using System.ComponentModel.DataAnnotations;

namespace HSMS.API.DTOs.Suppliers
{
    public class UpdateSupplierRequestDto
    {
        [Required]
        [MaxLength(150)]
        public string Name { get; set; } = string.Empty;

        [MaxLength(100)]
        public string? ContactPerson { get; set; }

        [MaxLength(30)]
        public string? PhoneNumber { get; set; }

        [MaxLength(250)]
        public string? Address { get; set; }
    }
}