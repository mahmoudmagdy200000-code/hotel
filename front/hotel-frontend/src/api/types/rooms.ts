export interface RoomTypeDto {
    id: number;
    name: string;
    capacity: number;
    defaultRate: number;
    isActive: boolean;
}

export const RoomStatus = {
    Available: 1,
    OutOfService: 2
} as const;

export type RoomStatus = typeof RoomStatus[keyof typeof RoomStatus];

export interface RoomDto {
    id: number;
    roomNumber: string;
    roomTypeId: number;
    roomTypeName: string;
    floor?: number | null;
    status: RoomStatus;
    isActive: boolean;
}

export interface CreateRoomTypeCommand {
    name: string;
    capacity: number;
    defaultRate: number;
    isActive: boolean;
}

export interface UpdateRoomTypeCommand {
    id: number;
    name: string;
    capacity: number;
    defaultRate: number;
    isActive: boolean;
}

export interface CreateRoomCommand {
    roomNumber: string;
    roomTypeId: number;
    floor?: number | null;
    isActive: boolean;
}

export interface UpdateRoomCommand {
    id: number;
    roomNumber: string;
    roomTypeId: number;
    floor?: number | null;
    isActive: boolean;
}
