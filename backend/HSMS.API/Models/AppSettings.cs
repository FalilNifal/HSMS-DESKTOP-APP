namespace HSMS.API.Models
{
    public class AppSettings
    {
        public int Id { get; set; }

        public bool IsSetupCompleted { get; set; } = false;

        public string? RecoveryKeyHash { get; set; }

        public DateTime? RecoveryKeyCreatedAt { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.Now;

        public DateTime? UpdatedAt { get; set; }
    }
}