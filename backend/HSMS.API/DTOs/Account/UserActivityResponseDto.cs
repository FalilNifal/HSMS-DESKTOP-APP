namespace HSMS.API.DTOs.Account
{
    public class UserActivityResponseDto
    {
        public int Id { get; set; }

        public int UserId { get; set; }

        public string Username { get; set; } = string.Empty;

        public string FullName { get; set; } = string.Empty;

        public string Role { get; set; } = string.Empty;

        public string Event { get; set; } = string.Empty;

        public DateTime CreatedAt { get; set; }
    }
}
