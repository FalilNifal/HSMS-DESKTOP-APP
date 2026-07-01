using HSMS.API.Data;
using HSMS.API.DTOs.Setup;
using HSMS.API.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HSMS.API.Controllers
{
    [ApiController]
    [Route("api/setup")]
    public class SetupController : ControllerBase
    {
        private readonly AppDbContext _context;

        public SetupController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet("status")]
        [AllowAnonymous]
        public async Task<ActionResult<SetupStatusResponseDto>> GetStatus()
        {
            var appSettings = await GetAppSettingsAsync();

            return Ok(new SetupStatusResponseDto
            {
                IsSetupCompleted = appSettings?.IsSetupCompleted ?? false
            });
        }

        [HttpPost("initialize")]
        [AllowAnonymous]
        public async Task<ActionResult<InitializeSetupResponseDto>> Initialize([FromBody] InitializeSetupRequestDto request)
        {
            var appSettings = await GetAppSettingsAsync();
            if (appSettings?.IsSetupCompleted == true)
            {
                return Conflict(new { message = "System setup has already been completed." });
            }

            var adminExists = await _context.Users.AnyAsync(user => user.Role == "Admin");
            if (adminExists)
            {
                return Conflict(new { message = "An Admin user already exists." });
            }

            var existingUsername = await _context.Users.AnyAsync(user => user.Username == request.AdminUsername);
            if (existingUsername)
            {
                return Conflict(new { message = "Username already exists." });
            }

            var now = DateTime.Now;
            var recoveryKey = GenerateRecoveryKey();

            var adminUser = new User
            {
                FullName = request.AdminFullName,
                Username = request.AdminUsername,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.AdminPassword),
                Role = "Admin",
                IsActive = true,
                CreatedAt = now,
                UpdatedAt = now
            };

            var shopSettings = await _context.ShopSettings.FirstOrDefaultAsync(settings => settings.Id == 1);
            if (shopSettings == null)
            {
                shopSettings = new ShopSettings { Id = 1 };
                _context.ShopSettings.Add(shopSettings);
            }

            shopSettings.ShopName = request.ShopName;
            shopSettings.Address = request.Address;
            shopSettings.PhoneNumber = request.PhoneNumber;
            shopSettings.Currency = request.Currency;
            shopSettings.InvoiceFooterMessage = string.IsNullOrWhiteSpace(request.InvoiceFooterMessage)
                ? "Thank you for your business!"
                : request.InvoiceFooterMessage;
            shopSettings.UpdatedAt = now;

            if (appSettings == null)
            {
                appSettings = new AppSettings { Id = 1 };
                _context.AppSettings.Add(appSettings);
            }

            appSettings.IsSetupCompleted = true;
            appSettings.RecoveryKeyHash = BCrypt.Net.BCrypt.HashPassword(recoveryKey);
            appSettings.RecoveryKeyCreatedAt = now;
            appSettings.UpdatedAt = now;

            _context.Users.Add(adminUser);
            await _context.SaveChangesAsync();

            return Ok(new InitializeSetupResponseDto
            {
                Message = "System setup completed successfully. Save this recovery key safely. It will be shown only once.",
                RecoveryKey = recoveryKey
            });
        }

        private async Task<AppSettings?> GetAppSettingsAsync()
        {
            return await _context.AppSettings.FirstOrDefaultAsync(settings => settings.Id == 1);
        }

        private static string GenerateRecoveryKey()
        {
            const string alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
            var bytes = new byte[16];
            using var rng = System.Security.Cryptography.RandomNumberGenerator.Create();
            rng.GetBytes(bytes);

            var groups = new string[4];
            for (var groupIndex = 0; groupIndex < groups.Length; groupIndex++)
            {
                var buffer = new char[4];
                for (var charIndex = 0; charIndex < buffer.Length; charIndex++)
                {
                    buffer[charIndex] = alphabet[bytes[groupIndex * 4 + charIndex] % alphabet.Length];
                }

                groups[groupIndex] = new string(buffer);
            }

            return $"HSMS-RK-{groups[0]}-{groups[1]}-{groups[2]}-{groups[3]}";
        }
    }
}