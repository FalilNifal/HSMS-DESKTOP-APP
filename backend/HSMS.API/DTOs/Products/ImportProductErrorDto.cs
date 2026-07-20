namespace HSMS.API.DTOs.Products
{
    public class ImportProductErrorDto
    {
        public int RowNumber { get; set; }

        public string SKU { get; set; } = string.Empty;

        public string Message { get; set; } = string.Empty;
    }
}
