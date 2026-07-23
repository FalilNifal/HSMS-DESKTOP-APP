using HSMS.API.Data;
using HSMS.API.DTOs.Quotations;
using HSMS.API.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace HSMS.API.Controllers
{
    [ApiController]
    [Route("api/quotations")]
    [Authorize(Roles = "Admin,Manager,Cashier")]
    public class QuotationsController : ControllerBase
    {
        private readonly AppDbContext _context;

        public QuotationsController(AppDbContext context)
        {
            _context = context;
        }

        [HttpPost]
        public async Task<ActionResult<QuotationResponseDto>> Create([FromBody] CreateQuotationRequestDto request)
        {
            if (request.Items == null || request.Items.Count == 0)
            {
                return BadRequest(new { message = "A quotation must contain at least one item." });
            }

            var currentUserId = GetCurrentUserId();
            if (currentUserId == null)
            {
                return Unauthorized();
            }

            if (request.Items.GroupBy(item => item.ProductId).Any(group => group.Count() > 1))
            {
                return BadRequest(new { message = "Duplicate product entries in the same quotation are not allowed." });
            }

            Customer? customer = null;
            if (request.CustomerId.HasValue)
            {
                customer = await _context.Customers.FirstOrDefaultAsync(item => item.Id == request.CustomerId.Value && item.IsActive);
                if (customer == null)
                {
                    return BadRequest(new { message = "The selected customer is invalid or inactive." });
                }
            }

            var productIds = request.Items.Select(item => item.ProductId).Distinct().ToList();
            var products = await _context.Products
                .Where(product => productIds.Contains(product.Id))
                .ToDictionaryAsync(product => product.Id);

            if (products.Count != productIds.Count)
            {
                return BadRequest(new { message = "One or more products were not found." });
            }

            var now = DateTime.Now;
            var quotation = new Quotation
            {
                CustomerId = customer?.Id,
                CustomerNameSnapshot = customer?.Name ?? (request.CustomerName?.Trim() ?? string.Empty),
                CreatedByUserId = currentUserId.Value,
                Notes = request.Notes?.Trim() ?? string.Empty,
                ValidUntil = request.ValidUntil,
                Status = "Open",
                CreatedAt = now
            };

            decimal total = 0;
            foreach (var item in request.Items)
            {
                var product = products[item.ProductId];
                var unitFactor = item.UnitFactor < 1 ? 1 : item.UnitFactor;

                if (item.Quantity <= 0)
                {
                    return BadRequest(new { message = "Quantity must be greater than 0." });
                }

                if (item.UnitPrice < product.MinimumSellingPrice * unitFactor)
                {
                    return BadRequest(new { message = $"Quoted price for '{product.Name}' cannot be below the minimum selling price." });
                }

                var lineTotal = item.UnitPrice * item.Quantity;
                total += lineTotal;

                quotation.Items.Add(new QuotationItem
                {
                    ProductId = product.Id,
                    ProductNameSnapshot = product.Name,
                    SKUSnapshot = product.SKU,
                    Quantity = item.Quantity,
                    UnitLabel = string.IsNullOrWhiteSpace(item.UnitLabel) ? product.Unit : item.UnitLabel.Trim(),
                    UnitFactor = unitFactor,
                    UnitPrice = item.UnitPrice,
                    LineTotal = lineTotal
                });
            }

            quotation.TotalAmount = total;

            var startOfDay = now.Date;
            var endOfDay = startOfDay.AddDays(1);
            var sequence = await _context.Quotations.CountAsync(q => q.CreatedAt >= startOfDay && q.CreatedAt < endOfDay) + 1;
            quotation.QuotationNumber = $"QUO-{now:yyyyMMdd}-{sequence:D4}";

            _context.Quotations.Add(quotation);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetById), new { id = quotation.Id }, await BuildResponseAsync(quotation.Id));
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<QuotationResponseDto>>> GetAll(
            [FromQuery] string? status,
            [FromQuery] DateTime? fromDate,
            [FromQuery] DateTime? toDate)
        {
            var query = BuildQuery();

            if (!string.IsNullOrWhiteSpace(status))
            {
                query = query.Where(q => q.Status == status);
            }

            if (fromDate.HasValue)
            {
                query = query.Where(q => q.CreatedAt >= fromDate.Value.Date);
            }

            if (toDate.HasValue)
            {
                query = query.Where(q => q.CreatedAt < toDate.Value.Date.AddDays(1));
            }

            var quotations = await query.OrderByDescending(q => q.CreatedAt).ToListAsync();
            return Ok(quotations.Select(ToResponse).ToList());
        }

        [HttpGet("{id:int}")]
        public async Task<ActionResult<QuotationResponseDto>> GetById(int id)
        {
            var quotation = await BuildQuery().FirstOrDefaultAsync(q => q.Id == id);
            if (quotation == null)
            {
                return NotFound();
            }

            return Ok(ToResponse(quotation));
        }

        [HttpPost("{id:int}/convert")]
        public async Task<ActionResult<QuotationResponseDto>> Convert(int id, [FromBody] ConvertQuotationRequestDto request)
        {
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

            var quotation = await _context.Quotations
                .Include(q => q.Items)
                .FirstOrDefaultAsync(q => q.Id == id);

            if (quotation == null)
            {
                return NotFound();
            }

            if (quotation.Status != "Open")
            {
                return BadRequest(new { message = $"This quotation is already {quotation.Status.ToLowerInvariant()}." });
            }

            var isCredit = string.Equals(request.PaymentMethod?.Trim(), "Credit", StringComparison.OrdinalIgnoreCase);
            var customerId = request.CustomerId ?? quotation.CustomerId;
            Customer? customer = null;
            if (customerId.HasValue)
            {
                customer = await _context.Customers.FirstOrDefaultAsync(item => item.Id == customerId.Value && item.IsActive);
                if (customer == null)
                {
                    return BadRequest(new { message = "The selected customer is invalid or inactive." });
                }
            }

            if (isCredit && customer == null)
            {
                return BadRequest(new { message = "A customer is required for a credit sale." });
            }

            var productIds = quotation.Items.Select(item => item.ProductId).Distinct().ToList();
            var products = await _context.Products
                .Where(product => productIds.Contains(product.Id))
                .ToDictionaryAsync(product => product.Id);

            foreach (var item in quotation.Items)
            {
                if (!products.TryGetValue(item.ProductId, out var product) || !product.IsActive)
                {
                    return BadRequest(new { message = $"Product '{item.ProductNameSnapshot}' is no longer available." });
                }

                var unitFactor = item.UnitFactor < 1 ? 1 : item.UnitFactor;
                if (product.StockQuantity < item.Quantity * unitFactor)
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

            foreach (var item in quotation.Items)
            {
                var product = products[item.ProductId];
                var unitFactor = item.UnitFactor < 1 ? 1 : item.UnitFactor;
                var baseQuantity = item.Quantity * unitFactor;
                var purchasePerUnit = product.PurchasePrice * unitFactor;
                var lineTotal = item.UnitPrice * item.Quantity;
                var lineProfit = (item.UnitPrice - purchasePerUnit) * item.Quantity;

                totalAmount += lineTotal;
                totalProfit += lineProfit;

                product.StockQuantity -= baseQuantity;
                product.UpdatedAt = now;

                sale.SaleItems.Add(new SaleItem
                {
                    ProductId = product.Id,
                    ProductNameAtSale = product.Name,
                    SKUAtSale = product.SKU,
                    Quantity = item.Quantity,
                    UnitLabel = item.UnitLabel,
                    UnitFactor = unitFactor,
                    PurchasePriceAtSale = purchasePerUnit,
                    MinimumSellingPriceAtSale = product.MinimumSellingPrice * unitFactor,
                    ActualSellingPrice = item.UnitPrice,
                    LineTotal = lineTotal,
                    LineProfit = lineProfit
                });

                _context.StockLogs.Add(new StockLog
                {
                    ProductId = product.Id,
                    OldQuantity = product.StockQuantity + baseQuantity,
                    NewQuantity = product.StockQuantity,
                    ChangeAmount = -baseQuantity,
                    Reason = $"Sale {invoiceNumber} (from {quotation.QuotationNumber})",
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

            quotation.Status = "Converted";
            quotation.ConvertedSaleId = sale.Id;
            quotation.UpdatedAt = now;
            await _context.SaveChangesAsync();

            await transaction.CommitAsync();

            return Ok(await BuildResponseAsync(quotation.Id));
        }

        [HttpPost("{id:int}/cancel")]
        public async Task<IActionResult> Cancel(int id)
        {
            var quotation = await _context.Quotations.FirstOrDefaultAsync(q => q.Id == id);
            if (quotation == null)
            {
                return NotFound();
            }

            if (quotation.Status == "Converted")
            {
                return BadRequest(new { message = "A converted quotation cannot be cancelled." });
            }

            quotation.Status = "Cancelled";
            quotation.UpdatedAt = DateTime.Now;
            await _context.SaveChangesAsync();
            return NoContent();
        }

        private IQueryable<Quotation> BuildQuery()
        {
            return _context.Quotations
                .Include(q => q.CreatedByUser)
                .Include(q => q.Customer)
                .Include(q => q.Items);
        }

        private async Task<QuotationResponseDto> BuildResponseAsync(int id)
        {
            var quotation = await BuildQuery().FirstAsync(q => q.Id == id);
            return ToResponse(quotation);
        }

        private static QuotationResponseDto ToResponse(Quotation quotation)
        {
            return new QuotationResponseDto
            {
                Id = quotation.Id,
                QuotationNumber = quotation.QuotationNumber,
                CustomerId = quotation.CustomerId,
                CustomerName = quotation.Customer != null ? quotation.Customer.Name : quotation.CustomerNameSnapshot,
                CreatedByUserId = quotation.CreatedByUserId,
                CreatedByUserName = quotation.CreatedByUser != null ? quotation.CreatedByUser.FullName : string.Empty,
                TotalAmount = quotation.TotalAmount,
                Notes = quotation.Notes,
                ValidUntil = quotation.ValidUntil,
                Status = quotation.Status,
                ConvertedSaleId = quotation.ConvertedSaleId,
                CreatedAt = quotation.CreatedAt,
                Items = quotation.Items.Select(item => new QuotationItemResponseDto
                {
                    Id = item.Id,
                    ProductId = item.ProductId,
                    ProductName = item.ProductNameSnapshot,
                    SKU = item.SKUSnapshot,
                    Quantity = item.Quantity,
                    UnitLabel = item.UnitLabel,
                    UnitFactor = item.UnitFactor,
                    UnitPrice = item.UnitPrice,
                    LineTotal = item.LineTotal
                }).ToList()
            };
        }

        private int? GetCurrentUserId()
        {
            var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
            return int.TryParse(userIdClaim, out var userId) ? userId : null;
        }
    }
}
