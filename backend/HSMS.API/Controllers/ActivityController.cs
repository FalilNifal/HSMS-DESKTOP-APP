using HSMS.API.Data;
using HSMS.API.DTOs.Account;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HSMS.API.Controllers
{
    [ApiController]
    [Route("api/activity")]
    [Authorize(Roles = "Admin")]
    public class ActivityController : ControllerBase
    {
        private readonly AppDbContext _context;

        public ActivityController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<UserActivityResponseDto>>> GetAll(
            [FromQuery] DateTime? fromDate,
            [FromQuery] DateTime? toDate,
            [FromQuery] int? userId)
        {
            var query = _context.UserActivityLogs.AsQueryable();

            if (fromDate.HasValue)
            {
                query = query.Where(log => log.CreatedAt >= fromDate.Value.Date);
            }

            if (toDate.HasValue)
            {
                query = query.Where(log => log.CreatedAt < toDate.Value.Date.AddDays(1));
            }

            if (userId.HasValue)
            {
                query = query.Where(log => log.UserId == userId.Value);
            }

            var items = await query
                .OrderByDescending(log => log.CreatedAt)
                .Take(500)
                .Select(log => new UserActivityResponseDto
                {
                    Id = log.Id,
                    UserId = log.UserId,
                    Username = log.Username,
                    FullName = log.FullName,
                    Role = log.Role,
                    Event = log.Event,
                    CreatedAt = log.CreatedAt
                })
                .ToListAsync();

            return Ok(items);
        }
    }
}
