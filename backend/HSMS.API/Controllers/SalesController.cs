using HSMS.API.Data;
using HSMS.API.DTOs.Sales;
using HSMS.API.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace HSMS.API.Controllers
{
    [ApiController]
    [Route("api/sales")]
    [Authorize]
    public class SalesController : ControllerBase
    {
        private readonly AppDbContext _context;

        public SalesController(AppDbContext context)
        {
            _context = context;
        }

        [HttpPost]
        [Authorize(Roles = "Admin,Manager,Cashier")]
        public async Task<ActionResult<SaleResponseDto>> Create([FromBody] CreateSaleRequestDto request)
        {
            if (request.Items == null || request.Items.Count == 0)
            {
                return BadRequest(new { message = "Sale must contain at least one item." });
            }

            var currentUserId = GetCurrentUserId();
            if (currentUserId == null)
            {
                return Unauthorized();
            }

            var currentUser = await _context.Users.FirstOrDefaultAsync(user => user.Id == currentUserId.Value && user.IsActive);
            if (currentUser == null)
            {
                return Unauthorized();
            }

            var duplicateProductIds = request.Items.GroupBy(item => item.ProductId).Any(group => group.Count() > 1);
            if (duplicateProductIds)
            {
                return BadRequest(new { message = "Duplicate product entries in the same sale are not allowed." });
            }

            var isCredit = string.Equals(request.PaymentMethod?.Trim(), "Credit", StringComparison.OrdinalIgnoreCase);
            Customer? customer = null;
            if (request.CustomerId.HasValue)
            {
                customer = await _context.Customers.FirstOrDefaultAsync(item => item.Id == request.CustomerId.Value && item.IsActive);
                if (customer == null)
                {
                    return BadRequest(new { message = "The selected customer is invalid or inactive." });
                }
            }

            if (isCredit && customer == null)
            {
                return BadRequest(new { message = "A customer is required for a credit sale." });
            }

            var productIds = request.Items.Select(item => item.ProductId).Distinct().ToList();
            var products = await _context.Products
                .Where(product => productIds.Contains(product.Id))
                .ToDictionaryAsync(product => product.Id);

            if (products.Count != productIds.Count)
            {
                return BadRequest(new { message = "One or more products were not found." });
            }

            foreach (var item in request.Items)
            {
                var product = products[item.ProductId];
                if (!product.IsActive)
                {
                    return BadRequest(new { message = $"Product '{product.Name}' is inactive." });
                }

                if (item.Quantity <= 0)
                {
                    return BadRequest(new { message = "Quantity must be greater than 0." });
                }

                if (item.ActualSellingPrice < product.MinimumSellingPrice)
                {
                    return BadRequest(new { message = $"Selling price for '{product.Name}' cannot be below the minimum selling price." });
                }

                if (product.StockQuantity < item.Quantity)
                {
                    return BadRequest(new { message = $"Insufficient stock for '{product.Name}'." });
                }
            }

            var now = DateTime.Now;
            var startOfDay = now.Date;
            var endOfDay = startOfDay.AddDays(1);

            await using var transaction = await _context.Database.BeginTransactionAsync();

            var invoiceSequence = await _context.Sales.CountAsync(sale => sale.CreatedAt >= startOfDay && sale.CreatedAt < endOfDay) + 1;
            var invoiceNumber = $"INV-{now:yyyyMMdd}-{invoiceSequence:D4}";

            var sale = new Sale
            {
                InvoiceNumber = invoiceNumber,
                SoldByUserId = currentUser.Id,
                CustomerId = customer?.Id,
                PaymentMethod = request.PaymentMethod.Trim(),
                CreatedAt = now
            };

            decimal totalAmount = 0;
            decimal totalProfit = 0;

            foreach (var item in request.Items)
            {
                var product = products[item.ProductId];
                var lineTotal = item.ActualSellingPrice * item.Quantity;
                var lineProfit = (item.ActualSellingPrice - product.PurchasePrice) * item.Quantity;

                totalAmount += lineTotal;
                totalProfit += lineProfit;

                product.StockQuantity -= item.Quantity;
                product.UpdatedAt = now;

                sale.SaleItems.Add(new SaleItem
                {
                    ProductId = product.Id,
                    ProductNameAtSale = product.Name,
                    SKUAtSale = product.SKU,
                    Quantity = item.Quantity,
                    PurchasePriceAtSale = product.PurchasePrice,
                    MinimumSellingPriceAtSale = product.MinimumSellingPrice,
                    ActualSellingPrice = item.ActualSellingPrice,
                    LineTotal = lineTotal,
                    LineProfit = lineProfit
                });

                _context.StockLogs.Add(new StockLog
                {
                    ProductId = product.Id,
                    OldQuantity = product.StockQuantity + item.Quantity,
                    NewQuantity = product.StockQuantity,
                    ChangeAmount = -item.Quantity,
                    Reason = $"Sale {invoiceNumber}",
                    ChangedByUserId = currentUser.Id,
                    CreatedAt = now
                });
            }

            var shopSettings = await _context.ShopSettings.FirstOrDefaultAsync(settings => settings.Id == 1);
            var taxRate = shopSettings != null ? shopSettings.TaxRatePercent : 0m;
            var taxAmount = Math.Round(totalAmount * taxRate / 100m, 2);
            var grandTotal = totalAmount + taxAmount;

            sale.TaxAmount = taxAmount;
            sale.TotalAmount = grandTotal;
            sale.TotalProfit = totalProfit;

            if (isCredit && customer != null)
            {
                if (customer.CreditLimit > 0 && customer.OutstandingBalance + grandTotal > customer.CreditLimit)
                {
                    return BadRequest(new { message = $"This sale would exceed {customer.Name}'s credit limit." });
                }

                customer.OutstandingBalance += grandTotal;
                customer.UpdatedAt = now;
            }

            _context.Sales.Add(sale);
            await _context.SaveChangesAsync();
            await transaction.CommitAsync();

            return CreatedAtAction(nameof(GetById), new { id = sale.Id }, await BuildSaleResponseAsync(sale.Id, hideProfit: false));
        }

        [HttpGet]
        [Authorize(Roles = "Admin,Manager,Cashier")]
        public async Task<ActionResult<IEnumerable<SaleResponseDto>>> GetAll([FromQuery] DateTime? fromDate, [FromQuery] DateTime? toDate, [FromQuery] string? invoiceNumber, [FromQuery] int? soldByUserId)
        {
            var query = BuildSaleQuery();
            var currentUserId = GetCurrentUserId();
            if (User.IsInRole("Cashier"))
            {
                if (currentUserId == null)
                {
                    return Unauthorized();
                }

                query = query.Where(sale => sale.SoldByUserId == currentUserId.Value);
            }

            if (fromDate.HasValue)
            {
                query = query.Where(sale => sale.CreatedAt >= fromDate.Value.Date);
            }

            if (toDate.HasValue)
            {
                query = query.Where(sale => sale.CreatedAt < toDate.Value.Date.AddDays(1));
            }

            if (!string.IsNullOrWhiteSpace(invoiceNumber))
            {
                query = query.Where(sale => sale.InvoiceNumber.Contains(invoiceNumber));
            }

            if (soldByUserId.HasValue)
            {
                query = query.Where(sale => sale.SoldByUserId == soldByUserId.Value);
            }

            var hideProfit = User.IsInRole("Cashier");
            var sales = await query
                .OrderByDescending(sale => sale.CreatedAt)
                .Select(sale => new SaleResponseDto
                {
                    Id = sale.Id,
                    InvoiceNumber = sale.InvoiceNumber,
                    SoldByUserId = sale.SoldByUserId,
                    SoldByUserName = sale.SoldByUser != null ? sale.SoldByUser.FullName : string.Empty,
                    TotalAmount = sale.TotalAmount,
                    TotalProfit = hideProfit ? null : sale.TotalProfit,
                    PaymentMethod = sale.PaymentMethod,
                    CreatedAt = sale.CreatedAt,
                    Items = sale.SaleItems.Select(item => new SaleItemResponseDto
                    {
                        Id = item.Id,
                        ProductId = item.ProductId,
                        ProductNameAtSale = item.ProductNameAtSale,
                        SKUAtSale = item.SKUAtSale,
                        Quantity = item.Quantity,
                        PurchasePriceAtSale = hideProfit ? null : item.PurchasePriceAtSale,
                        MinimumSellingPriceAtSale = hideProfit ? null : item.MinimumSellingPriceAtSale,
                        ActualSellingPrice = item.ActualSellingPrice,
                        LineTotal = item.LineTotal,
                        LineProfit = hideProfit ? null : item.LineProfit
                    }).ToList()
                })
                .ToListAsync();

            return Ok(sales);
        }

        [HttpGet("{id:int}")]
        [Authorize(Roles = "Admin,Manager,Cashier")]
        public async Task<ActionResult<SaleResponseDto>> GetById(int id)
        {
            var sale = await BuildSaleQuery().FirstOrDefaultAsync(item => item.Id == id);
            if (sale == null)
            {
                return NotFound();
            }

            if (User.IsInRole("Cashier"))
            {
                var currentUserId = GetCurrentUserId();
                if (currentUserId == null || sale.SoldByUserId != currentUserId.Value)
                {
                    return NotFound();
                }
            }

            return Ok(await BuildSaleResponseAsync(sale.Id, hideProfit: User.IsInRole("Cashier")));
        }

        [HttpGet("{id:int}/invoice")]
        [Authorize(Roles = "Admin,Manager,Cashier")]
        public async Task<ActionResult<InvoiceResponseDto>> GetInvoice(int id)
        {
            var sale = await _context.Sales
                .Include(item => item.SoldByUser)
                .Include(item => item.SaleItems)
                .FirstOrDefaultAsync(item => item.Id == id);

            if (sale == null)
            {
                return NotFound();
            }

            if (User.IsInRole("Cashier"))
            {
                var currentUserId = GetCurrentUserId();
                if (currentUserId == null || sale.SoldByUserId != currentUserId.Value)
                {
                    return NotFound();
                }
            }

            var shopSettings = await _context.ShopSettings.FirstAsync(item => item.Id == 1);

            return Ok(new InvoiceResponseDto
            {
                InvoiceNumber = sale.InvoiceNumber,
                ShopName = shopSettings.ShopName,
                Address = shopSettings.Address,
                PhoneNumber = shopSettings.PhoneNumber,
                InvoiceFooterMessage = shopSettings.InvoiceFooterMessage,
                CashierName = sale.SoldByUser != null ? sale.SoldByUser.FullName : string.Empty,
                CreatedAt = sale.CreatedAt,
                PaymentMethod = sale.PaymentMethod,
                SubTotal = sale.TotalAmount - sale.TaxAmount,
                TaxAmount = sale.TaxAmount,
                TaxLabel = shopSettings.TaxLabel,
                TotalAmount = sale.TotalAmount,
                Items = sale.SaleItems.Select(item => new InvoiceItemResponseDto
                {
                    ProductName = item.ProductNameAtSale,
                    SKU = item.SKUAtSale,
                    Quantity = item.Quantity,
                    ActualSellingPrice = item.ActualSellingPrice,
                    LineTotal = item.LineTotal
                }).ToList()
            });
        }

        private IQueryable<Sale> BuildSaleQuery()
        {
            return _context.Sales
                .Include(sale => sale.SoldByUser)
                .Include(sale => sale.SaleItems);
        }

        private async Task<SaleResponseDto> BuildSaleResponseAsync(int saleId, bool hideProfit)
        {
            return await BuildSaleQuery()
                .Where(sale => sale.Id == saleId)
                .Select(sale => new SaleResponseDto
                {
                    Id = sale.Id,
                    InvoiceNumber = sale.InvoiceNumber,
                    SoldByUserId = sale.SoldByUserId,
                    SoldByUserName = sale.SoldByUser != null ? sale.SoldByUser.FullName : string.Empty,
                    TotalAmount = sale.TotalAmount,
                    TotalProfit = hideProfit ? null : sale.TotalProfit,
                    PaymentMethod = sale.PaymentMethod,
                    CreatedAt = sale.CreatedAt,
                    Items = sale.SaleItems.Select(item => new SaleItemResponseDto
                    {
                        Id = item.Id,
                        ProductId = item.ProductId,
                        ProductNameAtSale = item.ProductNameAtSale,
                        SKUAtSale = item.SKUAtSale,
                        Quantity = item.Quantity,
                        PurchasePriceAtSale = hideProfit ? null : item.PurchasePriceAtSale,
                        MinimumSellingPriceAtSale = hideProfit ? null : item.MinimumSellingPriceAtSale,
                        ActualSellingPrice = item.ActualSellingPrice,
                        LineTotal = item.LineTotal,
                        LineProfit = hideProfit ? null : item.LineProfit
                    }).ToList()
                })
                .FirstAsync();
        }

        private int? GetCurrentUserId()
        {
            var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
            return int.TryParse(userIdClaim, out var userId) ? userId : null;
        }
    }
}