using HSMS.API.Controllers;
using HSMS.API.DTOs.Returns;
using HSMS.API.DTOs.Sales;
using HSMS.API.Tests.Infrastructure;
using Xunit;

namespace HSMS.API.Tests;

public class ReturnsTests
{
    private async Task<(Harness h, int productId, string invoice)> SellFive()
    {
        var h = new Harness();
        var p = h.AddProduct(50, 100, 20);
        var saleResult = await new SalesController(h.Db).AsUser(h.AdminUserId, "Admin").Create(new CreateSaleRequestDto
        {
            PaymentMethod = "Cash",
            Items = new() { new() { ProductId = p.Id, Quantity = 5, ActualSellingPrice = 100 } }
        });
        var invoice = saleResult.Value<SaleResponseDto>()!.InvoiceNumber;
        return (h, p.Id, invoice);
    }

    [Fact]
    public async Task Return_restocks_and_records_refund()
    {
        var (h, productId, invoice) = await SellFive();
        using (h)
        {
            Assert.Equal(15, h.Reload(productId).StockQuantity); // 20 - 5 sold

            var ret = await new ReturnsController(h.Db).AsUser(h.AdminUserId, "Admin").Create(new CreateReturnRequestDto
            {
                InvoiceNumber = invoice,
                Reason = "Damaged",
                Items = new() { new() { ProductId = productId, Quantity = 2 } }
            });

            Assert.InRange(ret.StatusCode(), 200, 299);
            var r = ret.Value<ReturnResponseDto>()!;
            Assert.Equal(200m, r.TotalRefund);                  // 2 * 100
            Assert.Equal(17, h.Reload(productId).StockQuantity); // 15 + 2 restocked
        }
    }

    [Fact]
    public async Task Returning_more_than_sold_is_rejected()
    {
        var (h, productId, invoice) = await SellFive();
        using (h)
        {
            var ret = await new ReturnsController(h.Db).AsUser(h.AdminUserId, "Admin").Create(new CreateReturnRequestDto
            {
                InvoiceNumber = invoice,
                Reason = "Too many",
                Items = new() { new() { ProductId = productId, Quantity = 6 } } // only 5 were sold
            });

            Assert.Equal(400, ret.StatusCode());
            Assert.Equal(15, h.Reload(productId).StockQuantity); // unchanged
        }
    }
}
