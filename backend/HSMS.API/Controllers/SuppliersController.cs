using HSMS.API.Data;
using HSMS.API.DTOs.Suppliers;
using HSMS.API.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HSMS.API.Controllers
{
    [ApiController]
    [Route("api/suppliers")]
    [Authorize(Roles = "Admin,Manager")]
    public class SuppliersController : ControllerBase
    {
        private readonly AppDbContext _context;

        public SuppliersController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<SupplierResponseDto>>> GetAll()
        {
            var suppliers = await _context.Suppliers
                .OrderBy(supplier => supplier.Name)
                .Select(supplier => new SupplierResponseDto
                {
                    Id = supplier.Id,
                    Name = supplier.Name,
                    ContactPerson = supplier.ContactPerson,
                    PhoneNumber = supplier.PhoneNumber,
                    Address = supplier.Address,
                    IsActive = supplier.IsActive,
                    CreatedAt = supplier.CreatedAt,
                    UpdatedAt = supplier.UpdatedAt
                })
                .ToListAsync();

            return Ok(suppliers);
        }

        [HttpGet("{id:int}")]
        public async Task<ActionResult<SupplierResponseDto>> GetById(int id)
        {
            var supplier = await _context.Suppliers.FirstOrDefaultAsync(item => item.Id == id);
            if (supplier == null)
            {
                return NotFound();
            }

            return Ok(ToResponse(supplier));
        }

        [HttpPost]
        public async Task<ActionResult<SupplierResponseDto>> Create([FromBody] CreateSupplierRequestDto request)
        {
            var now = DateTime.Now;
            var supplier = new Supplier
            {
                Name = request.Name.Trim(),
                ContactPerson = request.ContactPerson?.Trim(),
                PhoneNumber = request.PhoneNumber?.Trim(),
                Address = request.Address?.Trim(),
                IsActive = true,
                CreatedAt = now,
                UpdatedAt = now
            };

            _context.Suppliers.Add(supplier);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetById), new { id = supplier.Id }, ToResponse(supplier));
        }

        [HttpPut("{id:int}")]
        public async Task<IActionResult> Update(int id, [FromBody] UpdateSupplierRequestDto request)
        {
            var supplier = await _context.Suppliers.FirstOrDefaultAsync(item => item.Id == id);
            if (supplier == null)
            {
                return NotFound();
            }

            supplier.Name = request.Name.Trim();
            supplier.ContactPerson = request.ContactPerson?.Trim();
            supplier.PhoneNumber = request.PhoneNumber?.Trim();
            supplier.Address = request.Address?.Trim();
            supplier.UpdatedAt = DateTime.Now;

            await _context.SaveChangesAsync();
            return NoContent();
        }

        [HttpDelete("{id:int}")]
        public async Task<IActionResult> Deactivate(int id)
        {
            var supplier = await _context.Suppliers.FirstOrDefaultAsync(item => item.Id == id);
            if (supplier == null)
            {
                return NotFound();
            }

            supplier.IsActive = false;
            supplier.UpdatedAt = DateTime.Now;
            await _context.SaveChangesAsync();

            return NoContent();
        }

        private static SupplierResponseDto ToResponse(Supplier supplier)
        {
            return new SupplierResponseDto
            {
                Id = supplier.Id,
                Name = supplier.Name,
                ContactPerson = supplier.ContactPerson,
                PhoneNumber = supplier.PhoneNumber,
                Address = supplier.Address,
                IsActive = supplier.IsActive,
                CreatedAt = supplier.CreatedAt,
                UpdatedAt = supplier.UpdatedAt
            };
        }
    }
}