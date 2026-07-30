using HSMS.API.Controllers;
using HSMS.API.DTOs.Products;
using HSMS.API.Tests.Infrastructure;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace HSMS.API.Tests;

public class StockTakeTests
{
    [Fact]
    public async Task Adjusts_only_changed_rows_sets_counted_and_logs_variance()
    {
        using var h = new Harness();
        var counted = h.AddProduct(50, 100, 20);   // will be re-counted to 15
        var unchanged = h.AddProduct(50, 100, 30);  // counted equals system -> no change

        var result = await new ProductsController(h.Db).AsUser(h.AdminUserId, "Admin").StockTake(new StockTakeRequestDto
        {
            Items = new()
            {
                new() { ProductId = counted.Id, CountedQuantity = 15 },
                new() { ProductId = unchanged.Id, CountedQuantity = 30 }
            }
        });

        Assert.Equal(200, result.StatusCode());
        var dto = result.Value<StockTakeResponseDto>()!;
        Assert.Equal(1, dto.AdjustedCount);                       // only the changed one
        Assert.Equal(-5, dto.Variances.Single().Variance);        // 15 - 20
        Assert.Equal(15, h.Reload(counted.Id).StockQuantity);
        Assert.Equal(30, h.Reload(unchanged.Id).StockQuantity);
        Assert.Contains(h.Db.StockLogs.AsNoTracking().ToList(),
            log => log.ProductId == counted.Id && log.ChangeAmount == -5);
    }
}
