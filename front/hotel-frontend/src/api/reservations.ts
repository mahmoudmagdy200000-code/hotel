import http from './http';
import type {
    ReservationDto,
    GetReservationsQuery,
    CreateReservationCommand,
    UpdateReservationCommand
} from './types/reservations';

/**
 * Reservations API wrapper.
 * Following backend OpenAPI/Clean Architecture endpoints in Web/Endpoints/Reservations.cs
 */

export const searchReservations = async (params: GetReservationsQuery): Promise<ReservationDto[]> => {
    const response = await http.get<ReservationDto[]>('reservations', { params });
    return response.data;
};

export const getReservationDetails = async (id: number): Promise<ReservationDto> => {
    const response = await http.get<ReservationDto>(`reservations/${id}`);
    return response.data;
};

export const createReservation = async (command: CreateReservationCommand): Promise<ReservationDto> => {
    const response = await http.post<ReservationDto>('reservations', command);
    return response.data;
};

export const updateReservation = async (id: number, command: UpdateReservationCommand): Promise<void> => {
    await http.put(`reservations/${id}`, command);
};

export const confirmReservation = async (id: number): Promise<void> => {
    await http.post(`reservations/${id}/confirm`);
};

export const checkInReservation = async (id: number): Promise<void> => {
    await http.post(`reservations/${id}/checkin`);
};

export const checkOutReservation = async (id: number): Promise<void> => {
    await http.post(`reservations/${id}/checkout`);
};

export const noShowReservation = async (id: number): Promise<void> => {
    await http.post(`reservations/${id}/noshow`);
};

export const cancelReservation = async (id: number): Promise<void> => {
    await http.post(`reservations/${id}/cancel`, {});
};

export const deleteReservation = async (id: number, reason?: string): Promise<void> => {
    await http.delete(`reservations/${id}`, { params: { reason } });
};
