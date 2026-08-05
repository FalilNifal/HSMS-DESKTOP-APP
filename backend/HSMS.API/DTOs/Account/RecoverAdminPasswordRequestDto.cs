using System.ComponentModel.DataAnnotations;

namespace HSMS.API.DTOs.Account
{
    public class RecoverAdminPasswordRequestDto
    {
        /// <summary>Optional — if omitted, the primary (first-created) admin is reset.</summary>
        [MaxLength(50)]
        public string? AdminUsername { get; set; }

        [Required]
        public string RecoveryKey { get; set; } = string.Empty;

        [Required]
        [MinLength(8)]
        public string NewPassword { get; set; } = string.Empty;
    }
}