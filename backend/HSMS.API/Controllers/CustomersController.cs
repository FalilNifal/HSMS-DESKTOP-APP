using HSMS.API.Data;
using HSMS.API.DTOs.Customers;
using HSMS.API.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace HSMS.API.Controllers
{
    [ApiController]
    [Route("api/customers")]
    [Authorize]
    public class CustomersController : ControllerBase
    {
        private readonly AppDbContext _context;

        public CustomersController(AppDbContext context)
        {
            _context = context;
        }

        // Any authenticated user (POS needs to pick a customer for credit sales).
        [HttpGet]
        public async Task<ActionResult<IEnumerable<CustomerResponseDto>>> GetAll()
        {
            var customers = await _context.Customers
                .OrderBy(customer => customer.Name)
                .ToListAsync();

            return Ok(customers.Select(ToResponse));
        }

        [HttpGet("{id:int}")]
        public async Task<ActionResult<CustomerResponseDto>> GetById(int id)
        {
            var customer = await _context.Customers.FirstOrDefaultAsync(item => item.Id == id);
            if (customer == null)
            {
                return NotFound();
            }

            return Ok(ToResponse(customer));
        }

        [HttpGet("{id:int}/ledger")]
        public async Task<ActionResult<CustomerLedgerDto>> GetLedger(int id)
        {
            var customer = await _context.Customers.FirstOrDefaultAsync(item => item.Id == id);
            if (customer == null)
            {
                return NotFound();
            }

            var creditSales = await _context.Sales
                .Where(sale => sale.CustomerId == id && sale.PaymentMethod == "Credit")
                .Select(sale => new LedgerEntryDto
                {
                    Date = sale.CreatedAt,
                    Type = "Credit sale",
                    Reference = sale.InvoiceNumber,
                    Charge = sale.TotalAmount,
                    Payment = 0
                })
                .ToListAsync();

            var payments = await _context.CustomerPayments
                .Where(payment => payment.CustomerId == id)
                .Select(payment => new LedgerEntryDto
                {
                    Date = payment.CreatedAt,
                    Type = "Payment",
                    Reference = payment.Method + (payment.Note != null ? " · " + payment.Note : string.Empty),
                    Charge = 0,
                    Payment = payment.Amount
                })
                .ToListAsync();

            var entries = creditSales
                .Concat(payments)
                .OrderByDescending(entry => entry.Date)
                .ToList();

            return Ok(new CustomerLedgerDto
            {
                CustomerId = customer.Id,
                Name = customer.Name,
                OutstandingBalance = customer.OutstandingBalance,
                Entries = entries
            });
        }

        [HttpPost]
        [Authorize(Roles = "Admin,Manager")]
        public async Task<ActionResult<CustomerResponseDto>> Create([FromBody] CustomerRequestDto request)
        {
            if (string.IsNullOrWhiteSpace(request.Name))
            {
                return BadRequest(new { message = "Customer name is required." });
            }

            var now = DateTime.Now;
            var customer = new Customer
            {
                Name = request.Name.Trim(),
                PhoneNumber = request.PhoneNumber?.Trim(),
                Address = request.Address?.Trim(),
                CreditLimit = request.CreditLimit,
                OutstandingBalance = 0,
                Notes = request.Notes?.Trim(),
                IsActive = true,
                CreatedAt = now,
                UpdatedAt = now
            };

            _context.Customers.Add(customer);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetById), new { id = customer.Id }, ToResponse(customer));
        }

        [HttpPut("{id:int}")]
        [Authorize(Roles = "Admin,Manager")]
        public async Task<IActionResult> Update(int id, [FromBody] CustomerRequestDto request)
        {
            var customer = await _context.Customers.FirstOrDefaultAsync(item => item.Id == id);
            if (customer == null)
            {
                return NotFound();
            }

            if (string.IsNullOrWhiteSpace(request.Name))
            {
                return BadRequest(new { message = "Customer name is required." });
            }

            customer.Name = request.Name.Trim();
            customer.PhoneNumber = request.PhoneNumber?.Trim();
            customer.Address = request.Address?.Trim();
            customer.CreditLimit = request.CreditLimit;
            customer.Notes = request.Notes?.Trim();
            customer.UpdatedAt = DateTime.Now;

            await _context.SaveChangesAsync();
            return NoContent();
        }

        [HttpDelete("{id:int}")]
        [Authorize(Roles = "Admin,Manager")]
        public async Task<IActionResult> Deactivate(int id)
        {
            var customer = await _context.Customers.FirstOrDefaultAsync(item => item.Id == id);
            if (customer == null)
            {
                return NotFound();
            }

            customer.IsActive = false;
            customer.UpdatedAt = DateTime.Now;
            await _context.SaveChangesAsync();

            return NoContent();
        }

        [HttpPost("{id:int}/reactivate")]
        [Authorize(Roles = "Admin,Manager")]
        public async Task<IActionResult> Reactivate(int id)
        {
            var customer = await _context.Customers.FirstOrDefaultAsync(item => item.Id == id);
            if (customer == null)
            {
                return NotFound();
            }

            customer.IsActive = true;
            customer.UpdatedAt = DateTime.Now;
            await _context.SaveChangesAsync();

            return NoContent();
        }

        [HttpPost("{id:int}/payments")]
        [Authorize(Roles = "Admin,Manager,Cashier")]
        public async Task<ActionResult<CustomerResponseDto>> RecordPayment(int id, [FromBody] RecordPaymentRequestDto request)
        {
            if (request.Amount <= 0)
            {
                return BadRequest(new { message = "Payment amount must be greater than 0." });
            }

            var customer = await _context.Customers.FirstOrDefaultAsync(item => item.Id == id);
            if (customer == null)
            {
                return NotFound();
            }

            var userId = GetCurrentUserId();
            if (userId == null)
            {
                return Unauthorized();
            }

            var now = DateTime.Now;
            _context.CustomerPayments.Add(new CustomerPayment
            {
                CustomerId = customer.Id,
                Amount = request.Amount,
                Method = string.IsNullOrWhiteSpace(request.Method) ? "Cash" : request.Method.Trim(),
                Note = request.Note?.Trim(),
                ReceivedByUserId = userId.Value,
                CreatedAt = now
            });

            customer.OutstandingBalance -= request.Amount;
            customer.UpdatedAt = now;

            await _context.SaveChangesAsync();
            return Ok(ToResponse(customer));
        }

        private int? GetCurrentUserId()
        {
            var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
            return int.TryParse(userIdClaim, out var userId) ? userId : null;
        }

        private static CustomerResponseDto ToResponse(Customer customer) => new()
        {
            Id = customer.Id,
            Name = customer.Name,
            PhoneNumber = customer.PhoneNumber,
            Address = customer.Address,
            CreditLimit = customer.CreditLimit,
            OutstandingBalance = customer.OutstandingBalance,
            Notes = customer.Notes,
            IsActive = customer.IsActive,
            CreatedAt = customer.CreatedAt,
            UpdatedAt = customer.UpdatedAt
        };
    }
}
