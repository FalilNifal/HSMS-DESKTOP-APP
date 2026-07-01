using HSMS.API.Data;
using HSMS.API.DTOs.Categories;
using HSMS.API.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HSMS.API.Controllers
{
    [ApiController]
    [Route("api/categories")]
    [Authorize(Roles = "Admin,Manager")]
    public class CategoriesController : ControllerBase
    {
        private readonly AppDbContext _context;

        public CategoriesController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<CategoryResponseDto>>> GetAll()
        {
            var categories = await _context.Categories
                .OrderBy(category => category.Name)
                .Select(category => new CategoryResponseDto
                {
                    Id = category.Id,
                    Name = category.Name,
                    Description = category.Description,
                    IsActive = category.IsActive,
                    CreatedAt = category.CreatedAt,
                    UpdatedAt = category.UpdatedAt
                })
                .ToListAsync();

            return Ok(categories);
        }

        [HttpGet("{id:int}")]
        public async Task<ActionResult<CategoryResponseDto>> GetById(int id)
        {
            var category = await _context.Categories.FirstOrDefaultAsync(item => item.Id == id);
            if (category == null)
            {
                return NotFound();
            }

            return Ok(ToResponse(category));
        }

        [HttpPost]
        public async Task<ActionResult<CategoryResponseDto>> Create([FromBody] CreateCategoryRequestDto request)
        {
            var exists = await _context.Categories.AnyAsync(category => category.Name == request.Name);
            if (exists)
            {
                return Conflict(new { message = "Category name already exists." });
            }

            var now = DateTime.Now;
            var category = new Category
            {
                Name = request.Name.Trim(),
                Description = request.Description?.Trim(),
                IsActive = true,
                CreatedAt = now,
                UpdatedAt = now
            };

            _context.Categories.Add(category);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetById), new { id = category.Id }, ToResponse(category));
        }

        [HttpPut("{id:int}")]
        public async Task<IActionResult> Update(int id, [FromBody] UpdateCategoryRequestDto request)
        {
            var category = await _context.Categories.FirstOrDefaultAsync(item => item.Id == id);
            if (category == null)
            {
                return NotFound();
            }

            var duplicate = await _context.Categories.AnyAsync(item => item.Id != id && item.Name == request.Name);
            if (duplicate)
            {
                return Conflict(new { message = "Category name already exists." });
            }

            category.Name = request.Name.Trim();
            category.Description = request.Description?.Trim();
            category.UpdatedAt = DateTime.Now;

            await _context.SaveChangesAsync();
            return NoContent();
        }

        [HttpDelete("{id:int}")]
        public async Task<IActionResult> Deactivate(int id)
        {
            var category = await _context.Categories.FirstOrDefaultAsync(item => item.Id == id);
            if (category == null)
            {
                return NotFound();
            }

            category.IsActive = false;
            category.UpdatedAt = DateTime.Now;
            await _context.SaveChangesAsync();

            return NoContent();
        }

        private static CategoryResponseDto ToResponse(Category category)
        {
            return new CategoryResponseDto
            {
                Id = category.Id,
                Name = category.Name,
                Description = category.Description,
                IsActive = category.IsActive,
                CreatedAt = category.CreatedAt,
                UpdatedAt = category.UpdatedAt
            };
        }
    }
}