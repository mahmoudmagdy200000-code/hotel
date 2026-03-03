import http from './http';

export interface BranchDto {
    id: string;
    name: string;
}

export const getBranches = async (): Promise<BranchDto[]> => {
    const response = await http.get<BranchDto[]>('branches');
    return response.data;
};

export const createBranch = async (name: string): Promise<string> => {
    const response = await http.post<string>('branches', { name });
    return response.data;
};

