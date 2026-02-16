using CleanArchitecture.Domain.Enums;
using FluentValidation;

namespace CleanArchitecture.Application.Expenses.Commands.CreateExpense;

public class CreateExpenseCommandValidator : AbstractValidator<CreateExpenseCommand>
{
    public CreateExpenseCommandValidator()
    {
        RuleFor(v => v.Amount)
            .GreaterThan(0);

        RuleFor(v => v.Description)
            .NotEmpty()
            .MaximumLength(200);

        RuleFor(v => v.Vendor)
            .MaximumLength(120);

        RuleFor(v => v.CurrencyOther)
            .MaximumLength(12)
            .NotEmpty().When(v => v.CurrencyCode == CurrencyCode.Other)
            .Empty().When(v => v.CurrencyCode != CurrencyCode.Other);
            
        RuleFor(v => v.BusinessDate)
            .NotEmpty();
    }
}
