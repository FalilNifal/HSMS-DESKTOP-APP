using HSMS.API.Data;
using HSMS.API.DTOs.Settings;
using HSMS.API.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HSMS.API.Controllers
{
    [ApiController]
    [Route("api/shopsettings")]
    [Authorize]
    public class ShopSettingsController : ControllerBase
    {
        private readonly AppDbContext _context;

        public ShopSettingsController(AppDbContext context)
        {
            _context = context;
        }

        // Any authenticated user can read shop settings (needed for currency,
        // invoice header, etc. shown across the app).
        [HttpGet]
        public async Task<ActionResult<ShopSettingsResponseDto>> Get()
        {
            var settings = await GetOrCreateAsync();
            return Ok(ToResponse(settings));
        }

        [HttpPut]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<ShopSettingsResponseDto>> Update([FromBody] UpdateShopSettingsRequestDto request)
        {
            var settings = await GetOrCreateAsync();

            settings.ShopName = request.ShopName.Trim();
            settings.Address = request.Address.Trim();
            settings.PhoneNumber = request.PhoneNumber.Trim();
            settings.Currency = request.Currency.Trim();
            settings.InvoiceFooterMessage = string.IsNullOrWhiteSpace(request.InvoiceFooterMessage)
                ? "Thank you for your business!"
                : request.InvoiceFooterMessage.Trim();
            settings.TaxRatePercent = request.TaxRatePercent;
            settings.TaxLabel = string.IsNullOrWhiteSpace(request.TaxLabel) ? "Tax" : request.TaxLabel.Trim();
            settings.UpdatedAt = DateTime.Now;

            await _context.SaveChangesAsync();
            return Ok(ToResponse(settings));
        }

        private async Task<ShopSettings> GetOrCreateAsync()
        {
            var settings = await _context.ShopSettings.FirstOrDefaultAsync(item => item.Id == 1);
            if (settings == null)
            {
                settings = new ShopSettings { Id = 1, CreatedAt = DateTime.Now };
                _context.ShopSettings.Add(settings);
                await _context.SaveChangesAsync();
            }

            return settings;
        }

        private static ShopSettingsResponseDto ToResponse(ShopSettings settings) => new()
        {
            Id = settings.Id,
            ShopName = settings.ShopName,
            Address = settings.Address,
            PhoneNumber = settings.PhoneNumber,
            LogoPath = settings.LogoPath,
            Currency = settings.Currency,
            InvoiceFooterMessage = settings.InvoiceFooterMessage,
            TaxRatePercent = settings.TaxRatePercent,
            TaxLabel = settings.TaxLabel,
            CreatedAt = settings.CreatedAt,
            UpdatedAt = settings.UpdatedAt
        };
    }
}
