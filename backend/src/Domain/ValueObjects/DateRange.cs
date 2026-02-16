namespace CleanArchitecture.Domain.ValueObjects;

public class DateRange : ValueObject
{
    public DateTime Start { get; private set; }
    public DateTime End { get; private set; }

    private DateRange() { } // EF Core

    public DateRange(DateTime start, DateTime end)
    {
        if (end <= start)
        {
            throw new ArgumentException("End date must be after start date.", nameof(end));
        }

        Start = start;
        End = end;
    }

    public int Days => (End - Start).Days;

    protected override IEnumerable<object> GetEqualityComponents()
    {
        yield return Start;
        yield return End;
    }
}
