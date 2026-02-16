namespace CleanArchitecture.Domain.Common;

public interface IHasDomainEvents
{
    IReadOnlyCollection<BaseEvent> DomainEvents { get; }
    void AddDomainEvent(BaseEvent domainEvent);
    void RemoveDomainEvent(BaseEvent domainEvent);
    void ClearDomainEvents();
}
