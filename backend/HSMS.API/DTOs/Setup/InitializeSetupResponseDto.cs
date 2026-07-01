namespace HSMS.API.DTOs.Setup
{
    public class InitializeSetupResponseDto
    {
        public string Message { get; set; } = string.Empty;

        public string RecoveryKey { get; set; } = string.Empty;
    }
}