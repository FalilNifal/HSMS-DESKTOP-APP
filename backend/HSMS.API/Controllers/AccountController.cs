using HSMS.API.Data;
using HSMS.API.DTOs.Account;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace HSMS.API.Controllers
{
    [ApiController]
    [Route("api/account")]
    public class AccountController : ControllerBase
    {
        private readonly AppDbContext _context;

        public AccountController(AppDbContext context)
        {
            _context = context;
        }

        [HttpPost("change-password")]
        [Authorize]
        public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequestDto request)
        {
            var currentUserId = GetCurrentUserId();
            if (currentUserId == null)
            {
                return Unauthorized();
            }

            var user = await _context.Users.FirstOrDefaultAsync(current => current.Id == currentUserId.Value && current.IsActive);
            if (user == null)
            {
                return Unauthorized();
            }

            if (!BCrypt.Net.BCrypt.Verify(request.CurrentPassword, user.PasswordHash))
            {
                return BadRequest(new { message = "Current password is incorrect." });
            }

            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.NewPassword);
            user.UpdatedAt = DateTime.Now;

            await _context.SaveChangesAsync();

            return Ok(new { message = "Password changed successfully." });
        }

        [HttpPost("recover-admin-password")]
        [AllowAnonymous]
        public async Task<IActionResult> RecoverAdminPassword([FromBody] RecoverAdminPasswordRequestDto request)
        {
            var admin = await _context.Users.FirstOrDefaultAsync(user => user.Username == request.AdminUsername && user.Role == "Admin");
            if (admin == null || !admin.IsActive)
            {
                return NotFound(new { message = "Active Admin user not found." });
            }

            var appSettings = await _context.AppSettings.FirstOrDefaultAsync(settings => settings.Id == 1);
            if (appSettings?.IsSetupCompleted != true || string.IsNullOrWhiteSpace(appSettings.RecoveryKeyHash))
            {
                return BadRequest(new { message = "Recovery key is not configured." });
            }

            if (!BCrypt.Net.BCrypt.Verify(request.RecoveryKey, appSettings.RecoveryKeyHash))
            {
                return BadRequest(new { message = "Invalid recovery key." });
            }

            admin.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.NewPassword);
            admin.UpdatedAt = DateTime.Now;

            await _context.SaveChangesAsync();

            return Ok(new { message = "Admin password reset successfully." });
        }

        private int? GetCurrentUserId()
        {
            var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
            return int.TryParse(userIdClaim, out var userId) ? userId : null;
        }
    }
}