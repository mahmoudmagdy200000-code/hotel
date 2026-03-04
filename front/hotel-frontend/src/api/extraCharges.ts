import http from './http';
import type { CreateExtraChargeCommand } from './types/extraCharges';

/**
 * ExtraCharges API wrapper.
 * Backend: POST /api/extra-charges, DELETE /api/extra-charges/{id}
 */

export const createExtraCharge = async (command: CreateExtraChargeCommand): Promise<number> => {
    const response = await http.post<number>('extra-charges', command);
    return response.data;
};

export const deleteExtraCharge = async (reservationId: number, id: number): Promise<void> => {
    await http.delete(`reservations/${reservationId}/charges/${id}`);
};
