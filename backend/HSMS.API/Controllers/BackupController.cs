using HSMS.API.DTOs.Backup;
using HSMS.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HSMS.API.Controllers
{
    [ApiController]
    [Route("api/backup")]
    [Authorize(Roles = "Admin")]
    public class BackupController : ControllerBase
    {
        private readonly IWebHostEnvironment _environment;
        private readonly IConfiguration _configuration;

        public BackupController(IWebHostEnvironment environment, IConfiguration configuration)
        {
            _environment = environment;
            _configuration = configuration;
        }

        [HttpPost("create")]
        public async Task<ActionResult<CreateBackupResponseDto>> Create()
        {
            var backupService = CreateBackupService();
            var response = await backupService.CreateBackupAsync();
            return Ok(response);
        }

        [HttpGet("list")]
        public async Task<ActionResult<List<BackupFileDto>>> List()
        {
            var backupService = CreateBackupService();
            var response = await backupService.ListBackupsAsync();
            return Ok(response);
        }

        [HttpGet("download/{fileName}")]
        public IActionResult Download(string fileName)
        {
            var backupService = CreateBackupService();
            var filePath = backupService.GetBackupFilePath(fileName);
            if (!System.IO.File.Exists(filePath))
            {
                return NotFound();
            }

            return PhysicalFile(filePath, "application/zip", fileName);
        }

        [HttpPost("restore")]
        public async Task<ActionResult<RestoreBackupResponseDto>> Restore([FromBody] RestoreBackupRequestDto request)
        {
            try
            {
                var backupService = CreateBackupService();
                var emergencyBackupFileName = await backupService.RestoreBackupAsync(request.FileName);
                return Ok(new RestoreBackupResponseDto
                {
                    Message = "Backup restored successfully.",
                    EmergencyBackupFileName = emergencyBackupFileName
                });
            }
            catch (FileNotFoundException)
            {
                return NotFound(new { message = "Backup file not found." });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPost("restore-upload")]
        public async Task<ActionResult<RestoreBackupResponseDto>> RestoreUpload(IFormFile file)
        {
            if (file == null || file.Length == 0)
            {
                return BadRequest(new { message = "No file was uploaded." });
            }

            if (!file.FileName.EndsWith(".zip", StringComparison.OrdinalIgnoreCase))
            {
                return BadRequest(new { message = "Please choose a .zip backup file." });
            }

            try
            {
                var backupService = CreateBackupService();
                string savedFileName;
                await using (var stream = file.OpenReadStream())
                {
                    savedFileName = await backupService.SaveUploadedBackupAsync(stream, file.FileName);
                }

                var emergencyBackupFileName = await backupService.RestoreBackupAsync(savedFileName);
                return Ok(new RestoreBackupResponseDto
                {
                    Message = "Backup restored successfully.",
                    EmergencyBackupFileName = emergencyBackupFileName
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = $"Could not restore this file: {ex.Message}" });
            }
        }

        private BackupService CreateBackupService()
        {
            return new BackupService(_environment, _configuration);
        }
    }
}