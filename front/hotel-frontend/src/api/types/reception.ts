export interface ReceptionReservationItemDto {
    reservationId: number;
    bookingNumber: string;
    guestName: string;
    phone?: string | null;
    checkIn: string; // yyyy-MM-dd
    checkOut: string; // yyyy-MM-dd
    status: string;
    roomNumbers: string[];
    roomTypeNames: string[];
    totalAmount: number;
    balanceDue: number;
    currency: string;
    currencyCode: number;
    paymentMethod: string;
    lines: ReceptionReservationLineDto[];
}

export interface ReceptionReservationLineDto {
    id: number;
    roomId: number;
    roomNumber: string;
    roomTypeId: number;
    roomTypeName: string;
}

export interface ReceptionTodaySummaryDto {
    arrivalsCount: number;
    departuresCount: number;
    inHouseCount: number;
}

export interface ReceptionTodayDto {
    date: string; // yyyy-MM-dd
    summary: ReceptionTodaySummaryDto;
    arrivals: ReceptionReservationItemDto[];
    departures: ReceptionReservationItemDto[];
    inHouse: ReceptionReservationItemDto[];
}

export interface AvailabilityHintDto {
    bucket: 'Safe' | 'Tight' | 'Overbook';
    availableRoomNights: number;
    forecastSoldRoomNights: number;
    supplyRoomNights: number;
    pendingRoomNights: number;
    note?: string | null;
}

export interface PendingRequestItemDto {
    reservationId: number;
    bookingNumber: string;
    guestName: string;
    phone?: string | null;
    checkIn?: string | null;
    checkOut?: string | null;
    nights?: number | null;
    requestedRooms?: number | null;
    createdAtUtc: string;
    parsingStatus: string;
    errorCode?: string | null;
    errorMessage?: string | null;
    totalAmount?: number | null;
    currency?: string | null;
    currencyCode?: number | null;
    hotelName?: string | null;
    availabilityHint?: AvailabilityHintDto | null;
}

export interface PendingTotalsDto {
    count: number;
    totalPendingRoomNights: number;
    safeCount: number;
    tightCount: number;
    overbookCount: number;
}

export interface PendingRequestsDto {
    from: string;
    to: string;
    totals: PendingTotalsDto;
    items: PendingRequestItemDto[];
}

export interface ReservationStatusChangedDto {
    reservationId: number;
    oldStatus: string;
    newStatus: string;
    changedAtUtc: string;
    businessDate: string;
    message?: string | null;
}

export interface ReceptionReservationSearchItemDto {
    reservationId: number;
    bookingNumber: string;
    guestName: string;
    phone?: string | null;
    checkIn: string; // yyyy-MM-dd
    checkOut: string; // yyyy-MM-dd
    status: string;
    roomTypeNames: string[];
    totalNights: number;
}

export interface ReceptionSearchResultDto {
    query: string;
    date?: string | null;
    results: ReceptionReservationSearchItemDto[];
}

export interface ExtractedPdfDataDto {
    guestName?: string | null;
    phone?: string | null;
    checkIn?: string | null;
    checkOut?: string | null;
    roomsCount?: number | null;
    roomTypeHint?: string | null;
    totalPrice?: number | null;
    currency?: string | null;
    bookingNumber?: string | null;
}

export interface PdfParsingResultDto {
    reservationId: number;
    parsingStatus: string;
    errorCode?: string | null;
    errorMessage?: string | null;
    failureStep?: string | null;
    correlationId?: string | null;
    extracted?: ExtractedPdfDataDto | null;
    errors?: string[] | null;
}

export interface PendingReservationCreatedDto {
    reservationId: number;
    bookingNumber: string;
    status: string;
    createdAtUtc: string;
    parsingStatus: string;
    message?: string | null;
}

export interface PdfBatchUploadItemResultDto {
    index: number;
    fileName: string;
    status: string; // 'Created' | 'Failed'
    reservationId?: number | null;
    parsingStatus?: string | null;
    message?: string | null;
    errorCode?: string | null;
    errorMessage?: string | null;
}

export interface PdfBatchUploadResultDto {
    totalCount: number;
    successCount: number;
    failedCount: number;
    items: PdfBatchUploadItemResultDto[];
}

export interface PdfBatchParseItemResultDto {
    index: number;
    reservationId: number;
    status: string; // 'Parsed' | 'Failed'
    parsingStatus: string;
    message?: string | null;
    errorCode?: string | null;
    errorMessage?: string | null;
    extracted?: ExtractedPdfDataDto | null;
}

export interface PdfBatchParseResultDto {
    totalCount: number;
    successCount: number;
    failedCount: number;
    items: PdfBatchParseItemResultDto[];
}

export interface ProposedRoomDto {
    roomId: number;
    roomNumber: string;
    roomTypeName: string;
    roomPrice: number;
    priceDifference: number;
    isRecommended: boolean;
}

export interface ReservationAllocationItemDto {
    reservationId: number;
    guestName: string;
    bookingNumber: string;
    checkInDate: string;
    checkOutDate: string;
    targetNightlyPrice?: number | null;
    requestedRoomCount: number;
    proposedRooms: ProposedRoomDto[];
    candidateRooms: ProposedRoomDto[];
    status: string; // 'Proposed' | 'NeedsManual' | 'PriceUnknown' | 'NoRooms'
    warnings: string[];
}

export interface ReservationAllocationPlanDto {
    items: ReservationAllocationItemDto[];
}

export interface ConfirmAllocationItem {
    reservationId: number;
    selectedRoomIds: number[];
}

export interface ConfirmAllocationRequest {
    approvals: ConfirmAllocationItem[];
}

export interface ConfirmAllocationFailureDto {
    reservationId: number;
    reason: string;
}

export interface ConfirmAllocationResultDto {
    confirmedCount: number;
    failedCount: number;
    findings?: string | null;
    failures: ConfirmAllocationFailureDto[];
}

export interface ReceptionRoomStatusReservationDto {
    reservationId: number;
    guestName: string;
    bookingNumber?: string | null;
    checkIn: string; // yyyy-MM-dd
    checkOut: string; // yyyy-MM-dd
    hotelName?: string | null;
}

export interface ReceptionRoomStatusItemDto {
    roomId: number;
    roomNumber: string;
    roomTypeName: string;
    status: 'Available' | 'Reserved' | 'Occupied';
    reservation?: ReceptionRoomStatusReservationDto | null;
}

export interface ReceptionRoomsStatusDto {
    date: string; // yyyy-MM-dd
    items: ReceptionRoomStatusItemDto[];
}
