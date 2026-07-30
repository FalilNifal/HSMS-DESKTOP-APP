using HSMS.API.Controllers;
using HSMS.API.DTOs.Quotations;
using HSMS.API.Tests.Infrastructure;
using Xunit;

namespace HSMS.API.Tests;

public class QuotationsTests
{
    private static CreateQuotationRequestDto Quote(int? customerId, params CreateQuotationItemRequestDto[] items)
        => new() { CustomerId = customerId, Items = items.ToList() };

    private static CreateQuotationItemRequestDto QItem(int productId, int qty, decimal price, int factor = 1, string? label = null)
        => new() { ProductId = productId, Quantity = qty, UnitPrice = price, UnitFactor = factor, UnitLabel = label };

    [Fact]
    public async Task Create_computes_total_and_is_open()
    {
        using var h = new Harness();
        var p = h.AddProduct(50, 100, 20);
        var controller = new QuotationsController(h.Db).AsUser(h.AdminUserId, "Admin");

        var result = await controller.Create(Quote(null, QItem(p.Id, 3, 120)));

        Assert.Equal(201, result.StatusCode());
        var q = result.Value<QuotationResponseDto>()!;
        Assert.Equal(360m, q.TotalAmount);
        Assert.Equal("Open", q.Status);
    }

    [Fact]
    public async Task Convert_deducts_stock_and_marks_converted()
    {
        using var h = new Harness();
        var p = h.AddProduct(50, 100, 20);
        var qid = (await new QuotationsController(h.Db).AsUser(h.AdminUserId, "Admin")
            .Create(Quote(null, QItem(p.Id, 4, 120)))).Value<QuotationResponseDto>()!.Id;

        var conv = await new QuotationsController(h.Db).AsUser(h.AdminUserId, "Admin")
            .Convert(qid, new ConvertQuotationRequestDto { PaymentMethod = "Cash" });

        Assert.Equal(200, conv.StatusCode());
        var q = conv.Value<QuotationResponseDto>()!;
        Assert.Equal("Converted", q.Status);
        Assert.NotNull(q.ConvertedSaleId);
        Assert.Equal(16, h.Reload(p.Id).StockQuantity); // 20 - 4
    }

    [Fact]
    public async Task Convert_twice_is_rejected()
    {
        using var h = new Harness();
        var p = h.AddProduct(50, 100, 20);
        var qid = (await new QuotationsController(h.Db).AsUser(h.AdminUserId, "Admin")
            .Create(Quote(null, QItem(p.Id, 2, 120)))).Value<QuotationResponseDto>()!.Id;

        await new QuotationsController(h.Db).AsUser(h.AdminUserId, "Admin")
            .Convert(qid, new ConvertQuotationRequestDto { PaymentMethod = "Cash" });
        var second = await new QuotationsController(h.Db).AsUser(h.AdminUserId, "Admin")
            .Convert(qid, new ConvertQuotationRequestDto { PaymentMethod = "Cash" });

        Assert.Equal(400, second.StatusCode());
    }
}
