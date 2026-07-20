using System.ComponentModel.DataAnnotations;

namespace HSMS.API.DTOs.Returns
{
    public class CreateReturnItemRequestDto
    {
        public int ProductId { get; set; }

        [Range(1, int.MaxValue)]
        public int Quantity { get; set; }
    }
}
