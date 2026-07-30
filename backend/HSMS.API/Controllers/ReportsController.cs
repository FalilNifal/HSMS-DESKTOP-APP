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

        [HttpGet("z-report")]
        [Authorize(Roles = "Admin,Manager")]
        public async Task<ActionResult<ZReportDto>> GetZReport([FromQuery] DateTime date)
        {
            var start = date.Date;
            var end = start.AddDays(1);

            var sales = await GetFilteredSales(start, end);
            var salesByMethod = sales
                .GroupBy(sale => string.IsNullOrWhiteSpace(sale.PaymentMethod) ? "Other" : sale.PaymentMethod)
                .Select(group => new PaymentMethodTotalDto
                {
                    Method = group.Key,
                    Count = group.Count(),
                    Total = group.Sum(sale => sale.TotalAmount)
                })
                .OrderByDescending(item => item.Total)
                .ToList();

            bool IsCash(string method) => string.Equals(method, "Cash", StringComparison.OrdinalIgnoreCase);

            var cashSales = sales.Where(sale => IsCash(sale.PaymentMethod)).Sum(sale => sale.TotalAmount);

            var refunds = await _context.Returns
                .Where(item => item.CreatedAt >= start && item.CreatedAt < end)
                .ToListAsync();

            var expenses = await _context.Expenses
                .Where(item => item.ExpenseDate >= start && item.ExpenseDate < end)
                .ToListAsync();

            var customerPayments = await _context.CustomerPayments
                .Where(item => item.CreatedAt >= start && item.CreatedAt < end)
                .ToListAsync();

            var supplierPayments = await _context.SupplierPayments
                .Where(item => item.PaymentDate >= start && item.PaymentDate < end)
                .ToListAsync();

            var refundsTotal = refunds.Sum(item => item.TotalRefund);
            var expensesCash = expenses.Where(item => IsCash(item.PaymentMethod)).Sum(item => item.Amount);
            var customerPaymentsCash = customerPayments.Where(item => IsCash(item.Method)).Sum(item => item.Amount);
            var supplierPaymentsCash = supplierPayments.Where(item => IsCash(item.PaymentMethod)).Sum(item => item.Amount);

            return Ok(new ZReportDto
            {
                Date = start,
                SalesByMethod = salesByMethod,
                SalesCount = sales.Count,
                GrossSales = sales.Sum(sale => sale.TotalAmount),
                TaxCollected = sales.Sum(sale => sale.TaxAmount),
                CashSales = cashSales,
                RefundsTotal = refundsTotal,
                RefundsCount = refunds.Count,
                ExpensesTotal = expenses.Sum(item => item.Amount),
                ExpensesCash = expensesCash,
                CustomerPaymentsTotal = customerPayments.Sum(item => item.Amount),
                CustomerPaymentsCash = customerPaymentsCash,
                SupplierPaymentsTotal = supplierPayments.Sum(item => item.Amount),
                SupplierPaymentsCash = supplierPaymentsCash,
                ExpectedCashInDrawer = cashSales + customerPaymentsCash - refundsTotal - expensesCash - supplierPaymentsCash
            });
        }

        [HttpGet("date-range-sales")]
        public async Task<ActionResult<ProfitReportDto>> GetDateRangeSales([FromQuery] DateTime fromDate, [FromQuery] DateTime toDate)
        {
            var sales = await GetFilteredSales(fromDate.Date, toDate.Date.AddDays(1));
            var (refunds, refundProfit) = await GetRefundsInPeriodAsync(fromDate.Date, toDate.Date.AddDays(1));
            return Ok(BuildProfitReport(fromDate.Date, toDate.Date, sales, refunds, refundProfit));
        }

        [HttpGet("daily-profit")]
        [Authorize(Roles = "Admin,Manager")]
        public async Task<ActionResult<ProfitReportDto>> GetDailyProfit([FromQuery] DateTime date)
        {
            var sales = await GetFilteredSales(date.Date, date.Date.AddDays(1));
            var (refunds, refundProfit) = await GetRefundsInPeriodAsync(date.Date, date.Date.AddDays(1));
            return Ok(BuildProfitReport(date.Date, date.Date, sales, refunds, refundProfit));
        }

        [HttpGet("product-sales")]
        [Authorize(Roles = "Admin,Manager")]
        public async Task<ActionResult<ProductSalesReportDto>> GetProductSales([FromQuery] DateTime fromDate, [FromQuery] DateTime toDate, [FromQuery] int? categoryId)
        {
            var sales = await _context.Sales
                .Include(sale => sale.SaleItems)
                .ThenInclude(item => item.Product)
                .Where(sale => sale.CreatedAt >= fromDate.Date && sale.CreatedAt < toDate.Date.AddDays(1))
                .ToListAsync();

            var items = sales
                .SelectMany(sale => sale.SaleItems)
                .Where(item => categoryId == null || (item.Product != null && item.Product.CategoryId == categoryId))
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

        [HttpGet("sales-trend")]
        [Authorize(Roles = "Admin,Manager")]
        public async Task<ActionResult<SalesTrendReportDto>> GetSalesTrend([FromQuery] DateTime fromDate, [FromQuery] DateTime toDate)
        {
            var sales = await _context.Sales
                .Where(sale => sale.CreatedAt >= fromDate.Date && sale.CreatedAt < toDate.Date.AddDays(1))
                .ToListAsync();

            var items = sales
                .GroupBy(sale => sale.CreatedAt.Date)
                .Select(group => new SalesTrendItemDto
                {
                    Date = group.Key,
                    TotalSales = group.Sum(sale => sale.TotalAmount),
                    TotalProfit = group.Sum(sale => sale.TotalProfit),
                    OrderCount = group.Count()
                })
                .OrderBy(item => item.Date)
                .ToList();

            return Ok(new SalesTrendReportDto
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

        [HttpGet("inventory-value")]
        [Authorize(Roles = "Admin,Manager")]
        public async Task<ActionResult<InventoryValueReportDto>> GetInventoryValue()
        {
            var products = await _context.Products
                .Where(product => product.IsActive)
                .Select(product => new
                {
                    product.StockQuantity,
                    product.PurchasePrice,
                    product.MinimumSellingPrice
                })
                .ToListAsync();

            return Ok(new InventoryValueReportDto
            {
                ProductCount = products.Count,
                TotalUnits = products.Sum(product => product.StockQuantity),
                TotalCostValue = products.Sum(product => product.StockQuantity * product.PurchasePrice),
                TotalRetailValue = products.Sum(product => product.StockQuantity * product.MinimumSellingPrice)
            });
        }

        [HttpGet("reorder")]
        [Authorize(Roles = "Admin,Manager")]
        public async Task<ActionResult<ReorderReportDto>> GetReorder()
        {
            var products = await _context.Products
                .Include(product => product.Supplier)
                .Where(product => product.IsActive && product.StockQuantity <= product.LowStockLevel)
                .ToListAsync();

            var items = products
                .OrderBy(product => product.Supplier != null ? product.Supplier.Name : "~")
                .ThenBy(product => product.Name)
                .Select(product => new ReorderItemDto
                {
                    ProductId = product.Id,
                    Name = product.Name,
                    SKU = product.SKU,
                    SupplierId = product.SupplierId,
                    SupplierName = product.Supplier != null ? product.Supplier.Name : "No supplier",
                    StockQuantity = product.StockQuantity,
                    LowStockLevel = product.LowStockLevel,
                    SuggestedQuantity = Math.Max(product.LowStockLevel * 2 - product.StockQuantity, 1)
                })
                .ToList();

            return Ok(new ReorderReportDto { Items = items });
        }

        [HttpGet("dead-stock")]
        [Authorize(Roles = "Admin,Manager")]
        public async Task<ActionResult<DeadStockReportDto>> GetDeadStock([FromQuery] int days = 30)
        {
            if (days < 1)
            {
                days = 30;
            }

            var cutoff = DateTime.Now.Date.AddDays(-days);

            var salePairs = await _context.SaleItems
                .Select(item => new { item.ProductId, Date = item.Sale!.CreatedAt })
                .ToListAsync();

            var soldRecently = salePairs
                .Where(pair => pair.Date >= cutoff)
                .Select(pair => pair.ProductId)
                .ToHashSet();
            var lastSoldMap = salePairs
                .GroupBy(pair => pair.ProductId)
                .ToDictionary(group => group.Key, group => group.Max(pair => pair.Date));

            var products = await _context.Products
                .Where(product => product.IsActive && product.StockQuantity > 0)
                .ToListAsync();

            var items = products
                .Where(product => !soldRecently.Contains(product.Id))
                .Select(product => new DeadStockItemDto
                {
                    ProductId = product.Id,
                    Name = product.Name,
                    SKU = product.SKU,
                    StockQuantity = product.StockQuantity,
                    StockValueAtCost = product.StockQuantity * product.PurchasePrice,
                    LastSoldDate = lastSoldMap.TryGetValue(product.Id, out var date) ? date : null
                })
                .OrderByDescending(item => item.StockValueAtCost)
                .ToList();

            return Ok(new DeadStockReportDto { Days = days, Items = items });
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

        private static ProfitReportDto BuildProfitReport(DateTime fromDate, DateTime toDate, List<Models.Sale> sales, decimal refunds, decimal refundProfit)
        {
            var totalSales = sales.Sum(sale => sale.TotalAmount);
            var totalProfit = sales.Sum(sale => sale.TotalProfit);
            return new ProfitReportDto
            {
                PeriodStart = fromDate,
                PeriodEnd = toDate,
                TotalSales = totalSales,
                TotalProfit = totalProfit,
                TotalOrders = sales.Count,
                TotalRefunds = refunds,
                NetSales = totalSales - refunds,
                NetProfit = totalProfit - refundProfit
            };
        }

        // Total refunds (and their profit portion) from returns in the period.
        // Cashiers see 0 (returns are not attributed per-cashier).
        private async Task<(decimal Refunds, decimal RefundProfit)> GetRefundsInPeriodAsync(DateTime fromDate, DateTime toDate)
        {
            if (User.IsInRole("Cashier"))
            {
                return (0m, 0m);
            }

            var returns = await _context.Returns
                .Include(returnEntity => returnEntity.Items)
                .Where(returnEntity => returnEntity.CreatedAt >= fromDate && returnEntity.CreatedAt < toDate)
                .ToListAsync();

            if (returns.Count == 0)
            {
                return (0m, 0m);
            }

            var totalRefunds = returns.Sum(returnEntity => returnEntity.TotalRefund);

            var saleIds = returns.Select(returnEntity => returnEntity.SaleId).Distinct().ToList();
            var saleItems = await _context.SaleItems
                .Where(item => saleIds.Contains(item.SaleId))
                .ToListAsync();
            var purchaseByKey = saleItems
                .GroupBy(item => (item.SaleId, item.ProductId))
                .ToDictionary(group => group.Key, group => group.First().PurchasePriceAtSale);

            decimal refundProfit = 0;
            foreach (var returnEntity in returns)
            {
                foreach (var item in returnEntity.Items)
                {
                    if (purchaseByKey.TryGetValue((returnEntity.SaleId, item.ProductId), out var purchase))
                    {
                        refundProfit += (item.UnitPrice - purchase) * item.Quantity;
                    }
                }
            }

            return (totalRefunds, refundProfit);
        }
    }
}