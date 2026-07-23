using HSMS.API.Data;
using HSMS.API.DTOs.Suppliers;
using HSMS.API.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

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
                    OutstandingBalance = supplier.OutstandingBalance,
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

        [HttpPost("{id:int}/reactivate")]
        public async Task<IActionResult> Reactivate(int id)
        {
            var supplier = await _context.Suppliers.FirstOrDefaultAsync(item => item.Id == id);
            if (supplier == null)
            {
                return NotFound();
            }

            supplier.IsActive = true;
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
                OutstandingBalance = supplier.OutstandingBalance,
                IsActive = supplier.IsActive,
                CreatedAt = supplier.CreatedAt,
                UpdatedAt = supplier.UpdatedAt
            };
        }

        [HttpGet("payables")]
        public async Task<ActionResult<IEnumerable<SupplierResponseDto>>> Payables()
        {
            var suppliers = await _context.Suppliers
                .Where(supplier => supplier.OutstandingBalance != 0)
                .OrderByDescending(supplier => supplier.OutstandingBalance)
                .ToListAsync();

            return Ok(suppliers.Select(ToResponse).ToList());
        }

        [HttpPost("{id:int}/bills")]
        public async Task<ActionResult<SupplierResponseDto>> AddBill(int id, [FromBody] CreateSupplierBillRequestDto request)
        {
            var currentUserId = GetCurrentUserId();
            if (currentUserId == null)
            {
                return Unauthorized();
            }

            var supplier = await _context.Suppliers.FirstOrDefaultAsync(item => item.Id == id);
            if (supplier == null)
            {
                return NotFound();
            }

            if (request.Amount <= 0)
            {
                return BadRequest(new { message = "Amount must be greater than 0." });
            }

            var now = DateTime.Now;
            _context.SupplierBills.Add(new SupplierBill
            {
                SupplierId = supplier.Id,
                BillNumber = request.BillNumber?.Trim() ?? string.Empty,
                Amount = request.Amount,
                BillDate = (request.BillDate ?? now).Date,
                Notes = request.Notes?.Trim() ?? string.Empty,
                CreatedByUserId = currentUserId.Value,
                CreatedAt = now
            });

            supplier.OutstandingBalance += request.Amount;
            supplier.UpdatedAt = now;

            await _context.SaveChangesAsync();
            return Ok(ToResponse(supplier));
        }

        [HttpPost("{id:int}/payments")]
        public async Task<ActionResult<SupplierResponseDto>> AddPayment(int id, [FromBody] CreateSupplierPaymentRequestDto request)
        {
            var currentUserId = GetCurrentUserId();
            if (currentUserId == null)
            {
                return Unauthorized();
            }

            var supplier = await _context.Suppliers.FirstOrDefaultAsync(item => item.Id == id);
            if (supplier == null)
            {
                return NotFound();
            }

            if (request.Amount <= 0)
            {
                return BadRequest(new { message = "Amount must be greater than 0." });
            }

            var now = DateTime.Now;
            _context.SupplierPayments.Add(new SupplierPayment
            {
                SupplierId = supplier.Id,
                Amount = request.Amount,
                PaymentMethod = string.IsNullOrWhiteSpace(request.PaymentMethod) ? "Cash" : request.PaymentMethod.Trim(),
                PaymentDate = (request.PaymentDate ?? now).Date,
                Notes = request.Notes?.Trim() ?? string.Empty,
                CreatedByUserId = currentUserId.Value,
                CreatedAt = now
            });

            supplier.OutstandingBalance -= request.Amount;
            supplier.UpdatedAt = now;

            await _context.SaveChangesAsync();
            return Ok(ToResponse(supplier));
        }

        [HttpGet("{id:int}/ledger")]
        public async Task<ActionResult<SupplierLedgerDto>> Ledger(int id)
        {
            var supplier = await _context.Suppliers.FirstOrDefaultAsync(item => item.Id == id);
            if (supplier == null)
            {
                return NotFound();
            }

            var bills = await _context.SupplierBills
                .Where(bill => bill.SupplierId == id)
                .Select(bill => new SupplierLedgerEntryDto
                {
                    Type = "Bill",
                    Date = bill.BillDate,
                    Reference = bill.BillNumber,
                    Amount = bill.Amount,
                    Notes = bill.Notes
                })
                .ToListAsync();

            var payments = await _context.SupplierPayments
                .Where(payment => payment.SupplierId == id)
                .Select(payment => new SupplierLedgerEntryDto
                {
                    Type = "Payment",
                    Date = payment.PaymentDate,
                    Reference = payment.PaymentMethod,
                    Amount = payment.Amount,
                    Notes = payment.Notes
                })
                .ToListAsync();

            var entries = bills.Concat(payments)
                .OrderByDescending(entry => entry.Date)
                .ToList();

            return Ok(new SupplierLedgerDto
            {
                SupplierId = supplier.Id,
                SupplierName = supplier.Name,
                OutstandingBalance = supplier.OutstandingBalance,
                Entries = entries
            });
        }

        private int? GetCurrentUserId()
        {
            var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
            return int.TryParse(userIdClaim, out var userId) ? userId : null;
        }
    }
}