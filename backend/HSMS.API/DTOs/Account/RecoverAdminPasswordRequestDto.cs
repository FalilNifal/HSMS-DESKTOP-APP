using System.ComponentModel.DataAnnotations;

namespace HSMS.API.DTOs.Account
{
    public class RecoverAdminPasswordRequestDto
    {
        [Required]
        [MaxLength(50)]
        public string AdminUsername { get; set; } = string.Empty;

        [Required]
        public string RecoveryKey { get; set; } = string.Empty;

        [Required]
        [MinLength(8)]
        public string NewPassword { get; set; } = string.Empty;
    }
}