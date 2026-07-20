using System.ComponentModel.DataAnnotations;

namespace HSMS.API.DTOs.Users
{
    public class ResetPasswordRequestDto
    {
        [Required]
        [MinLength(8)]
        public string NewPassword { get; set; } = string.Empty;
    }
}
