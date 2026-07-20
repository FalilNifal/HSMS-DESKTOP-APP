namespace HSMS.API.DTOs.Customers
{
    public class CustomerLedgerDto
    {
        public int CustomerId { get; set; }

        public string Name { get; set; } = string.Empty;

        public decimal OutstandingBalance { get; set; }

        public List<LedgerEntryDto> Entries { get; set; } = new();
    }
}
