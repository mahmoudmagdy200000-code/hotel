using CleanArchitecture.Domain.Common;
using CleanArchitecture.Domain.Enums;

namespace CleanArchitecture.Domain.Entities;

public class Expense : BaseAuditableEntity
{
    public Guid BranchId { get; set; }
    private decimal _amount;
    private string _description = string.Empty;
    private string? _vendor;
    private string? _currencyOther;

    public DateOnly BusinessDate { get; set; }
    public ExpenseCategory Category { get; set; }
    
    public decimal Amount
    {
        get => _amount;
        set
        {
            if (value <= 0) throw new ArgumentException("Amount must be greater than zero.");
            _amount = value;
        }
    }

    public CurrencyCode CurrencyCode { get; set; }
    
    public string? CurrencyOther
    {
        get => _currencyOther;
        set
        {
            if (CurrencyCode == CurrencyCode.Other && string.IsNullOrWhiteSpace(value))
                throw new ArgumentException("CurrencyOther is required when CurrencyCode is Other.");
            
            if (value != null && value.Length > 12)
                throw new ArgumentException("CurrencyOther must be 12 characters or less.");
                
            _currencyOther = value;
        }
    }

    public PaymentMethod PaymentMethod { get; set; }
    
    public string Description
    {
        get => _description;
        set
        {
            if (string.IsNullOrWhiteSpace(value)) throw new ArgumentException("Description is required.");
            if (value.Length > 200) throw new ArgumentException("Description must be 200 characters or less.");
            _description = value;
        }
    }

    public string? Vendor
    {
        get => _vendor;
        set
        {
            if (value != null && value.Length > 120)
                throw new ArgumentException("Vendor must be 120 characters or less.");
            _vendor = value;
        }
    }
}
