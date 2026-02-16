import http from './http';
import type { LoginRequest, AccessTokenResponse, RegisterRequest, RefreshRequest, UserDto, UpdateUserCommand, CreateUserCommand } from './types/auth';

export const login = (data: LoginRequest) => {
    return http.post<AccessTokenResponse>('users/login', data);
};

export const register = (data: RegisterRequest) => {
    return http.post('users/register', data);
};

export const refresh = (data: RefreshRequest) => {
    return http.post<AccessTokenResponse>('users/refresh', data);
};

export const logout = () => {
    // Client-side only for JWT usually
    return Promise.resolve();
};

export const getMe = () => {
    return http.get<{ id: string; email: string; roles: string[]; branchId: string | null }>('users/me');
};

export const getUsers = () => {
    return http.get<UserDto[]>('users');
};

export const updateUser = (data: UpdateUserCommand) => {
    return http.put(`users/${data.userId}`, data);
};

export const createUser = (data: CreateUserCommand) => {
    return http.post('users', data);
};
