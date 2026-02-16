import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useUsers, useBranches, useUpdateUser, useCreateUser } from '@/hooks/admin/useUserManagement';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Users, Shield, Building2, Save, Loader2, Plus, Key } from "lucide-react";
import { toast } from 'sonner';

const UserManagement = () => {
    const { t } = useTranslation();
    const { data: users, isLoading: usersLoading } = useUsers();
    const { data: branches, isLoading: branchesLoading } = useBranches();
    const updateMutation = useUpdateUser();
    const createMutation = useCreateUser();

    const [pendingChanges, setPendingChanges] = useState<Record<string, { branchId: string | null; roles: string[] }>>({});
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [newUser, setNewUser] = useState({
        email: '',
        password: '',
        role: 'Receptionist',
        branchId: 'none'
    });

    const handleBranchChange = (userId: string, branchId: string) => {
        const user = users?.find(u => u.id === userId);
        if (!user) return;

        setPendingChanges(prev => ({
            ...prev,
            [userId]: {
                roles: prev[userId]?.roles || user.roles,
                branchId: branchId === 'none' ? null : branchId
            }
        }));
    };

    const handleRoleChange = (userId: string, role: string) => {
        const user = users?.find(u => u.id === userId);
        if (!user) return;

        setPendingChanges(prev => ({
            ...prev,
            [userId]: {
                branchId: prev[userId]?.branchId === undefined ? user.branchId : prev[userId].branchId,
                roles: [role]
            }
        }));
    };

    const handleSave = async (userId: string) => {
        const changes = pendingChanges[userId];
        if (!changes) return;

        try {
            await updateMutation.mutateAsync({
                userId,
                branchId: changes.branchId,
                roles: changes.roles
            });
            toast.success(t('admin.user_updated', 'User updated successfully'));
            setPendingChanges(prev => {
                const newState = { ...prev };
                delete newState[userId];
                return newState;
            });
        } catch (error) {
            toast.error(t('admin.update_failed', 'Failed to update user'));
        }
    };

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await createMutation.mutateAsync({
                email: newUser.email,
                password: newUser.password,
                role: newUser.role,
                branchId: newUser.branchId === 'none' ? null : newUser.branchId
            });
            toast.success(t('admin.user_created', 'User created successfully'));
            setIsCreateDialogOpen(false);
            setNewUser({ email: '', password: '', role: 'Receptionist', branchId: 'none' });
        } catch (error: any) {
            const data = error.response?.data;
            let errorMsg = t('admin.create_failed', 'Failed to create user');

            if (Array.isArray(data)) {
                errorMsg = data.map(e => typeof e === 'string' ? e : (e.description || e)).join('. ');
            } else if (data?.description) {
                errorMsg = data.description;
            } else if (typeof data === 'string') {
                errorMsg = data;
            }

            toast.error(errorMsg);
        }
    };

    if (usersLoading || branchesLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-900 rounded-lg">
                    <Users className="w-6 h-6 text-white" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">{t('admin.user_management', 'User Management')}</h1>
                    <p className="text-slate-500">{t('admin.user_management_desc', 'Assign users to branches and set permissions')}</p>
                </div>
                <div className="ms-auto">
                    <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                        <DialogTrigger asChild>
                            <Button className="bg-slate-900">
                                <Plus className="w-4 h-4 me-2" />
                                {t('admin.add_user', 'Add User')}
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[425px]">
                            <form onSubmit={handleCreateUser}>
                                <DialogHeader>
                                    <DialogTitle>{t('admin.add_new_user', 'Add New User')}</DialogTitle>
                                    <DialogDescription>
                                        {t('admin.add_user_desc', 'Create a new staff account and assign initial role and branch.')}
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="grid gap-4 py-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="email">{t('auth.email', 'Email')}</Label>
                                        <Input
                                            id="email"
                                            type="email"
                                            required
                                            value={newUser.email}
                                            onChange={(e) => setNewUser(prev => ({ ...prev, email: e.target.value }))}
                                            placeholder="staff@hotel.com"
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="password">{t('auth.password', 'Password')}</Label>
                                        <div className="relative">
                                            <Key className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                                            <Input
                                                id="password"
                                                type="password"
                                                required
                                                className="ps-10"
                                                value={newUser.password}
                                                onChange={(e) => setNewUser(prev => ({ ...prev, password: e.target.value }))}
                                            />
                                        </div>
                                        <p className="text-[10px] text-slate-400 mt-1">
                                            {t('admin.password_hint', 'Min 6 chars, uppercase, and digit required.')}
                                        </p>
                                    </div>
                                    <div className="grid gap-2">
                                        <Label>{t('auth.role', 'Role')}</Label>
                                        <Select
                                            value={newUser.role}
                                            onValueChange={(val) => setNewUser(prev => ({ ...prev, role: val }))}
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Administrator">{t('admin.roles.admin', 'Administrator')}</SelectItem>
                                                <SelectItem value="Owner">{t('admin.roles.owner', 'Owner')}</SelectItem>
                                                <SelectItem value="Receptionist">{t('admin.roles.receptionist', 'Receptionist')}</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="grid gap-2">
                                        <Label>{t('admin.branch', 'Branch')}</Label>
                                        <Select
                                            value={newUser.branchId}
                                            onValueChange={(val) => setNewUser(prev => ({ ...prev, branchId: val }))}
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="none">{t('common.no_branch', 'Universal / No Branch')}</SelectItem>
                                                {branches?.map((branch) => (
                                                    <SelectItem key={branch.id} value={branch.id}>
                                                        {branch.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button type="submit" disabled={createMutation.isPending} className="w-full bg-slate-900">
                                        {createMutation.isPending && <Loader2 className="w-4 h-4 animate-spin me-2" />}
                                        {t('admin.create_user', 'Create User')}
                                    </Button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            <Card className="border-none shadow-sm">
                <CardHeader>
                    <CardTitle>{t('admin.users', 'Users')}</CardTitle>
                    <CardDescription>{t('admin.manage_access', 'Manage staff access and locations')}</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t('common.user', 'User')}</TableHead>
                                <TableHead>{t('auth.role', 'Role')}</TableHead>
                                <TableHead>{t('admin.branch', 'Branch')}</TableHead>
                                <TableHead className="text-right">{t('common.actions', 'Actions')}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {users?.map((user) => {
                                const changes = pendingChanges[user.id];
                                const currentBranchId = changes?.branchId === undefined ? user.branchId : changes.branchId;
                                const currentRole = changes?.roles ? changes.roles[0] : user.roles[0];
                                const hasChanges = !!changes;

                                return (
                                    <TableRow key={user.id}>
                                        <TableCell>
                                            <div className="font-medium">{user.email}</div>
                                            <div className="text-xs text-slate-400">{user.id}</div>
                                        </TableCell>
                                        <TableCell>
                                            <Select
                                                value={currentRole}
                                                onValueChange={(val) => handleRoleChange(user.id, val)}
                                            >
                                                <SelectTrigger className="w-[140px] h-9">
                                                    <div className="flex items-center gap-2">
                                                        <Shield className="w-3 h-3 text-slate-400" />
                                                        <SelectValue />
                                                    </div>
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="Administrator">{t('admin.roles.admin', 'Administrator')}</SelectItem>
                                                    <SelectItem value="Owner">{t('admin.roles.owner', 'Owner')}</SelectItem>
                                                    <SelectItem value="Receptionist">{t('admin.roles.receptionist', 'Receptionist')}</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </TableCell>
                                        <TableCell>
                                            <Select
                                                value={currentBranchId || 'none'}
                                                onValueChange={(val) => handleBranchChange(user.id, val)}
                                            >
                                                <SelectTrigger className="w-[200px] h-9">
                                                    <div className="flex items-center gap-2">
                                                        <Building2 className="w-3 h-3 text-slate-400" />
                                                        <SelectValue />
                                                    </div>
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="none">{t('common.no_branch', 'Universal / No Branch')}</SelectItem>
                                                    {branches?.map((branch) => (
                                                        <SelectItem key={branch.id} value={branch.id}>
                                                            {branch.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                size="sm"
                                                disabled={!hasChanges || updateMutation.isPending}
                                                onClick={() => handleSave(user.id)}
                                                className="bg-slate-900"
                                            >
                                                {updateMutation.isPending && (
                                                    <Loader2 className="w-3 h-3 animate-spin me-2" />
                                                )}
                                                <Save className="w-3 h-3 me-2" />
                                                {t('common.save', 'Save')}
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
};

export default UserManagement;
