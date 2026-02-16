import http from './http';

export interface BranchDto {
    id: string;
    name: string;
}

export const getBranches = async (): Promise<BranchDto[]> => {
    const response = await http.get<BranchDto[]>('branches');
    return response.data;
};
