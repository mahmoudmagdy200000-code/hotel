export interface LoginRequest {
    email: string;
    password: string;
    twoFactorCode?: string | null;
    twoFactorRecoveryCode?: string | null;
}

export interface AccessTokenResponse {
    tokenType: string;
    accessToken: string;
    expiresIn: number;
    refreshToken: string;
}

export interface RegisterRequest {
    email: string;
    password: string;
}

export interface RefreshRequest {
    refreshToken: string;
}

export interface UserDto {
    id: string;
    email: string;
    branchId: string | null;
    roles: string[];
}

export interface UpdateUserCommand {
    userId: string;
    branchId: string | null;
    roles: string[];
}

export interface CreateUserCommand {
    email: string;
    password: string;
    branchId: string | null;
    role: string;
}
