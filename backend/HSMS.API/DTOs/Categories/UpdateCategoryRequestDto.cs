using System.ComponentModel.DataAnnotations;

namespace HSMS.API.DTOs.Categories
{
    public class UpdateCategoryRequestDto
    {
        [Required]
        [MaxLength(100)]
        public string Name { get; set; } = string.Empty;

        [MaxLength(250)]
        public string? Description { get; set; }
    }
}