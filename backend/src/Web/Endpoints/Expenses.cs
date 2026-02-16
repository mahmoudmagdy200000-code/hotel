using CleanArchitecture.Application.Expenses.Commands.CreateExpense;
using CleanArchitecture.Application.Expenses.Queries;
using CleanArchitecture.Application.Expenses.Queries.GetExpenseById;
using CleanArchitecture.Application.Expenses.Queries.GetExpenses;
using Microsoft.AspNetCore.Http.HttpResults;

namespace CleanArchitecture.Web.Endpoints;

public class Expenses : EndpointGroupBase
{
    public override string? GroupName => "expenses";

    public override void Map(RouteGroupBuilder group)
    {
        group.RequireAuthorization();

        group.MapGet("", GetExpenses);
        group.MapGet("{id}", GetExpenseById);
        group.MapPost(CreateExpense);
    }

    public async Task<Ok<List<ExpenseDto>>> GetExpenses(ISender sender, [AsParameters] GetExpensesQuery query)
    {
        return TypedResults.Ok(await sender.Send(query));
    }

    public async Task<Results<Ok<ExpenseDto>, NotFound>> GetExpenseById(ISender sender, int id)
    {
        var item = await sender.Send(new GetExpenseByIdQuery(id));
        return TypedResults.Ok(item);
    }

    public async Task<Created<ExpenseDto>> CreateExpense(ISender sender, CreateExpenseCommand command)
    {
        var result = await sender.Send(command);
        return TypedResults.Created($"/api/expenses/{result.Id}", result);
    }
}
