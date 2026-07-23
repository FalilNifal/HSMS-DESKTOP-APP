using System.ComponentModel.DataAnnotations;

namespace HSMS.API.DTOs.Expenses
{
    public class CreateExpenseRequestDto
    {
        [Required]
        [MaxLength(60)]
        public string Category { get; set; } = string.Empty;

        [MaxLength(250)]
        public string? Description { get; set; }

        [Range(0.01, double.MaxValue)]
        public decimal Amount { get; set; }

        [MaxLength(30)]
        public string PaymentMethod { get; set; } = "Cash";

        public DateTime? ExpenseDate { get; set; }
    }

    public class ExpenseResponseDto
    {
        public int Id { get; set; }

        public string Category { get; set; } = string.Empty;

        public string Description { get; set; } = string.Empty;

        public decimal Amount { get; set; }

        public string PaymentMethod { get; set; } = string.Empty;

        public DateTime ExpenseDate { get; set; }

        public string CreatedByUserName { get; set; } = string.Empty;

        public DateTime CreatedAt { get; set; }
    }

    public class ExpenseSummaryDto
    {
        public decimal Total { get; set; }

        public List<ExpenseCategoryTotalDto> ByCategory { get; set; } = new();
    }

    public class ExpenseCategoryTotalDto
    {
        public string Category { get; set; } = string.Empty;

        public decimal Total { get; set; }
    }
}
