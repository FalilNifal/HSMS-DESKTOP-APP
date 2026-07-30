using HSMS.API.Controllers;
using HSMS.API.DTOs.Sales;
using HSMS.API.Tests.Infrastructure;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace HSMS.API.Tests;

public class SalesTests
{
    private static CreateSaleRequestDto Sale(string method, int? customerId, params CreateSaleItemRequestDto[] items)
        => new() { PaymentMethod = method, CustomerId = customerId, Items = items.ToList() };

    private static CreateSaleItemRequestDto Item(int productId, int qty, decimal price, int unitFactor = 1, string? unitLabel = null)
        => new() { ProductId = productId, Quantity = qty, ActualSellingPrice = price, UnitFactor = unitFactor, UnitLabel = unitLabel };

    [Fact]
    public async Task Sale_deducts_stock_and_computes_total_and_profit()
    {
        using var h = new Harness();
        var p = h.AddProduct(purchasePrice: 100, minSellingPrice: 120, stock: 50);
        var controller = new SalesController(h.Db).AsUser(h.AdminUserId, "Admin");

        var result = await controller.Create(Sale("Cash", null, Item(p.Id, 3, 150)));

        Assert.Equal(201, result.StatusCode());
        var sale = result.Value<SaleResponseDto>()!;
        Assert.Equal(450m, sale.TotalAmount);          // 3 * 150
        Assert.Equal(150m, sale.TotalProfit);          // (150 - 100) * 3
        Assert.Equal(47, h.Reload(p.Id).StockQuantity); // 50 - 3
    }

    [Fact]
    public async Task Bulk_unit_sale_deducts_base_units_and_records_unit_label()
    {
        using var h = new Harness();
        // 12 pcs per box; sell 2 boxes at 1560 each.
        var p = h.AddProduct(100, 120, 100, "pcs", "box", 12, 1560);
        var controller = new SalesController(h.Db).AsUser(h.AdminUserId, "Admin");

        var result = await controller.Create(Sale("Cash", null, Item(p.Id, 2, 1560, unitFactor: 12, unitLabel: "box")));

        Assert.Equal(201, result.StatusCode());
        var sale = result.Value<SaleResponseDto>()!;
        Assert.Equal(3120m, sale.TotalAmount);              // 2 * 1560
        Assert.Equal(720m, sale.TotalProfit);               // (1560 - 100*12) * 2
        Assert.Equal(76, h.Reload(p.Id).StockQuantity);     // 100 - 2*12
        Assert.Equal("box", sale.Items[0].UnitLabel);
    }

    [Fact]
    public async Task Rejects_bulk_price_below_min_times_factor()
    {
        using var h = new Harness();
        var p = h.AddProduct(100, 120, 100, "pcs", "box", 12, 1560); // min per box = 120*12 = 1440
        var controller = new SalesController(h.Db).AsUser(h.AdminUserId, "Admin");

        var result = await controller.Create(Sale("Cash", null, Item(p.Id, 1, 1000, unitFactor: 12, unitLabel: "box")));

        Assert.Equal(400, result.StatusCode());
        Assert.Equal(100, h.Reload(p.Id).StockQuantity); // unchanged
    }

    [Fact]
    public async Task Rejects_insufficient_stock()
    {
        using var h = new Harness();
        var p = h.AddProduct(100, 120, 10, "pcs", "box", 12, 1560);
        var controller = new SalesController(h.Db).AsUser(h.AdminUserId, "Admin");

        var result = await controller.Create(Sale("Cash", null, Item(p.Id, 1, 1560, unitFactor: 12, unitLabel: "box")));

        Assert.Equal(400, result.StatusCode());
        Assert.Equal(10, h.Reload(p.Id).StockQuantity);
    }

    [Fact]
    public async Task Applies_tax_to_total()
    {
        using var h = new Harness();
        h.SetTax(10, "VAT");
        var p = h.AddProduct(50, 100, 20);
        var controller = new SalesController(h.Db).AsUser(h.AdminUserId, "Admin");

        var result = await controller.Create(Sale("Cash", null, Item(p.Id, 1, 100)));

        Assert.Equal(201, result.StatusCode());
        var sale = result.Value<SaleResponseDto>()!;
        Assert.Equal(110m, sale.TotalAmount); // 100 + 10% tax
    }

    [Fact]
    public async Task Credit_sale_requires_a_customer()
    {
        using var h = new Harness();
        var p = h.AddProduct(50, 100, 20);
        var controller = new SalesController(h.Db).AsUser(h.AdminUserId, "Admin");

        var result = await controller.Create(Sale("Credit", null, Item(p.Id, 1, 100)));

        Assert.Equal(400, result.StatusCode());
    }

    [Fact]
    public async Task Credit_sale_increments_balance_and_enforces_limit()
    {
        using var h = new Harness();
        var customer = h.AddCustomer(creditLimit: 1000);
        var p = h.AddProduct(50, 100, 100);

        var first = await new SalesController(h.Db).AsUser(h.AdminUserId, "Admin")
            .Create(Sale("Credit", customer.Id, Item(p.Id, 5, 100))); // 500
        Assert.Equal(201, first.StatusCode());
        Assert.Equal(500m, h.Db.Customers.AsNoTracking().First(c => c.Id == customer.Id).OutstandingBalance);

        var second = await new SalesController(h.Db).AsUser(h.AdminUserId, "Admin")
            .Create(Sale("Credit", customer.Id, Item(p.Id, 6, 100))); // +600 -> 1100 > 1000
        Assert.Equal(400, second.StatusCode());
        Assert.Equal(500m, h.Db.Customers.AsNoTracking().First(c => c.Id == customer.Id).OutstandingBalance); // unchanged
    }
}
