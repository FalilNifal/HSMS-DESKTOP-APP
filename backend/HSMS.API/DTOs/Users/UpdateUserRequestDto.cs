using System.ComponentModel.DataAnnotations;

namespace HSMS.API.DTOs.Users
{
    public class UpdateUserRequestDto
    {
        [Required]
        [MaxLength(100)]
        public string FullName { get; set; } = string.Empty;

        [Required]
        [MaxLength(20)]
        public string Role { get; set; } = string.Empty;

        public bool IsActive { get; set; } = true;
    }
}
