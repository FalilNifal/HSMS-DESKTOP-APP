using System.ComponentModel.DataAnnotations;

namespace HSMS.API.Models
{
    public class UserActivityLog
    {
        public int Id { get; set; }

        public int UserId { get; set; }

        // Denormalized so the audit stays readable even if the user is renamed.
        [MaxLength(50)]
        public string Username { get; set; } = string.Empty;

        [MaxLength(100)]
        public string FullName { get; set; } = string.Empty;

        [MaxLength(20)]
        public string Role { get; set; } = string.Empty;

        // "Login" or "Logout"
        [MaxLength(20)]
        public string Event { get; set; } = string.Empty;

        public DateTime CreatedAt { get; set; } = DateTime.Now;
    }
}
