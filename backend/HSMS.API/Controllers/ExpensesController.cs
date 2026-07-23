using HSMS.API.Data;
using HSMS.API.DTOs.Expenses;
using HSMS.API.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace HSMS.API.Controllers
{
    [ApiController]
    [Route("api/expenses")]
    [Authorize(Roles = "Admin,Manager")]
    public class ExpensesController : ControllerBase
    {
        private readonly AppDbContext _context;

        public ExpensesController(AppDbContext context)
        {
            _context = context;
        }

        [HttpPost]
        public async Task<ActionResult<ExpenseResponseDto>> Create([FromBody] CreateExpenseRequestDto request)
        {
            var currentUserId = GetCurrentUserId();
            if (currentUserId == null)
            {
                return Unauthorized();
            }

            if (string.IsNullOrWhiteSpace(request.Category))
            {
                return BadRequest(new { message = "Category is required." });
            }

            if (request.Amount <= 0)
            {
                return BadRequest(new { message = "Amount must be greater than 0." });
            }

            var expense = new Expense
            {
                Category = request.Category.Trim(),
                Description = request.Description?.Trim() ?? string.Empty,
                Amount = request.Amount,
                PaymentMethod = string.IsNullOrWhiteSpace(request.PaymentMethod) ? "Cash" : request.PaymentMethod.Trim(),
                ExpenseDate = (request.ExpenseDate ?? DateTime.Now).Date,
                CreatedByUserId = currentUserId.Value,
                CreatedAt = DateTime.Now
            };

            _context.Expenses.Add(expense);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetAll), new { }, await BuildResponseAsync(expense.Id));
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<ExpenseResponseDto>>> GetAll(
            [FromQuery] DateTime? fromDate,
            [FromQuery] DateTime? toDate,
            [FromQuery] string? category)
        {
            var query = _context.Expenses.Include(expense => expense.CreatedByUser).AsQueryable();

            if (fromDate.HasValue)
            {
                query = query.Where(expense => expense.ExpenseDate >= fromDate.Value.Date);
            }

            if (toDate.HasValue)
            {
                query = query.Where(expense => expense.ExpenseDate < toDate.Value.Date.AddDays(1));
            }

            if (!string.IsNullOrWhiteSpace(category))
            {
                query = query.Where(expense => expense.Category == category);
            }

            var expenses = await query
                .OrderByDescending(expense => expense.ExpenseDate)
                .ThenByDescending(expense => expense.Id)
                .ToListAsync();

            return Ok(expenses.Select(ToResponse).ToList());
        }

        [HttpGet("summary")]
        public async Task<ActionResult<ExpenseSummaryDto>> Summary(
            [FromQuery] DateTime? fromDate,
            [FromQuery] DateTime? toDate)
        {
            var query = _context.Expenses.AsQueryable();

            if (fromDate.HasValue)
            {
                query = query.Where(expense => expense.ExpenseDate >= fromDate.Value.Date);
            }

            if (toDate.HasValue)
            {
                query = query.Where(expense => expense.ExpenseDate < toDate.Value.Date.AddDays(1));
            }

            var grouped = await query
                .GroupBy(expense => expense.Category)
                .Select(group => new ExpenseCategoryTotalDto
                {
                    Category = group.Key,
                    Total = group.Sum(expense => expense.Amount)
                })
                .ToListAsync();

            return Ok(new ExpenseSummaryDto
            {
                Total = grouped.Sum(item => item.Total),
                ByCategory = grouped.OrderByDescending(item => item.Total).ToList()
            });
        }

        [HttpPut("{id:int}")]
        public async Task<IActionResult> Update(int id, [FromBody] CreateExpenseRequestDto request)
        {
            var expense = await _context.Expenses.FirstOrDefaultAsync(item => item.Id == id);
            if (expense == null)
            {
                return NotFound();
            }

            if (string.IsNullOrWhiteSpace(request.Category))
            {
                return BadRequest(new { message = "Category is required." });
            }

            if (request.Amount <= 0)
            {
                return BadRequest(new { message = "Amount must be greater than 0." });
            }

            expense.Category = request.Category.Trim();
            expense.Description = request.Description?.Trim() ?? string.Empty;
            expense.Amount = request.Amount;
            expense.PaymentMethod = string.IsNullOrWhiteSpace(request.PaymentMethod) ? "Cash" : request.PaymentMethod.Trim();
            expense.ExpenseDate = (request.ExpenseDate ?? expense.ExpenseDate).Date;

            await _context.SaveChangesAsync();
            return NoContent();
        }

        [HttpDelete("{id:int}")]
        public async Task<IActionResult> Delete(int id)
        {
            var expense = await _context.Expenses.FirstOrDefaultAsync(item => item.Id == id);
            if (expense == null)
            {
                return NotFound();
            }

            _context.Expenses.Remove(expense);
            await _context.SaveChangesAsync();
            return NoContent();
        }

        private async Task<ExpenseResponseDto> BuildResponseAsync(int id)
        {
            var expense = await _context.Expenses
                .Include(item => item.CreatedByUser)
                .FirstAsync(item => item.Id == id);
            return ToResponse(expense);
        }

        private static ExpenseResponseDto ToResponse(Expense expense)
        {
            return new ExpenseResponseDto
            {
                Id = expense.Id,
                Category = expense.Category,
                Description = expense.Description,
                Amount = expense.Amount,
                PaymentMethod = expense.PaymentMethod,
                ExpenseDate = expense.ExpenseDate,
                CreatedByUserName = expense.CreatedByUser != null ? expense.CreatedByUser.FullName : string.Empty,
                CreatedAt = expense.CreatedAt
            };
        }

        private int? GetCurrentUserId()
        {
            var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
            return int.TryParse(userIdClaim, out var userId) ? userId : null;
        }
    }
}
