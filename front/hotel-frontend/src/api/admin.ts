import http from './http';

export interface ReservationDeleteAuditListItemDto {
    id: number;
    reservationId: number;
    eventType: string;
    actorEmail: string;
    occurredAtUtc: string;
    reason?: string;
    hotelName?: string;
    snapshotJson?: string;
}

export interface GetReservationDeletesQuery {
    from?: string;
    to?: string;
    query?: string;
    eventType?: string;
    hotelName?: string;
    limit?: number;
}

export interface BranchListingDto {
    id: string;
    name: string;
    channel?: string;
    isActive: boolean;
}

export interface CreateBranchListingCommand {
    name: string;
    channel?: string;
}

export interface UpdateBranchListingCommand {
    id: string;
    name?: string;
    channel?: string;
    isActive?: boolean;
}

export const getReservationDeletes = async (params: GetReservationDeletesQuery): Promise<ReservationDeleteAuditListItemDto[]> => {
    const response = await http.get<ReservationDeleteAuditListItemDto[]>('admin/audit/reservations/deletes', { params });
    return response.data;
};

export const getReservationAuditDetails = async (id: number): Promise<ReservationDeleteAuditListItemDto[]> => {
    const response = await http.get<ReservationDeleteAuditListItemDto[]>(`admin/audit/reservations/${id}`);
    return response.data;
};

// Listings management
export const getAdminListings = async (includeInactive: boolean = false): Promise<BranchListingDto[]> => {
    const response = await http.get<BranchListingDto[]>('admin/listings', { params: { includeInactive } });
    return response.data;
};

export const createAdminListing = async (command: CreateBranchListingCommand): Promise<string> => {
    const response = await http.post<string>('admin/listings', command);
    return response.data;
};

export const updateAdminListing = async (command: UpdateBranchListingCommand): Promise<void> => {
    const { id } = command;
    await http.patch(`admin/listings/${id}`, command);
};
