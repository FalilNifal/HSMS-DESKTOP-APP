using HSMS.API.DTOs.Backup;

namespace HSMS.API.Services
{
    public interface IBackupService
    {
        Task<CreateBackupResponseDto> CreateBackupAsync();

        Task<List<BackupFileDto>> ListBackupsAsync();

        Task<string> RestoreBackupAsync(string fileName);

        Task<string> SaveUploadedBackupAsync(Stream content, string originalFileName);

        string GetBackupFilePath(string fileName);
    }
}