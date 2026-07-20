namespace HSMS.API.DTOs.Reports
{
    public class InventoryValueReportDto
    {
        /// <summary>Total value of current stock at purchase (cost) price.</summary>
        public decimal TotalCostValue { get; set; }

        /// <summary>Total value of current stock at minimum selling price.</summary>
        public decimal TotalRetailValue { get; set; }

        public int ProductCount { get; set; }

        public int TotalUnits { get; set; }
    }
}
