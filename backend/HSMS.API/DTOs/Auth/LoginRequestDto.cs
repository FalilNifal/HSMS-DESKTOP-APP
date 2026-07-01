using System.ComponentModel.DataAnnotations;

namespace HSMS.API.DTOs.Auth
{
    public class LoginRequestDto
    {
        [Required]
        [MaxLength(50)]
        public string Username { get; set; } = string.Empty;

        [Required]
        public string Password { get; set; } = string.Empty;
    }
}