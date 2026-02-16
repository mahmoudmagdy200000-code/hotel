import http from './http';
import type {
    RoomTypeDto,
    RoomDto,
    CreateRoomTypeCommand,
    UpdateRoomTypeCommand,
    CreateRoomCommand,
    UpdateRoomCommand
} from './types/rooms';

// Room Types API
export const getRoomTypes = async (): Promise<RoomTypeDto[]> => {
    const response = await http.get<RoomTypeDto[]>('roomtypes');
    return response.data;
};

export const getRoomType = async (id: number): Promise<RoomTypeDto> => {
    const response = await http.get<RoomTypeDto>(`roomtypes/${id}`);
    return response.data;
};

export const createRoomType = async (command: CreateRoomTypeCommand): Promise<number> => {
    const response = await http.post<number>('roomtypes', command);
    return response.data;
};

export const updateRoomType = async (id: number, command: UpdateRoomTypeCommand): Promise<void> => {
    await http.put(`roomtypes/${id}`, command);
};

export const deleteRoomType = async (id: number): Promise<void> => {
    await http.delete(`roomtypes/${id}`);
};

// Rooms API
export const getRooms = async (): Promise<RoomDto[]> => {
    const response = await http.get<RoomDto[]>('rooms');
    return response.data;
};

export const getRoom = async (id: number): Promise<RoomDto> => {
    const response = await http.get<RoomDto>(`rooms/${id}`);
    return response.data;
};

export const createRoom = async (command: CreateRoomCommand): Promise<number> => {
    const response = await http.post<number>('rooms', command);
    return response.data;
};

export const updateRoom = async (id: number, command: UpdateRoomCommand): Promise<void> => {
    await http.put(`rooms/${id}`, command);
};

export const deleteRoom = async (id: number): Promise<void> => {
    await http.delete(`rooms/${id}`);
};
