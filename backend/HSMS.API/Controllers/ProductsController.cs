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

        [HttpPost]
        [Authorize(Roles = "Admin,Manager")]
        public async Task<ActionResult<ProductResponseDto>> Create([FromBody] CreateProductRequestDto request)
        {
            var validationError = await ValidateProductRequest(request.Name, request.SKU, request.PurchasePrice, request.MinimumSellingPrice, request.StockQuantity, request.LowStockLevel, request.CategoryId, request.SupplierId, null)
                ?? ValidateUnits(request.SecondaryUnit, request.SecondaryUnitFactor);
            if (validationError != null)
            {
                return validationError;
            }

            var secondaryUnit = string.IsNullOrWhiteSpace(request.SecondaryUnit) ? null : request.SecondaryUnit.Trim();
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
                Unit = string.IsNullOrWhiteSpace(request.Unit) ? "pcs" : request.Unit.Trim(),
                SecondaryUnit = secondaryUnit,
                SecondaryUnitFactor = secondaryUnit == null ? 0 : request.SecondaryUnitFactor,
                SecondaryUnitPrice = secondaryUnit == null ? 0 : request.SecondaryUnitPrice,
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

            var validationError = await ValidateProductRequest(request.Name, request.SKU, request.PurchasePrice, request.MinimumSellingPrice, request.StockQuantity, request.LowStockLevel, request.CategoryId, request.SupplierId, id)
                ?? ValidateUnits(request.SecondaryUnit, request.SecondaryUnitFactor);
            if (validationError != null)
            {
                return validationError;
            }

            var secondaryUnit = string.IsNullOrWhiteSpace(request.SecondaryUnit) ? null : request.SecondaryUnit.Trim();
            product.Name = request.Name.Trim();
            product.SKU = request.SKU.Trim();
            product.CategoryId = request.CategoryId;
            product.SupplierId = request.SupplierId;
            product.PurchasePrice = request.PurchasePrice;
            product.MinimumSellingPrice = request.MinimumSellingPrice;
            product.StockQuantity = request.StockQuantity;
            product.LowStockLevel = request.LowStockLevel;
            product.Unit = string.IsNullOrWhiteSpace(request.Unit) ? "pcs" : request.Unit.Trim();
            product.SecondaryUnit = secondaryUnit;
            product.SecondaryUnitFactor = secondaryUnit == null ? 0 : request.SecondaryUnitFactor;
            product.SecondaryUnitPrice = secondaryUnit == null ? 0 : request.SecondaryUnitPrice;
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

        [HttpPost("stock-take")]
        [Authorize(Roles = "Admin,Manager")]
        public async Task<ActionResult<StockTakeResponseDto>> StockTake([FromBody] StockTakeRequestDto request)
        {
            var currentUserId = GetCurrentUserId();
            if (currentUserId == null)
            {
                return Unauthorized();
            }

            var response = new StockTakeResponseDto();
            if (request.Items == null || request.Items.Count == 0)
            {
                return Ok(response);
            }

            var ids = request.Items.Select(item => item.ProductId).Distinct().ToList();
            var products = await _context.Products
                .Where(product => ids.Contains(product.Id))
                .ToDictionaryAsync(product => product.Id);

            var now = DateTime.Now;
            await using var transaction = await _context.Database.BeginTransactionAsync();

            foreach (var item in request.Items)
            {
                if (item.CountedQuantity < 0) continue;
                if (!products.TryGetValue(item.ProductId, out var product)) continue;
                if (item.CountedQuantity == product.StockQuantity) continue;

                var oldQuantity = product.StockQuantity;

                _context.StockLogs.Add(new StockLog
                {
                    ProductId = product.Id,
                    OldQuantity = oldQuantity,
                    NewQuantity = item.CountedQuantity,
                    ChangeAmount = item.CountedQuantity - oldQuantity,
                    Reason = "Stock-take reconciliation",
                    ChangedByUserId = currentUserId.Value,
                    CreatedAt = now
                });

                product.StockQuantity = item.CountedQuantity;
                product.UpdatedAt = now;

                response.Variances.Add(new StockTakeVarianceDto
                {
                    ProductId = product.Id,
                    Name = product.Name,
                    SKU = product.SKU,
                    SystemQuantity = oldQuantity,
                    CountedQuantity = item.CountedQuantity,
                    Variance = item.CountedQuantity - oldQuantity
                });
                response.AdjustedCount++;
            }

            await _context.SaveChangesAsync();
            await transaction.CommitAsync();

            return Ok(response);
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

        [HttpPost("{id:int}/reactivate")]
        [Authorize(Roles = "Admin,Manager")]
        public async Task<IActionResult> Reactivate(int id)
        {
            var product = await _context.Products.FirstOrDefaultAsync(item => item.Id == id);
            if (product == null)
            {
                return NotFound();
            }

            product.IsActive = true;
            product.UpdatedAt = DateTime.Now;
            await _context.SaveChangesAsync();

            return NoContent();
        }

        [HttpPost("import")]
        [Authorize(Roles = "Admin,Manager")]
        public async Task<ActionResult<ImportProductsResponseDto>> Import([FromBody] ImportProductsRequestDto request)
        {
            var response = new ImportProductsResponseDto();
            if (request.Rows == null || request.Rows.Count == 0)
            {
                return Ok(response);
            }

            var now = DateTime.Now;

            var categories = (await _context.Categories.ToListAsync())
                .ToDictionary(category => category.Name.ToLowerInvariant(), category => category);
            var suppliers = (await _context.Suppliers.ToListAsync())
                .GroupBy(supplier => supplier.Name.ToLowerInvariant())
                .ToDictionary(group => group.Key, group => group.First());
            var existingSkus = (await _context.Products.Select(product => product.SKU).ToListAsync())
                .Select(sku => sku.ToLowerInvariant())
                .ToHashSet();
            var batchSkus = new HashSet<string>();

            for (var index = 0; index < request.Rows.Count; index++)
            {
                var row = request.Rows[index];
                var rowNumber = index + 1;
                var name = (row.Name ?? string.Empty).Trim();
                var sku = (row.SKU ?? string.Empty).Trim();
                var categoryName = (row.CategoryName ?? string.Empty).Trim();
                var supplierName = (row.SupplierName ?? string.Empty).Trim();

                string? error = null;
                if (name.Length == 0) error = "Name is required.";
                else if (sku.Length == 0) error = "SKU is required.";
                else if (categoryName.Length == 0) error = "Category is required.";
                else if (row.PurchasePrice < 0) error = "Purchase price must be 0 or more.";
                else if (row.MinimumSellingPrice < row.PurchasePrice) error = "Minimum selling price must be greater than or equal to purchase price.";
                else if (row.StockQuantity < 0) error = "Stock quantity must be 0 or more.";
                else if (row.LowStockLevel < 0) error = "Low-stock level must be 0 or more.";

                if (error != null)
                {
                    response.Errors.Add(new ImportProductErrorDto { RowNumber = rowNumber, SKU = sku, Message = error });
                    continue;
                }

                var skuLower = sku.ToLowerInvariant();
                if (existingSkus.Contains(skuLower) || batchSkus.Contains(skuLower))
                {
                    response.SkippedCount++;
                    continue;
                }

                if (!categories.TryGetValue(categoryName.ToLowerInvariant(), out var category))
                {
                    category = new Category { Name = categoryName, IsActive = true, CreatedAt = now, UpdatedAt = now };
                    _context.Categories.Add(category);
                    categories[categoryName.ToLowerInvariant()] = category;
                }

                Supplier? supplier = null;
                if (supplierName.Length > 0)
                {
                    if (!suppliers.TryGetValue(supplierName.ToLowerInvariant(), out supplier))
                    {
                        supplier = new Supplier { Name = supplierName, IsActive = true, CreatedAt = now, UpdatedAt = now };
                        _context.Suppliers.Add(supplier);
                        suppliers[supplierName.ToLowerInvariant()] = supplier;
                    }
                }

                _context.Products.Add(new Product
                {
                    Name = name,
                    SKU = sku,
                    Category = category,
                    Supplier = supplier,
                    PurchasePrice = row.PurchasePrice,
                    MinimumSellingPrice = row.MinimumSellingPrice,
                    StockQuantity = row.StockQuantity,
                    LowStockLevel = row.LowStockLevel,
                    IsActive = true,
                    CreatedAt = now,
                    UpdatedAt = now
                });

                batchSkus.Add(skuLower);
                response.CreatedCount++;
            }

            await _context.SaveChangesAsync();
            return Ok(response);
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
                    Unit = product.Unit,
                    SecondaryUnit = product.SecondaryUnit,
                    SecondaryUnitFactor = product.SecondaryUnitFactor,
                    SecondaryUnitPrice = product.SecondaryUnitPrice,
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
                    Unit = product.Unit,
                    SecondaryUnit = product.SecondaryUnit,
                    SecondaryUnitFactor = product.SecondaryUnitFactor,
                    SecondaryUnitPrice = product.SecondaryUnitPrice,
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

        private ActionResult? ValidateUnits(string? secondaryUnit, int secondaryUnitFactor)
        {
            if (string.IsNullOrWhiteSpace(secondaryUnit))
            {
                return null;
            }

            if (secondaryUnitFactor < 2)
            {
                return BadRequest(new { message = "A bulk unit must contain at least 2 base units." });
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