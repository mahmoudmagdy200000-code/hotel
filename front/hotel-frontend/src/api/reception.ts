import http from './http';
import type {
    ReceptionTodayDto,
    PendingRequestsDto,
    ReservationStatusChangedDto,
    ReceptionSearchResultDto,
    PdfParsingResultDto,
    PendingReservationCreatedDto,
    PdfBatchUploadResultDto,
    PdfBatchParseResultDto,
    ReservationAllocationPlanDto,
    ConfirmAllocationRequest,
    ConfirmAllocationResultDto,
    ReceptionRoomsStatusDto
} from './types/reception';
import type { PaymentMethodValue } from './types/reservations';
import { isValidYYYYMMDD } from '@/lib/utils';

export const getReceptionToday = async (date: string): Promise<ReceptionTodayDto> => {
    if (!isValidYYYYMMDD(date)) {
        throw new Error(`Invalid date format: ${date}. Expected YYYY-MM-DD.`);
    }
    const response = await http.get<ReceptionTodayDto>('reception/today', { params: { date } });
    return response.data;
};

export const getReceptionRoomsStatus = async (date: string): Promise<ReceptionRoomsStatusDto> => {
    if (!isValidYYYYMMDD(date)) {
        throw new Error(`Invalid date format: ${date}. Expected YYYY-MM-DD.`);
    }
    const response = await http.get<ReceptionRoomsStatusDto>('reception/rooms-status', { params: { date } });
    return response.data;
};

export const getPendingRequests = async (params: { from: string, to: string, limit?: number }): Promise<PendingRequestsDto> => {
    const response = await http.get<PendingRequestsDto>('reception/pending-requests', { params });
    return response.data;
};

export const parsePendingRequest = async (id: number): Promise<PdfParsingResultDto> => {
    const response = await http.post<PdfParsingResultDto>(`pdf-reservations/${id}/parse`);
    return response.data;
};

export const uploadPdfReservation = async (file: File, listingId: string): Promise<PendingReservationCreatedDto> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('listingId', listingId);
    const response = await http.post<PendingReservationCreatedDto>('pdf-reservations/upload', formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    });
    return response.data;
};

export const uploadPdfReservationsBatch = async (files: File[], listingId: string): Promise<PdfBatchUploadResultDto> => {
    const formData = new FormData();
    files.forEach(file => {
        formData.append('files', file);
    });
    formData.append('listingId', listingId);
    const response = await http.post<PdfBatchUploadResultDto>('pdf-reservations/upload-batch', formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    });
    return response.data;
};

export const parsePdfReservationsBatch = async (reservationIds: number[]): Promise<PdfBatchParseResultDto> => {
    const response = await http.post<PdfBatchParseResultDto>('pdf-reservations/parse-batch', { reservationIds });
    return response.data;
};

export const checkInReservation = async (
    id: number,
    businessDate: string,
    guestName?: string,
    phone?: string,
    bookingNumber?: string,
    checkInDate?: string, // YYYY-MM-DD
    checkOutDate?: string, // YYYY-MM-DD
    totalAmount?: number,
    balanceDue?: number,
    paymentMethod?: PaymentMethodValue,
    currencyCode?: number,
    roomAssignments?: Array<{ lineId: number; roomId: number }>
): Promise<ReservationStatusChangedDto> => {
    const response = await http.post<ReservationStatusChangedDto>(`reception/reservations/${id}/check-in`, {
        businessDate,
        guestName,
        phone,
        bookingNumber,
        checkInDate,
        checkOutDate,
        totalAmount,
        balanceDue,
        paymentMethod,
        currencyCode,
        roomAssignments
    });
    return response.data;
};

export const checkOutReservation = async (
    id: number,
    businessDate: string,
    balanceDue?: number,
    paymentMethod?: PaymentMethodValue
): Promise<ReservationStatusChangedDto> => {
    const response = await http.post<ReservationStatusChangedDto>(`reception/reservations/${id}/check-out`, {
        businessDate,
        balanceDue,
        paymentMethod
    });
    return response.data;
};

export const cancelReservation = async (id: number, reason?: string): Promise<ReservationStatusChangedDto> => {
    const response = await http.post<ReservationStatusChangedDto>(`reception/reservations/${id}/cancel`, { reason });
    return response.data;
};

export const noShowReservation = async (id: number, businessDate: string, reason?: string): Promise<ReservationStatusChangedDto> => {
    const response = await http.post<ReservationStatusChangedDto>(`reception/reservations/${id}/no-show`, { reason, businessDate });
    return response.data;
};

export const confirmReservation = async (id: number): Promise<ReservationStatusChangedDto> => {
    const response = await http.post<ReservationStatusChangedDto>(`reception/reservations/${id}/confirm`);
    return response.data;
};

export const searchReservations = async (params: { query: string, date?: string, limit?: number }, signal?: AbortSignal): Promise<ReceptionSearchResultDto> => {
    const response = await http.get<ReceptionSearchResultDto>('reception/reservations/search', { params, signal });
    return response.data;
};

export const downloadPdfReservation = async (id: number): Promise<Blob> => {
    const response = await http.get(`pdf-reservations/${id}/download`, {
        responseType: 'blob'
    });
    return response.data;
};

/**
 * Delete a pending PDF reservation (Draft status only).
 * Returns 409 Conflict if reservation is already confirmed.
 */
export const deletePendingRequest = async (id: number, reason?: string): Promise<void> => {
    await http.delete(`pdf-reservations/${id}`, { params: { reason } });
};

export const getConfirmationPlan = async (reservationIds?: number[]): Promise<ReservationAllocationPlanDto> => {
    const response = await http.post<ReservationAllocationPlanDto>('reception/pending-requests/confirm-all/plan', { reservationIds });
    return response.data;
};

export const applyConfirmationPlan = async (approvals: ConfirmAllocationRequest): Promise<ConfirmAllocationResultDto> => {
    const response = await http.post<ConfirmAllocationResultDto>('reception/pending-requests/confirm-all/apply', approvals);
    return response.data;
};
