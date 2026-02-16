using System;
using System.Collections.Generic;

namespace CleanArchitecture.Application.Reservations.Queries.GetConfirmationPlan;

public class ReservationAllocationPlanDto
{
    public List<ReservationAllocationItemDto> Items { get; set; } = new();
}

public class ReservationAllocationItemDto
{
    public int ReservationId { get; set; }
    public string GuestName { get; set; } = string.Empty;
    public string BookingNumber { get; set; } = string.Empty;
    public DateTime CheckInDate { get; set; }
    public DateTime CheckOutDate { get; set; }
    
    public decimal? TargetNightlyPrice { get; set; }
    public int RequestedRoomCount { get; set; } = 1; // Default to 1

    // The algorithm's specific recommendation (subset of candidates)
    public List<ProposedRoomDto> ProposedRooms { get; set; } = new();
    
    // All valid candidates for this specific reservation (for the dropdown)
    public List<ProposedRoomDto> CandidateRooms { get; set; } = new();

    public string Status { get; set; } = "Proposed"; // Proposed, NeedsManual, PriceUnknown
    public List<string> Warnings { get; set; } = new();
}

public class ProposedRoomDto
{
    public int RoomId { get; set; }
    public string RoomNumber { get; set; } = string.Empty;
    public string RoomTypeName { get; set; } = string.Empty;
    public decimal RoomPrice { get; set; }
    public decimal PriceDifference { get; set; }
    public bool IsRecommended { get; set; }
}
