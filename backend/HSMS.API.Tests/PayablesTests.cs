using HSMS.API.Controllers;
using HSMS.API.DTOs.Suppliers;
using HSMS.API.Tests.Infrastructure;
using Xunit;

namespace HSMS.API.Tests;

public class PayablesTests
{
    [Fact]
    public async Task Bill_raises_balance_and_payment_lowers_it()
    {
        using var h = new Harness();

        var afterBill = await new SuppliersController(h.Db).AsUser(h.AdminUserId, "Admin")
            .AddBill(h.SupplierId, new CreateSupplierBillRequestDto { Amount = 10000, BillNumber = "B-1" });
        Assert.Equal(200, afterBill.StatusCode());
        Assert.Equal(10000m, afterBill.Value<SupplierResponseDto>()!.OutstandingBalance);

        var afterPayment = await new SuppliersController(h.Db).AsUser(h.AdminUserId, "Admin")
            .AddPayment(h.SupplierId, new CreateSupplierPaymentRequestDto { Amount = 4000, PaymentMethod = "Cash" });
        Assert.Equal(200, afterPayment.StatusCode());
        Assert.Equal(6000m, afterPayment.Value<SupplierResponseDto>()!.OutstandingBalance);
    }
}
