using HSMS.API.Controllers;
using HSMS.API.DTOs.Expenses;
using HSMS.API.DTOs.Reports;
using HSMS.API.DTOs.Sales;
using HSMS.API.Tests.Infrastructure;
using Xunit;

namespace HSMS.API.Tests;

public class ZReportTests
{
    [Fact]
    public async Task Reconciles_expected_cash_from_sales_and_expenses()
    {
        using var h = new Harness();
        var p = h.AddProduct(50, 100, 100);

        // Cash sale of 300
        await new SalesController(h.Db).AsUser(h.AdminUserId, "Admin").Create(new CreateSaleRequestDto
        {
            PaymentMethod = "Cash",
            Items = new() { new() { ProductId = p.Id, Quantity = 3, ActualSellingPrice = 100 } }
        });

        // Cash expense of 50
        await new ExpensesController(h.Db).AsUser(h.AdminUserId, "Admin").Create(new CreateExpenseRequestDto
        {
            Category = "Rent",
            Amount = 50,
            PaymentMethod = "Cash"
        });

        var result = await new ReportsController(h.Db).AsUser(h.AdminUserId, "Admin").GetZReport(DateTime.Now);

        Assert.Equal(200, result.StatusCode());
        var z = result.Value<ZReportDto>()!;
        Assert.Equal(300m, z.CashSales);
        Assert.Equal(50m, z.ExpensesCash);
        Assert.Equal(250m, z.ExpectedCashInDrawer); // 300 cash in - 50 cash out
    }
}
