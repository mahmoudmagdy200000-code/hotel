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
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Users, Shield, Building2, Save, Loader2, Plus, Key, UserCheck, ShieldCheck, LayoutGrid, Building } from "lucide-react";
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

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
            <div className="space-y-6 animate-pulse p-4">
                <div className="flex items-center gap-4">
                    <Skeleton className="w-12 h-12 rounded-2xl bg-slate-100" />
                    <div className="space-y-2">
                        <Skeleton className="h-6 w-48 bg-slate-100" />
                        <Skeleton className="h-4 w-64 bg-slate-100" />
                    </div>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 rounded-3xl bg-slate-50" />)}
                </div>
                <div className="space-y-4">
                    {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-24 rounded-3xl bg-slate-50" />)}
                </div>
            </div>
        );
    }

    const stats = {
        total: users?.length || 0,
        admins: users?.filter(u => u.roles.includes('Administrator') || u.roles.includes('Owner')).length || 0,
        receptionists: users?.filter(u => u.roles.includes('Receptionist')).length || 0,
        unbound: users?.filter(u => !u.branchId).length || 0
    };

    return (
        <div className="space-y-6 pb-24 sm:pb-8">
            {/* STICKY NAVY ACTION BAR */}
            <div className="sticky top-0 z-40 -mx-4 sm:mx-0 px-4 py-4 bg-slate-900 shadow-2xl sm:rounded-3xl sm:static sm:bg-slate-900 border-b border-white/5">
                <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-white/10 rounded-2xl border border-white/5 backdrop-blur-xl">
                                <Users className="w-5 h-5 text-blue-400" />
                            </div>
                            <div>
                                <h1 className="text-sm font-black text-white uppercase tracking-tighter leading-none">
                                    {t('admin.user_management', 'Staff Registry')}
                                </h1>
                                <div className="flex items-center gap-1.5 mt-1">
                                    <span className={`w-1.5 h-1.5 rounded-full bg-emerald-500`} />
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">
                                        {t('admin.manage_access', 'Operational Access Control')}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                                <DialogTrigger asChild>
                                    <Button className="bg-blue-600 hover:bg-blue-700 h-10 px-4 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-blue-900/40 active:scale-95 transition-all">
                                        <Plus className="w-4 h-4 mr-1.5" />
                                        {t('admin.add_user', 'Register Staff')}
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-[425px] rounded-[32px] border-none shadow-2xl p-0 overflow-hidden">
                                    <div className="bg-slate-900 p-8 text-white">
                                        <h2 className="text-xl font-black uppercase tracking-tighter">{t('admin.add_new_user', 'Provision User')}</h2>
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1 opacity-60">Identity Management</p>
                                    </div>
                                    <form onSubmit={handleCreateUser} className="p-8 space-y-4">
                                        <div className="space-y-1.5">
                                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">{t('auth.email', 'Corporate Email')}</Label>
                                            <Input
                                                type="email"
                                                required
                                                value={newUser.email}
                                                onChange={(e) => setNewUser(prev => ({ ...prev, email: e.target.value }))}
                                                className="rounded-xl bg-slate-50 border-slate-100 font-bold h-11"
                                                placeholder="staff@viva-sedr.com"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">{t('auth.password', 'Master Key')}</Label>
                                            <div className="relative">
                                                <Key className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                                                <Input
                                                    type="password"
                                                    required
                                                    className="rounded-xl bg-slate-50 border-slate-100 font-bold h-11 ps-10"
                                                    value={newUser.password}
                                                    onChange={(e) => setNewUser(prev => ({ ...prev, password: e.target.value }))}
                                                />
                                            </div>
                                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter mt-1">
                                                {t('admin.password_hint', 'Strict Policy: 6+ chars, uppercase, digit')}
                                            </p>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1.5">
                                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">{t('auth.role', 'Authority')}</Label>
                                                <Select value={newUser.role} onValueChange={(val) => setNewUser(prev => ({ ...prev, role: val }))}>
                                                    <SelectTrigger className="rounded-xl bg-slate-50 border-slate-100 font-bold h-11 uppercase text-[10px]">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="Administrator">{t('admin.roles.admin', 'Administrator')}</SelectItem>
                                                        <SelectItem value="Owner">{t('admin.roles.owner', 'Owner')}</SelectItem>
                                                        <SelectItem value="Receptionist">{t('admin.roles.receptionist', 'Receptionist')}</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">{t('admin.branch', 'Node Binding')}</Label>
                                                <Select value={newUser.branchId} onValueChange={(val) => setNewUser(prev => ({ ...prev, branchId: val }))}>
                                                    <SelectTrigger className="rounded-xl bg-slate-50 border-slate-100 font-bold h-11 uppercase text-[10px]">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="none">{t('common.no_branch', 'Universal Node')}</SelectItem>
                                                        {branches?.map((branch) => (
                                                            <SelectItem key={branch.id} value={branch.id}>{branch.name}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>
                                        <div className="pt-4 flex gap-3">
                                            <Button type="button" variant="ghost" onClick={() => setIsCreateDialogOpen(false)} className="flex-1 h-12 rounded-2xl font-black text-[11px] uppercase tracking-widest text-slate-400">Abort</Button>
                                            <Button type="submit" disabled={createMutation.isPending} className="flex-[2] h-12 rounded-2xl bg-slate-900 text-white font-black text-[11px] uppercase tracking-widest shadow-lg shadow-slate-900/10">
                                                {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin me-2" /> : <Plus className="w-4 h-4 me-2" />}
                                                {t('admin.create_user', 'Commit User')}
                                            </Button>
                                        </div>
                                    </form>
                                </DialogContent>
                            </Dialog>
                        </div>
                    </div>
                </div>
            </div>

            {/* KPI GRID */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 px-1 sm:px-0">
                <MetricCard
                    title="Staff Count"
                    value={stats.total}
                    icon={<Users className="w-4 h-4 text-blue-600" />}
                    bg="bg-blue-100"
                    trend="Active Directory"
                />
                <MetricCard
                    title="Authority Level"
                    value={stats.admins}
                    icon={<ShieldCheck className="w-4 h-4 text-emerald-600" />}
                    bg="bg-emerald-100"
                    trend="Admin / Owner"
                />
                <MetricCard
                    title="Front Office"
                    value={stats.receptionists}
                    icon={<UserCheck className="w-4 h-4 text-amber-600" />}
                    bg="bg-amber-100"
                    trend="Receptionist"
                />
                <MetricCard
                    title="Global Nodes"
                    value={stats.unbound}
                    icon={<LayoutGrid className="w-4 h-4 text-slate-600" />}
                    bg="bg-slate-100"
                    trend="Branch Isolation Off"
                />
            </div>

            {/* STAFF REGISTRY LEDGER */}
            <div className="space-y-4">
                <div className="flex items-center justify-between px-2">
                    <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter flex items-center gap-2">
                        <Shield className="w-5 h-5 text-slate-400" />
                        Access Matrix
                    </h2>
                </div>

                {/* MOBILE: USER LIST CARDS */}
                <div className="grid grid-cols-1 gap-4 sm:hidden">
                    {users?.map((user) => {
                        const changes = pendingChanges[user.id];
                        const currentBranchId = changes?.branchId === undefined ? user.branchId : changes.branchId;
                        const currentRole = changes?.roles ? changes.roles[0] : user.roles[0];
                        const hasChanges = !!changes;

                        return (
                            <div key={user.id} className="bg-white border border-slate-100 rounded-[32px] overflow-hidden shadow-sm p-6 space-y-5 relative active:scale-[0.99] transition-all group">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="p-3 bg-slate-900 rounded-2xl shadow-lg shadow-slate-900/20">
                                            <Users className="w-4 h-4 text-white" />
                                        </div>
                                        <div className="min-w-0">
                                            <h3 className="font-black text-slate-900 text-sm uppercase tracking-tighter truncate">{user.email}</h3>
                                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block truncate opacity-60">ID: {user.id}</span>
                                        </div>
                                    </div>
                                    {hasChanges && (
                                        <Button
                                            size="icon"
                                            onClick={() => handleSave(user.id)}
                                            disabled={updateMutation.isPending}
                                            className="h-10 w-10 rounded-xl bg-blue-600 shadow-lg shadow-blue-500/30"
                                        >
                                            {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                        </Button>
                                    )}
                                </div>

                                <div className="grid grid-cols-1 gap-3">
                                    <div className="space-y-1.5">
                                        <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">Assigned Role</Label>
                                        <Select value={currentRole} onValueChange={(val) => handleRoleChange(user.id, val)}>
                                            <SelectTrigger className="rounded-xl bg-slate-50 border-slate-100 font-bold h-11 text-xs px-4">
                                                <div className="flex items-center gap-2">
                                                    <Shield className="w-3.5 h-3.5 text-slate-400" />
                                                    <SelectValue />
                                                </div>
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Administrator">Administrator</SelectItem>
                                                <SelectItem value="Owner">Owner</SelectItem>
                                                <SelectItem value="Receptionist">Receptionist</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">Branch Isolation</Label>
                                        <Select value={currentBranchId || 'none'} onValueChange={(val) => handleBranchChange(user.id, val)}>
                                            <SelectTrigger className="rounded-xl bg-slate-50 border-slate-100 font-bold h-11 text-xs px-4">
                                                <div className="flex items-center gap-2">
                                                    <Building className="w-3.5 h-3.5 text-slate-400" />
                                                    <SelectValue />
                                                </div>
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="none">Universal Node</SelectItem>
                                                {branches?.map((branch) => (
                                                    <SelectItem key={branch.id} value={branch.id}>{branch.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* DESKTOP: PREMIUM REGISTRY TABLE */}
                <div className="hidden sm:block rounded-[32px] border border-slate-100 shadow-sm overflow-hidden bg-white">
                    <Table>
                        <TableHeader className="bg-slate-50/50">
                            <TableRow className="border-b border-slate-100 font-black text-[10px] uppercase tracking-widest text-slate-400">
                                <TableHead className="px-8 py-5">Corporate Identity</TableHead>
                                <TableHead className="py-5">Authority Role</TableHead>
                                <TableHead className="py-5">Node Permission</TableHead>
                                <TableHead className="py-5 pr-8 text-right">Commit</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {users?.map((user) => {
                                const changes = pendingChanges[user.id];
                                const currentBranchId = changes?.branchId === undefined ? user.branchId : changes.branchId;
                                const currentRole = changes?.roles ? changes.roles[0] : user.roles[0];
                                const hasChanges = !!changes;

                                return (
                                    <TableRow key={user.id} className="hover:bg-slate-50/50 transition-all group">
                                        <TableCell className="px-8 py-5">
                                            <div className="font-black text-slate-900 uppercase tracking-tighter text-xs">{user.email}</div>
                                            <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5 opacity-40 group-hover:opacity-100 transition-opacity">ID: {user.id}</div>
                                        </TableCell>
                                        <TableCell className="py-5">
                                            <Select value={currentRole} onValueChange={(val) => handleRoleChange(user.id, val)}>
                                                <SelectTrigger className="w-[180px] h-10 rounded-xl bg-slate-50 border-transparent font-black text-[10px] uppercase tracking-widest px-4 hover:border-slate-200 transition-all focus:ring-slate-900/5">
                                                    <div className="flex items-center gap-2">
                                                        <Shield className="w-3.5 h-3.5 text-slate-400" />
                                                        <SelectValue />
                                                    </div>
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="Administrator">Administrator</SelectItem>
                                                    <SelectItem value="Owner">Owner</SelectItem>
                                                    <SelectItem value="Receptionist">Receptionist</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </TableCell>
                                        <TableCell className="py-5">
                                            <Select value={currentBranchId || 'none'} onValueChange={(val) => handleBranchChange(user.id, val)}>
                                                <SelectTrigger className="w-[200px] h-10 rounded-xl bg-slate-50 border-transparent font-black text-[10px] uppercase tracking-widest px-4 hover:border-slate-200 transition-all focus:ring-slate-900/5">
                                                    <div className="flex items-center gap-2">
                                                        <Building2 className="w-3.5 h-3.5 text-slate-400" />
                                                        <SelectValue />
                                                    </div>
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="none">Universal Access</SelectItem>
                                                    {branches?.map((branch) => (
                                                        <SelectItem key={branch.id} value={branch.id}>{branch.name}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </TableCell>
                                        <TableCell className="py-5 pr-8 text-right">
                                            <Button
                                                size="sm"
                                                disabled={!hasChanges || updateMutation.isPending}
                                                onClick={() => handleSave(user.id)}
                                                className={cn(
                                                    "rounded-xl h-10 px-5 font-black text-[10px] uppercase tracking-widest transition-all",
                                                    hasChanges ? "bg-slate-900 text-white shadow-lg shadow-slate-900/20 active:scale-95" : "bg-slate-100 text-slate-400"
                                                )}
                                            >
                                                {updateMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-2" /> : <Save className="w-3.5 h-3.5 mr-2" />}
                                                Commit
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </div>
    );
};

const MetricCard = ({ title, value, icon, bg, trend }: { title: string, value: string | number, icon: React.ReactNode, bg: string, trend: string }) => (
    <Card className="border border-slate-100 shadow-sm transition-all active:scale-[0.98] group rounded-[32px] overflow-hidden bg-white">
        <CardContent className="p-5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{title}</span>
                <div className={cn("p-1.5 rounded-xl transition-all shadow-sm", bg)}>{icon}</div>
            </div>
            <h3 className="text-xl font-black text-slate-900 leading-none tracking-tighter truncate">{value}</h3>
            <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest">{trend}</span>
        </CardContent>
    </Card>
);

export default UserManagement;
