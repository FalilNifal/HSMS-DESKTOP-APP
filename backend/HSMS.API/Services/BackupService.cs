using HSMS.API.DTOs.Backup;
using Microsoft.Data.Sqlite;
using System.IO.Compression;

namespace HSMS.API.Services
{
    public class BackupService : IBackupService
    {
        private readonly IWebHostEnvironment _environment;
        private readonly IConfiguration _configuration;

        public BackupService(IWebHostEnvironment environment, IConfiguration configuration)
        {
            _environment = environment;
            _configuration = configuration;
        }

        public async Task<CreateBackupResponseDto> CreateBackupAsync()
        {
            var backupFolder = GetBackupFolderPath();
            Directory.CreateDirectory(backupFolder);

            var now = DateTime.Now;
            var fileName = $"HSMS_Backup_{now:yyyy-MM-dd_HHmm}.zip";
            var backupFilePath = Path.Combine(backupFolder, fileName);
            var databasePath = GetDatabasePath();

            var tempDatabasePath = Path.Combine(backupFolder, $"{Guid.NewGuid():N}.db");
            File.Copy(databasePath, tempDatabasePath, true);

            try
            {
                using var archive = ZipFile.Open(backupFilePath, ZipArchiveMode.Create);
                archive.CreateEntryFromFile(tempDatabasePath, Path.GetFileName(databasePath));
            }
            finally
            {
                if (File.Exists(tempDatabasePath))
                {
                    File.Delete(tempDatabasePath);
                }
            }

            var backupInfo = new FileInfo(backupFilePath);
            return await Task.FromResult(new CreateBackupResponseDto
            {
                Message = "Backup created successfully.",
                FileName = fileName,
                CreatedAt = now,
                SizeBytes = backupInfo.Length
            });
        }

        public Task<List<BackupFileDto>> ListBackupsAsync()
        {
            var backupFolder = GetBackupFolderPath();
            Directory.CreateDirectory(backupFolder);

            var files = Directory.GetFiles(backupFolder, "HSMS_Backup_*.zip")
                .Select(filePath => new FileInfo(filePath))
                .OrderByDescending(file => file.CreationTime)
                .Select(file => new BackupFileDto
                {
                    FileName = file.Name,
                    CreatedAt = file.CreationTime,
                    SizeBytes = file.Length
                })
                .ToList();

            return Task.FromResult(files);
        }

        public async Task<string> RestoreBackupAsync(string fileName)
        {
            var backupFilePath = GetBackupFilePath(fileName);
            if (!File.Exists(backupFilePath))
            {
                throw new FileNotFoundException("Backup file not found.", backupFilePath);
            }

            var backupFolder = GetBackupFolderPath();
            Directory.CreateDirectory(backupFolder);

            var databasePath = GetDatabasePath();
            var emergencyFileName = $"HSMS_Emergency_{DateTime.Now:yyyy-MM-dd_HHmmss}.zip";
            var emergencyFilePath = Path.Combine(backupFolder, emergencyFileName);

            SqliteConnection.ClearAllPools();

            if (File.Exists(databasePath))
            {
                var tempDatabasePath = Path.Combine(backupFolder, $"{Guid.NewGuid():N}.db");
                File.Copy(databasePath, tempDatabasePath, true);
                try
                {
                    using var emergencyArchive = ZipFile.Open(emergencyFilePath, ZipArchiveMode.Create);
                    emergencyArchive.CreateEntryFromFile(tempDatabasePath, Path.GetFileName(databasePath));
                }
                finally
                {
                    if (File.Exists(tempDatabasePath))
                    {
                        File.Delete(tempDatabasePath);
                    }
                }
            }

            var extractFolder = Path.Combine(backupFolder, $"restore_{Guid.NewGuid():N}");
            Directory.CreateDirectory(extractFolder);

            try
            {
                ZipFile.ExtractToDirectory(backupFilePath, extractFolder, true);

                var extractedDatabasePath = Path.Combine(extractFolder, Path.GetFileName(databasePath));
                if (!File.Exists(extractedDatabasePath))
                {
                    throw new InvalidOperationException("Backup archive does not contain the database file.");
                }

                File.Copy(extractedDatabasePath, databasePath, true);
            }
            finally
            {
                if (Directory.Exists(extractFolder))
                {
                    Directory.Delete(extractFolder, true);
                }
            }

            SqliteConnection.ClearAllPools();

            return await Task.FromResult(emergencyFileName);
        }

        public async Task<string> SaveUploadedBackupAsync(Stream content, string originalFileName)
        {
            var backupFolder = GetBackupFolderPath();
            Directory.CreateDirectory(backupFolder);

            var fileName = $"Imported_{DateTime.Now:yyyy-MM-dd_HHmmss}.zip";
            var filePath = Path.Combine(backupFolder, fileName);

            await using (var fileStream = File.Create(filePath))
            {
                await content.CopyToAsync(fileStream);
            }

            return fileName;
        }

        public string GetBackupFilePath(string fileName)
        {
            return Path.Combine(GetBackupFolderPath(), fileName);
        }

        private string GetBackupFolderPath()
        {
            // Prefer the writable data directory (set when packaged) so backups
            // don't land inside a read-only install folder.
            var dataDirectory = _configuration["Hsms:DataDirectory"];
            var baseDirectory = string.IsNullOrWhiteSpace(dataDirectory)
                ? _environment.ContentRootPath
                : dataDirectory;
            return Path.Combine(baseDirectory, "backups");
        }

        private string GetDatabasePath()
        {
            var connectionString = _configuration.GetConnectionString("DefaultConnection") ?? "Data Source=hsms_desktop.db";
            var dataSource = connectionString.Replace("Data Source=", string.Empty, StringComparison.OrdinalIgnoreCase).Trim();

            if (Path.IsPathRooted(dataSource))
            {
                return dataSource;
            }

            return Path.Combine(_environment.ContentRootPath, dataSource);
        }
    }
}