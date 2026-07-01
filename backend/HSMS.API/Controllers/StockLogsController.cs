using HSMS.API.Data;
using HSMS.API.DTOs.StockLogs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HSMS.API.Controllers
{
    [ApiController]
    [Route("api/stocklogs")]
    [Authorize(Roles = "Admin,Manager")]
    public class StockLogsController : ControllerBase
    {
        private readonly AppDbContext _context;

        public StockLogsController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<StockLogResponseDto>>> GetAll()
        {
            var logs = await BuildQuery()
                .OrderByDescending(log => log.CreatedAt)
                .ToListAsync();

            return Ok(logs);
        }

        [HttpGet("product/{productId:int}")]
        public async Task<ActionResult<IEnumerable<StockLogResponseDto>>> GetByProduct(int productId)
        {
            var logs = await BuildQuery()
                .Where(log => log.ProductId == productId)
                .OrderByDescending(log => log.CreatedAt)
                .ToListAsync();

            return Ok(logs);
        }

        private IQueryable<StockLogResponseDto> BuildQuery()
        {
            return _context.StockLogs
                .Include(stockLog => stockLog.Product)
                .Include(stockLog => stockLog.ChangedByUser)
                .Select(stockLog => new StockLogResponseDto
                {
                    Id = stockLog.Id,
                    ProductId = stockLog.ProductId,
                    ProductName = stockLog.Product != null ? stockLog.Product.Name : string.Empty,
                    SKU = stockLog.Product != null ? stockLog.Product.SKU : string.Empty,
                    OldQuantity = stockLog.OldQuantity,
                    NewQuantity = stockLog.NewQuantity,
                    ChangeAmount = stockLog.ChangeAmount,
                    Reason = stockLog.Reason,
                    ChangedByUserId = stockLog.ChangedByUserId,
                    ChangedByUserName = stockLog.ChangedByUser != null ? stockLog.ChangedByUser.FullName : string.Empty,
                    CreatedAt = stockLog.CreatedAt
                });
        }
    }
}