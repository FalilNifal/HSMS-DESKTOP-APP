namespace HSMS.API.DTOs.Users
{
    public class UserResponseDto
    {
        public int Id { get; set; }

        public string FullName { get; set; } = string.Empty;

        public string Username { get; set; } = string.Empty;

        public string Role { get; set; } = string.Empty;

        public bool IsActive { get; set; }

        public DateTime CreatedAt { get; set; }

        public DateTime? UpdatedAt { get; set; }
    }
}
