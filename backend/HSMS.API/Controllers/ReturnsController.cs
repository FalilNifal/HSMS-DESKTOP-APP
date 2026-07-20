using HSMS.API.Data;
using HSMS.API.DTOs.Returns;
using HSMS.API.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace HSMS.API.Controllers
{
    [ApiController]
    [Route("api/returns")]
    [Authorize(Roles = "Admin,Manager")]
    public class ReturnsController : ControllerBase
    {
        private readonly AppDbContext _context;

        public ReturnsController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet("returnable")]
        public async Task<ActionResult<ReturnableSaleResponseDto>> GetReturnable([FromQuery] string invoiceNumber)
        {
            if (string.IsNullOrWhiteSpace(invoiceNumber))
            {
                return BadRequest(new { message = "Invoice number is required." });
            }

            var sale = await _context.Sales
                .Include(item => item.SoldByUser)
                .Include(item => item.SaleItems)
                .FirstOrDefaultAsync(item => item.InvoiceNumber == invoiceNumber.Trim());

            if (sale == null)
            {
                return NotFound(new { message = "No sale found with that invoice number." });
            }

            var returnedByProduct = await GetReturnedByProductAsync(sale.Id);

            var items = sale.SaleItems.Select(saleItem =>
            {
                var already = returnedByProduct.TryGetValue(saleItem.ProductId, out var qty) ? qty : 0;
                return new ReturnableItemDto
                {
                    ProductId = saleItem.ProductId,
                    ProductName = saleItem.ProductNameAtSale,
                    SKU = saleItem.SKUAtSale,
                    SoldQuantity = saleItem.Quantity,
                    AlreadyReturned = already,
                    ReturnableQuantity = saleItem.Quantity - already,
                    UnitPrice = saleItem.ActualSellingPrice
                };
            }).ToList();

            return Ok(new ReturnableSaleResponseDto
            {
                SaleId = sale.Id,
                InvoiceNumber = sale.InvoiceNumber,
                SoldByUserName = sale.SoldByUser != null ? sale.SoldByUser.FullName : string.Empty,
                CreatedAt = sale.CreatedAt,
                Items = items
            });
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<ReturnResponseDto>>> GetAll([FromQuery] DateTime? fromDate, [FromQuery] DateTime? toDate)
        {
            var query = _context.Returns
                .Include(returnEntity => returnEntity.ProcessedByUser)
                .Include(returnEntity => returnEntity.Items)
                .AsQueryable();

            if (fromDate.HasValue)
            {
                query = query.Where(returnEntity => returnEntity.CreatedAt >= fromDate.Value.Date);
            }

            if (toDate.HasValue)
            {
                query = query.Where(returnEntity => returnEntity.CreatedAt < toDate.Value.Date.AddDays(1));
            }

            var entities = await query
                .OrderByDescending(returnEntity => returnEntity.CreatedAt)
                .Take(500)
                .ToListAsync();

            return Ok(entities.Select(ToResponse));
        }

        [HttpPost]
        public async Task<ActionResult<ReturnResponseDto>> Create([FromBody] CreateReturnRequestDto request)
        {
            if (request.Items == null || request.Items.Count == 0)
            {
                return BadRequest(new { message = "Select at least one item to return." });
            }

            if (request.Items.GroupBy(item => item.ProductId).Any(group => group.Count() > 1))
            {
                return BadRequest(new { message = "The same product appears more than once in the return." });
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

            var sale = await _context.Sales
                .Include(item => item.SaleItems)
                .FirstOrDefaultAsync(item => item.InvoiceNumber == request.InvoiceNumber.Trim());
            if (sale == null)
            {
                return NotFound(new { message = "No sale found with that invoice number." });
            }

            var returnedByProduct = await GetReturnedByProductAsync(sale.Id);
            var saleItemsByProduct = sale.SaleItems.ToDictionary(saleItem => saleItem.ProductId);

            foreach (var item in request.Items)
            {
                if (!saleItemsByProduct.TryGetValue(item.ProductId, out var saleItem))
                {
                    return BadRequest(new { message = "One or more items are not part of this sale." });
                }

                if (item.Quantity <= 0)
                {
                    return BadRequest(new { message = "Return quantity must be greater than 0." });
                }

                var already = returnedByProduct.TryGetValue(item.ProductId, out var qty) ? qty : 0;
                var returnable = saleItem.Quantity - already;
                if (item.Quantity > returnable)
                {
                    return BadRequest(new { message = $"Cannot return more than {returnable} of '{saleItem.ProductNameAtSale}'." });
                }
            }

            var now = DateTime.Now;
            var startOfDay = now.Date;
            var endOfDay = startOfDay.AddDays(1);

            await using var transaction = await _context.Database.BeginTransactionAsync();

            var sequence = await _context.Returns.CountAsync(r => r.CreatedAt >= startOfDay && r.CreatedAt < endOfDay) + 1;
            var returnNumber = $"RET-{now:yyyyMMdd}-{sequence:D4}";

            var returnEntity = new Return
            {
                ReturnNumber = returnNumber,
                SaleId = sale.Id,
                InvoiceNumber = sale.InvoiceNumber,
                ProcessedByUserId = currentUser.Id,
                Reason = request.Reason?.Trim() ?? string.Empty,
                CreatedAt = now
            };

            var productIds = request.Items.Select(item => item.ProductId).ToList();
            var products = await _context.Products
                .Where(product => productIds.Contains(product.Id))
                .ToDictionaryAsync(product => product.Id);

            decimal totalRefund = 0;
            foreach (var item in request.Items)
            {
                var saleItem = saleItemsByProduct[item.ProductId];
                var lineRefund = saleItem.ActualSellingPrice * item.Quantity;
                totalRefund += lineRefund;

                returnEntity.Items.Add(new ReturnItem
                {
                    ProductId = saleItem.ProductId,
                    ProductNameAtSale = saleItem.ProductNameAtSale,
                    SKUAtSale = saleItem.SKUAtSale,
                    Quantity = item.Quantity,
                    UnitPrice = saleItem.ActualSellingPrice,
                    LineRefund = lineRefund
                });

                if (products.TryGetValue(item.ProductId, out var product))
                {
                    var oldQuantity = product.StockQuantity;
                    product.StockQuantity += item.Quantity;
                    product.UpdatedAt = now;

                    _context.StockLogs.Add(new StockLog
                    {
                        ProductId = product.Id,
                        OldQuantity = oldQuantity,
                        NewQuantity = product.StockQuantity,
                        ChangeAmount = item.Quantity,
                        Reason = $"Return {returnNumber}",
                        ChangedByUserId = currentUser.Id,
                        CreatedAt = now
                    });
                }
            }

            returnEntity.TotalRefund = totalRefund;
            _context.Returns.Add(returnEntity);
            await _context.SaveChangesAsync();
            await transaction.CommitAsync();

            var saved = await _context.Returns
                .Include(item => item.ProcessedByUser)
                .Include(item => item.Items)
                .FirstAsync(item => item.Id == returnEntity.Id);

            return Ok(ToResponse(saved));
        }

        private async Task<Dictionary<int, int>> GetReturnedByProductAsync(int saleId)
        {
            var priorReturns = await _context.Returns
                .Where(returnEntity => returnEntity.SaleId == saleId)
                .Include(returnEntity => returnEntity.Items)
                .ToListAsync();

            return priorReturns
                .SelectMany(returnEntity => returnEntity.Items)
                .GroupBy(item => item.ProductId)
                .ToDictionary(group => group.Key, group => group.Sum(item => item.Quantity));
        }

        private static ReturnResponseDto ToResponse(Return returnEntity) => new()
        {
            Id = returnEntity.Id,
            ReturnNumber = returnEntity.ReturnNumber,
            SaleId = returnEntity.SaleId,
            InvoiceNumber = returnEntity.InvoiceNumber,
            ProcessedByUserName = returnEntity.ProcessedByUser != null ? returnEntity.ProcessedByUser.FullName : string.Empty,
            TotalRefund = returnEntity.TotalRefund,
            Reason = returnEntity.Reason,
            CreatedAt = returnEntity.CreatedAt,
            Items = returnEntity.Items.Select(item => new ReturnItemResponseDto
            {
                ProductId = item.ProductId,
                ProductNameAtSale = item.ProductNameAtSale,
                SKUAtSale = item.SKUAtSale,
                Quantity = item.Quantity,
                UnitPrice = item.UnitPrice,
                LineRefund = item.LineRefund
            }).ToList()
        };

        private int? GetCurrentUserId()
        {
            var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
            return int.TryParse(userIdClaim, out var userId) ? userId : null;
        }
    }
}
