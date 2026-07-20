namespace HSMS.API.DTOs.Products
{
    public class ImportProductsResponseDto
    {
        public int CreatedCount { get; set; }

        public int SkippedCount { get; set; }

        public List<ImportProductErrorDto> Errors { get; set; } = new();
    }
}
