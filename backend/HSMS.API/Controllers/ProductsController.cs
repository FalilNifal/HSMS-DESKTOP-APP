using HSMS.API.Data;
using HSMS.API.DTOs.Products;
using HSMS.API.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace HSMS.API.Controllers
{
    [ApiController]
    [Route("api/products")]
    public class ProductsController : ControllerBase
    {
        private readonly AppDbContext _context;

        public ProductsController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        [Authorize]
        public async Task<ActionResult<IEnumerable<ProductResponseDto>>> GetAll()
        {
            var isCashier = User.IsInRole("Cashier");
            var products = await BuildProductQuery(isCashier)
                .OrderBy(product => product.Name)
                .ToListAsync();

            return Ok(products);
        }

        [HttpGet("{id:int}")]
        [Authorize]
        public async Task<ActionResult<ProductResponseDto>> GetById(int id)
        {
            var isCashier = User.IsInRole("Cashier");
            var product = await BuildProductQuery(isCashier).FirstOrDefaultAsync(item => item.Id == id);
            if (product == null)
            {
                return NotFound();
            }

            return Ok(product);
        }

        [HttpGet("search")]
        [Authorize]
        public async Task<ActionResult<IEnumerable<ProductSearchResponseDto>>> Search([FromQuery] string query)
        {
            if (string.IsNullOrWhiteSpace(query))
            {
                return Ok(Array.Empty<ProductSearchResponseDto>());
            }

            var searchQuery = query.Trim();
            var isCashier = User.IsInRole("Cashier");

            var products = await _context.Products
                .Include(product => product.Category)
                .Include(product => product.Supplier)
                .Where(product => (!isCashier || product.IsActive) &&
                    (product.Name.Contains(searchQuery) || product.SKU.Contains(searchQuery)))
                .OrderBy(product => product.Name)
                .Select(product => new ProductSearchResponseDto
                {
                    Id = product.Id,
                    Name = product.Name,
                    SKU = product.SKU,
                    CategoryName = product.Category != null ? product.Category.Name : string.Empty,
                    SupplierName = product.Supplier != null ? product.Supplier.Name : null,
                    MinimumSellingPrice = product.MinimumSellingPrice,
                    StockQuantity = product.StockQuantity,
                    LowStockLevel = product.LowStockLevel,
                    IsActive = product.IsActive
                })
                .ToListAsync();

            return Ok(products);
        }

        [HttpPost]
        [Authorize(Roles = "Admin,Manager")]
        public async Task<ActionResult<ProductResponseDto>> Create([FromBody] CreateProductRequestDto request)
        {
            var validationError = await ValidateProductRequest(request.Name, request.SKU, request.PurchasePrice, request.MinimumSellingPrice, request.StockQuantity, request.LowStockLevel, request.CategoryId, request.SupplierId, null);
            if (validationError != null)
            {
                return validationError;
            }

            var now = DateTime.Now;
            var product = new Product
            {
                Name = request.Name.Trim(),
                SKU = request.SKU.Trim(),
                CategoryId = request.CategoryId,
                SupplierId = request.SupplierId,
                PurchasePrice = request.PurchasePrice,
                MinimumSellingPrice = request.MinimumSellingPrice,
                StockQuantity = request.StockQuantity,
                LowStockLevel = request.LowStockLevel,
                IsActive = true,
                CreatedAt = now,
                UpdatedAt = now
            };

            _context.Products.Add(product);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetById), new { id = product.Id }, await BuildProductResponse(product.Id, includePurchasePrice: true));
        }

        [HttpPut("{id:int}")]
        [Authorize(Roles = "Admin,Manager")]
        public async Task<IActionResult> Update(int id, [FromBody] UpdateProductRequestDto request)
        {
            var product = await _context.Products.FirstOrDefaultAsync(item => item.Id == id);
            if (product == null)
            {
                return NotFound();
            }

            var validationError = await ValidateProductRequest(request.Name, request.SKU, request.PurchasePrice, request.MinimumSellingPrice, request.StockQuantity, request.LowStockLevel, request.CategoryId, request.SupplierId, id);
            if (validationError != null)
            {
                return validationError;
            }

            product.Name = request.Name.Trim();
            product.SKU = request.SKU.Trim();
            product.CategoryId = request.CategoryId;
            product.SupplierId = request.SupplierId;
            product.PurchasePrice = request.PurchasePrice;
            product.MinimumSellingPrice = request.MinimumSellingPrice;
            product.StockQuantity = request.StockQuantity;
            product.LowStockLevel = request.LowStockLevel;
            product.UpdatedAt = DateTime.Now;

            await _context.SaveChangesAsync();
            return NoContent();
        }

        [HttpPatch("{id:int}/stock")]
        [Authorize(Roles = "Admin,Manager")]
        public async Task<IActionResult> UpdateStock(int id, [FromBody] UpdateStockRequestDto request)
        {
            var product = await _context.Products.FirstOrDefaultAsync(item => item.Id == id);
            if (product == null)
            {
                return NotFound();
            }

            if (request.NewQuantity < 0)
            {
                return BadRequest(new { message = "Stock quantity cannot be negative." });
            }

            var currentUserId = GetCurrentUserId();
            if (currentUserId == null)
            {
                return Unauthorized();
            }

            var oldQuantity = product.StockQuantity;
            product.StockQuantity = request.NewQuantity;
            product.UpdatedAt = DateTime.Now;

            _context.StockLogs.Add(new StockLog
            {
                ProductId = product.Id,
                OldQuantity = oldQuantity,
                NewQuantity = request.NewQuantity,
                ChangeAmount = request.NewQuantity - oldQuantity,
                Reason = request.Reason.Trim(),
                ChangedByUserId = currentUserId.Value,
                CreatedAt = DateTime.Now
            });

            await _context.SaveChangesAsync();
            return NoContent();
        }

        [HttpDelete("{id:int}")]
        [Authorize(Roles = "Admin,Manager")]
        public async Task<IActionResult> Deactivate(int id)
        {
            var product = await _context.Products.FirstOrDefaultAsync(item => item.Id == id);
            if (product == null)
            {
                return NotFound();
            }

            product.IsActive = false;
            product.UpdatedAt = DateTime.Now;
            await _context.SaveChangesAsync();

            return NoContent();
        }

        private IQueryable<ProductResponseDto> BuildProductQuery(bool isCashier)
        {
            return _context.Products
                .Include(product => product.Category)
                .Include(product => product.Supplier)
                .Where(product => !isCashier || product.IsActive)
                .Select(product => new ProductResponseDto
                {
                    Id = product.Id,
                    Name = product.Name,
                    SKU = product.SKU,
                    CategoryId = product.CategoryId,
                    CategoryName = product.Category != null ? product.Category.Name : string.Empty,
                    SupplierId = product.SupplierId,
                    SupplierName = product.Supplier != null ? product.Supplier.Name : null,
                    PurchasePrice = isCashier ? null : product.PurchasePrice,
                    MinimumSellingPrice = product.MinimumSellingPrice,
                    StockQuantity = product.StockQuantity,
                    LowStockLevel = product.LowStockLevel,
                    IsActive = product.IsActive,
                    CreatedAt = product.CreatedAt,
                    UpdatedAt = product.UpdatedAt
                });
        }

        private async Task<ProductResponseDto> BuildProductResponse(int productId, bool includePurchasePrice)
        {
            return await _context.Products
                .Where(product => product.Id == productId)
                .Include(product => product.Category)
                .Include(product => product.Supplier)
                .Select(product => new ProductResponseDto
                {
                    Id = product.Id,
                    Name = product.Name,
                    SKU = product.SKU,
                    CategoryId = product.CategoryId,
                    CategoryName = product.Category != null ? product.Category.Name : string.Empty,
                    SupplierId = product.SupplierId,
                    SupplierName = product.Supplier != null ? product.Supplier.Name : null,
                    PurchasePrice = includePurchasePrice ? product.PurchasePrice : null,
                    MinimumSellingPrice = product.MinimumSellingPrice,
                    StockQuantity = product.StockQuantity,
                    LowStockLevel = product.LowStockLevel,
                    IsActive = product.IsActive,
                    CreatedAt = product.CreatedAt,
                    UpdatedAt = product.UpdatedAt
                })
                .FirstAsync();
        }

        private async Task<ActionResult?> ValidateProductRequest(string name, string sku, decimal purchasePrice, decimal minimumSellingPrice, int stockQuantity, int lowStockLevel, int categoryId, int? supplierId, int? currentProductId)
        {
            if (string.IsNullOrWhiteSpace(name))
            {
                return BadRequest(new { message = "Product name is required." });
            }

            if (string.IsNullOrWhiteSpace(sku))
            {
                return BadRequest(new { message = "SKU is required." });
            }

            if (purchasePrice < 0)
            {
                return BadRequest(new { message = "Purchase price must be greater than or equal to 0." });
            }

            if (minimumSellingPrice < purchasePrice)
            {
                return BadRequest(new { message = "Minimum selling price must be greater than or equal to purchase price." });
            }

            if (stockQuantity < 0)
            {
                return BadRequest(new { message = "Stock quantity must be greater than or equal to 0." });
            }

            if (lowStockLevel < 0)
            {
                return BadRequest(new { message = "Low stock level must be greater than or equal to 0." });
            }

            var categoryExists = await _context.Categories.AnyAsync(category => category.Id == categoryId && category.IsActive);
            if (!categoryExists)
            {
                return BadRequest(new { message = "Category is invalid or inactive." });
            }

            if (supplierId.HasValue)
            {
                var supplierExists = await _context.Suppliers.AnyAsync(supplier => supplier.Id == supplierId.Value && supplier.IsActive);
                if (!supplierExists)
                {
                    return BadRequest(new { message = "Supplier is invalid or inactive." });
                }
            }

            var duplicateSku = await _context.Products.AnyAsync(product => product.SKU == sku.Trim() && product.Id != currentProductId);
            if (duplicateSku)
            {
                return Conflict(new { message = "SKU already exists." });
            }

            return null;
        }

        private int? GetCurrentUserId()
        {
            var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
            return int.TryParse(userIdClaim, out var userId) ? userId : null;
        }
    }
}