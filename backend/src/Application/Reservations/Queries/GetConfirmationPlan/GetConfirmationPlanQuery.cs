using System.Text.RegularExpressions;
using CleanArchitecture.Application.Common.Interfaces;
using CleanArchitecture.Application.Common.Policies;
using CleanArchitecture.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace CleanArchitecture.Application.Reservations.Queries.GetConfirmationPlan;

public record GetConfirmationPlanQuery : IRequest<ReservationAllocationPlanDto>
{
    public List<int>? ReservationIds { get; init; } // Optional: specific IDs to plan for
}

public class GetConfirmationPlanQueryHandler : IRequestHandler<GetConfirmationPlanQuery, ReservationAllocationPlanDto>
{
    private readonly IApplicationDbContext _context;

    public GetConfirmationPlanQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<ReservationAllocationPlanDto> Handle(GetConfirmationPlanQuery request, CancellationToken cancellationToken)
    {
        IQueryable<Reservation> query;
        
        if (request.ReservationIds != null && request.ReservationIds.Any())
        {
            // If specific IDs are requested, include them as long as they are Draft and not deleted, regardless of Source
            query = _context.Reservations
                .Include(r => r.Lines)
                .Where(r => request.ReservationIds.Contains(r.Id) && r.Status == ReservationStatus.Draft && !r.IsDeleted);
        }
        else
        {
            // Default bulk planning (fromqueue) only considers PDF drafts
            query = _context.Reservations
                .Include(r => r.Lines)
                .Where(r => r.Status == ReservationStatus.Draft && r.Source == ReservationSource.PDF && !r.IsDeleted);
        }

        var drafts = await query.ToListAsync(cancellationToken);
        
        // Fetch all active rooms with their types (for pricing)
        var allRooms = await _context.Rooms
            .Include(r => r.RoomType)
            .Where(r => r.IsActive)
            .ToListAsync(cancellationToken);

        // Fetch all active reservation lines to check availability (simple overlap check)
        // Optimization: limit to date range of drafts, but for now fetch future/relevant ones
        var minDate = drafts.Any() ? drafts.Min(d => d.CheckInDate) : DateTime.Today;
        var maxDate = drafts.Any() ? drafts.Max(d => d.CheckOutDate) : DateTime.Today.AddDays(30);

        var occupiedLines = await _context.ReservationLines
            .Include(l => l.Reservation)
            .Where(l => ReservationPolicy.BlockingStatuses.Contains(l.Reservation!.Status) &&
                        l.Reservation!.CheckOutDate > minDate && // optimization
                        !l.Reservation!.IsDeleted)
            .ToListAsync(cancellationToken);

        var plan = new ReservationAllocationPlanDto();
        
        // Track rooms we allocate during this loop so we don't assign the same room twice
        var newlyAllocatedLines = new List<ReservationLine>();

        foreach (var draft in drafts)
        {
            var item = new ReservationAllocationItemDto
            {
                ReservationId = draft.Id,
                GuestName = draft.GuestName,
                BookingNumber = draft.BookingNumber ?? string.Empty,
                CheckInDate = draft.CheckInDate,
                CheckOutDate = draft.CheckOutDate,
            };

            // Determine RequestedRoomCount
            int requestedCount = 1;

            // 1. Try to parse from Notes (primary for PDF drafts where auto-assign might have partially succeeded or failed)
            if (draft.Source == ReservationSource.PDF && !string.IsNullOrEmpty(draft.Notes))
            {
                 // Use Matches to get all occurrences and take the last one (most recent re-parse)
                 // Pattern matches "RoomsCount=2" or "RoomsCount:2" or "RoomsCount 2"
                 var matches = System.Text.RegularExpressions.Regex.Matches(draft.Notes, @"RoomsCount\s*[:=]\s*(\d+)", RegexOptions.IgnoreCase);
                 if (matches.Count > 0)
                 {
                     var lastMatch = matches[matches.Count - 1];
                     if (int.TryParse(lastMatch.Groups[1].Value, out int extractedCount))
                     {
                         requestedCount = extractedCount;
                     }
                 }
                 else
                 {
                     Console.WriteLine($"[DEBUG] ConfirmAllPlan: No RoomsCount match found in Notes for Res={draft.Id}. Notes: {draft.Notes}");
                 }
            }

            // 2. If existing lines exist, they take precedence ONLY IF they are more than what we parsed 
            // (e.g. manual additions). If they are fewer, it might be a partial auto-assign which we want to override.
            if (draft.Lines != null && draft.Lines.Count > 0)
            {
                requestedCount = Math.Max(requestedCount, draft.Lines.Count);
            }

            item.RequestedRoomCount = requestedCount;
            
            Console.WriteLine($"[DEBUG] ConfirmAllPlan: ResId={draft.Id} | Booking={draft.BookingNumber} | FinalRequested={requestedCount} | NotesMatchCount={(draft.Notes != null ? Regex.Matches(draft.Notes, "RoomsCount").Count : 0)}");

            // 1. Calculate Target Price (Total for all requested rooms per night)
            var nights = (draft.CheckOutDate - draft.CheckInDate).Days;
            if (nights < 1) nights = 1;
            
            if (draft.Lines != null && draft.Lines.Any())
            {
                 // Use sum of line rates if available (Total Nightly Price)
                 item.TargetNightlyPrice = draft.Lines.Sum(l => l.RatePerNight);
                 
                 // If the number of lines is less than requested, scale the price up to the total intended amount
                 if (draft.Lines.Count < item.RequestedRoomCount && draft.TotalAmount > 0)
                 {
                     item.TargetNightlyPrice = draft.TotalAmount / nights;
                 }
            }
            else if (draft.TotalAmount > 0)
            {
                item.TargetNightlyPrice = draft.TotalAmount / nights;
            }
            else
            {
                // User requirement: PDF reservations with unknown prices should not appear in this form.
                if (draft.Source == ReservationSource.PDF)
                {
                    continue; // Skip this reservation
                }
                
                // For other sources, allow unknown price
                item.Status = "PriceUnknown";
                item.Warnings.Add("Price is 0 or unknown.");
            }

            // 2. Find Available Rooms
            // Filter rooms that are NOT occupied in this range
            var occupiedRoomIds = occupiedLines
                .Where(l => l.ReservationId != draft.Id && // exclude self if it had lines
                            l.Reservation!.CheckInDate < draft.CheckOutDate &&
                            l.Reservation!.CheckOutDate > draft.CheckInDate)
                .Select(l => l.RoomId)
                .ToHashSet();

            // Also exclude rooms we just tentatively allocated in this very batch
            var newlyAllocatedRoomIds = newlyAllocatedLines
                .Where(l => l.Reservation!.CheckInDate < draft.CheckOutDate &&
                            l.Reservation!.CheckOutDate > draft.CheckInDate)
                .Select(l => l.RoomId);
            
            occupiedRoomIds.UnionWith(newlyAllocatedRoomIds);

            var availableRooms = allRooms
                .Where(r => !occupiedRoomIds.Contains(r.Id))
                .Select(r => {
                    var perRoomTarget = item.TargetNightlyPrice.HasValue 
                        ? (item.TargetNightlyPrice.Value / item.RequestedRoomCount)
                        : 0;
                    
                    return new {
                        Room = r,
                        Price = r.RoomType?.DefaultRate ?? 0,
                        Diff = item.TargetNightlyPrice.HasValue 
                            ? Math.Abs((r.RoomType?.DefaultRate ?? 0) - perRoomTarget)
                            : 0,
                        PerRoomTarget = perRoomTarget
                    };
                })
                .ToList();

            // 3. Sort Candidates
            IEnumerable<ProposedRoomDto> sortedCandidates;

            if (item.TargetNightlyPrice.HasValue)
            {
                sortedCandidates = availableRooms
                    .OrderBy(x => x.Diff) // Primary: Closest price
                    .ThenBy(x => x.Price) // Tie-breaker: Cheaper room (avoid upgrade)
                    .ThenBy(x => x.Room.RoomNumber)
                    .Select(x => new ProposedRoomDto
                    {
                        RoomId = x.Room.Id,
                        RoomNumber = x.Room.RoomNumber,
                        RoomTypeName = x.Room.RoomType?.Name ?? "Unknown",
                        RoomPrice = x.Price,
                        PriceDifference = x.Price - x.PerRoomTarget
                    });
            }
            else
            {
                sortedCandidates = availableRooms
                    .OrderBy(x => x.Room.RoomNumber)
                    .Select(x => new ProposedRoomDto
                    {
                        RoomId = x.Room.Id,
                        RoomNumber = x.Room.RoomNumber,
                        RoomTypeName = x.Room.RoomType?.Name ?? "Unknown",
                        RoomPrice = x.Price,
                        PriceDifference = 0
                    });
            }

            item.CandidateRooms = sortedCandidates.ToList();

            // 4. Select Proposal
            // Phase 1: Use existing lines (Auto-assigned or manually added) if they are still valid/available
            if (draft.Lines != null)
            {
                foreach (var line in draft.Lines)
                {
                    // Check if this room is available in our candidate list (meaning not blocked by others)
                    var existingCandidate = item.CandidateRooms.FirstOrDefault(c => c.RoomId == line.RoomId);
                    if (existingCandidate != null)
                    {
                        // Add to proposal if we still need rooms
                        if (item.ProposedRooms.Count < item.RequestedRoomCount)
                        {
                            existingCandidate.IsRecommended = true;
                            item.ProposedRooms.Add(existingCandidate);
                        }
                    }
                }
            }

            // Phase 2: Fill remaining slots from best available candidates
            var needed = item.RequestedRoomCount - item.ProposedRooms.Count;
            if (needed > 0)
            {
                var remainingCandidates = item.CandidateRooms
                    .Where(c => !item.ProposedRooms.Any(p => p.RoomId == c.RoomId))
                    .Take(needed)
                    .ToList();
                
                foreach (var pick in remainingCandidates)
                {
                     pick.IsRecommended = true;
                     item.ProposedRooms.Add(pick);
                }
            }
            
            // Add all proposed rooms for this draft to the newly allocated tracking list
            foreach (var proposedRoom in item.ProposedRooms)
            {
                newlyAllocatedLines.Add(new ReservationLine
                {
                    RoomId = proposedRoom.RoomId,
                    Reservation = new Reservation 
                    {
                        CheckInDate = draft.CheckInDate,
                        CheckOutDate = draft.CheckOutDate
                    }
                });
            }
            
            // Final Status Check
            if (item.ProposedRooms.Count == item.RequestedRoomCount)
            {
                // check for issues?
            }
            else if (item.ProposedRooms.Count > 0)
            {
                 item.Status = "NeedsManual";
                 item.Warnings.Add($"Only {item.ProposedRooms.Count} / {item.RequestedRoomCount} rooms available.");
            }
            else
            {
                 item.Status = "NoRooms";
                 item.Warnings.Add("No available rooms found for these dates.");
            }

            plan.Items.Add(item);
        }

        return plan;
    }
}
