using HSMS.API.Data;
using HSMS.API.DTOs.Auth;
using HSMS.API.Models;
using HSMS.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace HSMS.API.Controllers
{
    [ApiController]
    [Route("api/auth")]
    public class AuthController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly ITokenService _tokenService;

        public AuthController(AppDbContext context, ITokenService tokenService)
        {
            _context = context;
            _tokenService = tokenService;
        }

        [HttpPost("login")]
        [AllowAnonymous]
        [EnableRateLimiting("login")]
        public async Task<ActionResult<LoginResponseDto>> Login([FromBody] LoginRequestDto request)
        {
            var user = await _context.Users.FirstOrDefaultAsync(currentUser => currentUser.Username == request.Username);
            if (user == null || !user.IsActive || !BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
            {
                return Unauthorized(new { message = "Invalid username or password." });
            }

            var token = _tokenService.CreateToken(user);

            _context.UserActivityLogs.Add(new UserActivityLog
            {
                UserId = user.Id,
                Username = user.Username,
                FullName = user.FullName,
                Role = user.Role,
                Event = "Login",
                CreatedAt = DateTime.Now
            });
            await _context.SaveChangesAsync();

            return Ok(new LoginResponseDto
            {
                Token = token,
                UserId = user.Id,
                FullName = user.FullName,
                Username = user.Username,
                Role = user.Role
            });
        }

        [HttpPost("logout")]
        [Authorize]
        public async Task<IActionResult> Logout()
        {
            var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (int.TryParse(userIdClaim, out var userId))
            {
                var user = await _context.Users.FirstOrDefaultAsync(current => current.Id == userId);
                if (user != null)
                {
                    _context.UserActivityLogs.Add(new UserActivityLog
                    {
                        UserId = user.Id,
                        Username = user.Username,
                        FullName = user.FullName,
                        Role = user.Role,
                        Event = "Logout",
                        CreatedAt = DateTime.Now
                    });
                    await _context.SaveChangesAsync();
                }
            }

            return Ok(new { message = "Logged out." });
        }

    }
}