using HSMS.API.Data;
using HSMS.API.DTOs.Reports;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HSMS.API.Controllers
{
    [ApiController]
    [Route("api/reports")]
    [Authorize]
    public class ReportsController : ControllerBase
    {
        private readonly AppDbContext _context;

        public ReportsController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet("daily-sales")]
        public async Task<ActionResult<DailySalesReportDto>> GetDailySales([FromQuery] DateTime date)
        {
            var sales = await GetFilteredSales(date.Date, date.Date.AddDays(1));
            return Ok(new DailySalesReportDto
            {
                Date = date.Date,
                TotalSales = sales.Sum(sale => sale.TotalAmount),
                TotalOrders = sales.Count
            });
        }

        [HttpGet("monthly-sales")]
        public async Task<ActionResult<MonthlySalesReportDto>> GetMonthlySales([FromQuery] int year, [FromQuery] int month)
        {
            var start = new DateTime(year, month, 1);
            var end = start.AddMonths(1);
            var sales = await GetFilteredSales(start, end);

            return Ok(new MonthlySalesReportDto
            {
                Year = year,
                Month = month,
                TotalSales = sales.Sum(sale => sale.TotalAmount),
                TotalOrders = sales.Count
            });
        }

        [HttpGet("date-range-sales")]
        public async Task<ActionResult<ProfitReportDto>> GetDateRangeSales([FromQuery] DateTime fromDate, [FromQuery] DateTime toDate)
        {
            var sales = await GetFilteredSales(fromDate.Date, toDate.Date.AddDays(1));
            return Ok(BuildProfitReport(fromDate.Date, toDate.Date, sales));
        }

        [HttpGet("daily-profit")]
        [Authorize(Roles = "Admin,Manager")]
        public async Task<ActionResult<ProfitReportDto>> GetDailyProfit([FromQuery] DateTime date)
        {
            var sales = await GetFilteredSales(date.Date, date.Date.AddDays(1));
            return Ok(BuildProfitReport(date.Date, date.Date, sales));
        }

        [HttpGet("monthly-profit")]
        [Authorize(Roles = "Admin,Manager")]
        public async Task<ActionResult<ProfitReportDto>> GetMonthlyProfit([FromQuery] int year, [FromQuery] int month)
        {
            var start = new DateTime(year, month, 1);
            var end = start.AddMonths(1);
            var sales = await GetFilteredSales(start, end);
            return Ok(BuildProfitReport(start, end.AddDays(-1), sales));
        }

        [HttpGet("product-sales")]
        [Authorize(Roles = "Admin,Manager")]
        public async Task<ActionResult<ProductSalesReportDto>> GetProductSales([FromQuery] DateTime fromDate, [FromQuery] DateTime toDate)
        {
            var sales = await _context.Sales
                .Include(sale => sale.SaleItems)
                .ThenInclude(item => item.Product)
                .Where(sale => sale.CreatedAt >= fromDate.Date && sale.CreatedAt < toDate.Date.AddDays(1))
                .ToListAsync();

            var items = sales
                .SelectMany(sale => sale.SaleItems)
                .GroupBy(item => new { item.ProductId, item.ProductNameAtSale, item.SKUAtSale })
                .Select(group => new ProductSalesReportItemDto
                {
                    ProductId = group.Key.ProductId,
                    ProductName = group.Key.ProductNameAtSale,
                    SKU = group.Key.SKUAtSale,
                    QuantitySold = group.Sum(item => item.Quantity),
                    TotalSales = group.Sum(item => item.LineTotal),
                    TotalProfit = group.Sum(item => item.LineProfit)
                })
                .OrderByDescending(item => item.TotalSales)
                .ToList();

            return Ok(new ProductSalesReportDto
            {
                FromDate = fromDate.Date,
                ToDate = toDate.Date,
                Items = items
            });
        }

        [HttpGet("cashier-sales")]
        [Authorize(Roles = "Admin,Manager")]
        public async Task<ActionResult<CashierSalesReportDto>> GetCashierSales([FromQuery] DateTime fromDate, [FromQuery] DateTime toDate)
        {
            var sales = await _context.Sales
                .Include(sale => sale.SoldByUser)
                .Where(sale => sale.CreatedAt >= fromDate.Date && sale.CreatedAt < toDate.Date.AddDays(1))
                .ToListAsync();

            var items = sales
                .GroupBy(sale => new { sale.SoldByUserId, Name = sale.SoldByUser != null ? sale.SoldByUser.FullName : string.Empty })
                .Select(group => new CashierSalesReportItemDto
                {
                    CashierUserId = group.Key.SoldByUserId,
                    CashierName = group.Key.Name,
                    TotalSales = group.Sum(sale => sale.TotalAmount),
                    TotalProfit = group.Sum(sale => sale.TotalProfit),
                    OrderCount = group.Count()
                })
                .OrderByDescending(item => item.TotalSales)
                .ToList();

            return Ok(new CashierSalesReportDto
            {
                FromDate = fromDate.Date,
                ToDate = toDate.Date,
                Items = items
            });
        }

        [HttpGet("low-stock")]
        [Authorize(Roles = "Admin,Manager")]
        public async Task<ActionResult<LowStockReportDto>> GetLowStock()
        {
            var items = await _context.Products
                .Where(product => product.IsActive && product.StockQuantity <= product.LowStockLevel)
                .OrderBy(product => product.Name)
                .Select(product => new LowStockReportItemDto
                {
                    ProductId = product.Id,
                    Name = product.Name,
                    SKU = product.SKU,
                    StockQuantity = product.StockQuantity,
                    LowStockLevel = product.LowStockLevel
                })
                .ToListAsync();

            return Ok(new LowStockReportDto { Items = items });
        }

        [HttpGet("stock-movement")]
        [Authorize(Roles = "Admin,Manager")]
        public async Task<ActionResult<StockMovementReportDto>> GetStockMovement([FromQuery] int productId)
        {
            var product = await _context.Products.FirstOrDefaultAsync(item => item.Id == productId);
            if (product == null)
            {
                return NotFound();
            }

            var items = await _context.StockLogs
                .Include(stockLog => stockLog.ChangedByUser)
                .Where(stockLog => stockLog.ProductId == productId)
                .OrderByDescending(stockLog => stockLog.CreatedAt)
                .Select(stockLog => new StockMovementReportItemDto
                {
                    Id = stockLog.Id,
                    OldQuantity = stockLog.OldQuantity,
                    NewQuantity = stockLog.NewQuantity,
                    ChangeAmount = stockLog.ChangeAmount,
                    Reason = stockLog.Reason,
                    ChangedByUserName = stockLog.ChangedByUser != null ? stockLog.ChangedByUser.FullName : string.Empty,
                    CreatedAt = stockLog.CreatedAt
                })
                .ToListAsync();

            return Ok(new StockMovementReportDto
            {
                ProductId = product.Id,
                ProductName = product.Name,
                SKU = product.SKU,
                Items = items
            });
        }

        private async Task<List<Models.Sale>> GetFilteredSales(DateTime fromDate, DateTime toDate)
        {
            var query = _context.Sales
                .Include(sale => sale.SoldByUser)
                .Include(sale => sale.SaleItems)
                .AsQueryable();

            if (User.IsInRole("Cashier"))
            {
                var currentUserId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
                if (int.TryParse(currentUserId, out var userId))
                {
                    query = query.Where(sale => sale.SoldByUserId == userId);
                }
            }

            return await query
                .Where(sale => sale.CreatedAt >= fromDate && sale.CreatedAt < toDate)
                .ToListAsync();
        }

        private static ProfitReportDto BuildProfitReport(DateTime fromDate, DateTime toDate, List<Models.Sale> sales)
        {
            return new ProfitReportDto
            {
                PeriodStart = fromDate,
                PeriodEnd = toDate,
                TotalSales = sales.Sum(sale => sale.TotalAmount),
                TotalProfit = sales.Sum(sale => sale.TotalProfit),
                TotalOrders = sales.Count
            };
        }
    }
}