using HSMS.API.Data;
using HSMS.API.DTOs.Users;
using HSMS.API.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace HSMS.API.Controllers
{
    [ApiController]
    [Route("api/users")]
    [Authorize(Roles = "Admin")]
    public class UsersController : ControllerBase
    {
        private static readonly string[] AllowedRoles = { "Admin", "Manager", "Cashier" };

        private readonly AppDbContext _context;

        public UsersController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<UserResponseDto>>> GetAll()
        {
            var users = await _context.Users
                .OrderBy(user => user.FullName)
                .ToListAsync();

            return Ok(users.Select(ToResponse));
        }

        [HttpGet("{id:int}")]
        public async Task<ActionResult<UserResponseDto>> GetById(int id)
        {
            var user = await _context.Users.FirstOrDefaultAsync(item => item.Id == id);
            if (user == null)
            {
                return NotFound();
            }

            return Ok(ToResponse(user));
        }

        [HttpPost]
        public async Task<ActionResult<UserResponseDto>> Create([FromBody] CreateUserRequestDto request)
        {
            if (!IsValidRole(request.Role))
            {
                return BadRequest(new { message = "Role must be Admin, Manager, or Cashier." });
            }

            var username = request.Username.Trim();
            var usernameExists = await _context.Users.AnyAsync(user => user.Username == username);
            if (usernameExists)
            {
                return Conflict(new { message = "Username already exists." });
            }

            var now = DateTime.Now;
            var user = new User
            {
                FullName = request.FullName.Trim(),
                Username = username,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
                Role = request.Role,
                IsActive = true,
                CreatedAt = now,
                UpdatedAt = now
            };

            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetById), new { id = user.Id }, ToResponse(user));
        }

        [HttpPut("{id:int}")]
        public async Task<IActionResult> Update(int id, [FromBody] UpdateUserRequestDto request)
        {
            var user = await _context.Users.FirstOrDefaultAsync(item => item.Id == id);
            if (user == null)
            {
                return NotFound();
            }

            if (!IsValidRole(request.Role))
            {
                return BadRequest(new { message = "Role must be Admin, Manager, or Cashier." });
            }

            var currentUserId = GetCurrentUserId();
            var editingSelf = currentUserId == user.Id;

            if (editingSelf && !request.IsActive)
            {
                return BadRequest(new { message = "You cannot deactivate your own account." });
            }

            if (editingSelf && request.Role != "Admin")
            {
                return BadRequest(new { message = "You cannot change your own role away from Admin." });
            }

            var wasActiveAdmin = user.Role == "Admin" && user.IsActive;
            var willBeActiveAdmin = request.Role == "Admin" && request.IsActive;
            if (wasActiveAdmin && !willBeActiveAdmin && !await HasOtherActiveAdmin(user.Id))
            {
                return BadRequest(new { message = "There must be at least one active administrator." });
            }

            user.FullName = request.FullName.Trim();
            user.Role = request.Role;
            user.IsActive = request.IsActive;
            user.UpdatedAt = DateTime.Now;

            await _context.SaveChangesAsync();
            return NoContent();
        }

        [HttpPost("{id:int}/reset-password")]
        public async Task<IActionResult> ResetPassword(int id, [FromBody] ResetPasswordRequestDto request)
        {
            var user = await _context.Users.FirstOrDefaultAsync(item => item.Id == id);
            if (user == null)
            {
                return NotFound();
            }

            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.NewPassword);
            user.UpdatedAt = DateTime.Now;

            await _context.SaveChangesAsync();
            return Ok(new { message = "Password reset successfully." });
        }

        [HttpDelete("{id:int}")]
        public async Task<IActionResult> Deactivate(int id)
        {
            var user = await _context.Users.FirstOrDefaultAsync(item => item.Id == id);
            if (user == null)
            {
                return NotFound();
            }

            if (GetCurrentUserId() == user.Id)
            {
                return BadRequest(new { message = "You cannot deactivate your own account." });
            }

            if (user.Role == "Admin" && user.IsActive && !await HasOtherActiveAdmin(user.Id))
            {
                return BadRequest(new { message = "There must be at least one active administrator." });
            }

            user.IsActive = false;
            user.UpdatedAt = DateTime.Now;
            await _context.SaveChangesAsync();

            return NoContent();
        }

        private Task<bool> HasOtherActiveAdmin(int excludingUserId)
        {
            return _context.Users.AnyAsync(user =>
                user.Id != excludingUserId && user.Role == "Admin" && user.IsActive);
        }

        private static bool IsValidRole(string role) => AllowedRoles.Contains(role);

        private int? GetCurrentUserId()
        {
            var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
            return int.TryParse(userIdClaim, out var userId) ? userId : null;
        }

        private static UserResponseDto ToResponse(User user) => new()
        {
            Id = user.Id,
            FullName = user.FullName,
            Username = user.Username,
            Role = user.Role,
            IsActive = user.IsActive,
            CreatedAt = user.CreatedAt,
            UpdatedAt = user.UpdatedAt
        };
    }
}
