import React, { createContext, useContext, useState } from 'react';

interface User {
    id: string;
    email: string;
    name: string;
    role: string;
    branchId: string | null;
}

interface AuthContextType {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    selectedBranchId: string | null;
    setSelectedBranchId: (id: string | null) => void;
    login: (token: string, user: User) => void;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    // Use lazy initialization to avoid useEffect + setState pattern
    const [user, setUser] = useState<User | null>(() => {
        try {
            const storedUser = localStorage.getItem('user');
            const token = localStorage.getItem('token');
            if (storedUser && token) {
                return JSON.parse(storedUser);
            }
        } catch {
            localStorage.removeItem('user');
            localStorage.removeItem('token');
        }
        return null;
    });

    const [selectedBranchId, _setSelectedBranchId] = useState<string | null>(() => {
        return localStorage.getItem('selectedBranchId');
    });

    // isLoading is only needed for SSR hydration, can default to false with lazy init
    const [isLoading] = useState(false);

    const setSelectedBranchId = (id: string | null) => {
        if (id) {
            localStorage.setItem('selectedBranchId', id);
        } else {
            localStorage.removeItem('selectedBranchId');
        }
        _setSelectedBranchId(id);
    };

    const login = (token: string, userData: User) => {
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(userData));
        setUser(userData);
    };

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('selectedBranchId');
        setUser(null);
        window.location.reload(); // Hard reset to clear all state including React Query
    };

    const value = {
        user,
        isAuthenticated: !!user,
        isLoading,
        selectedBranchId,
        setSelectedBranchId,
        login,
        logout,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
