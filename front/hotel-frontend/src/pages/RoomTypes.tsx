import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useRoomTypes, useRoomTypeActions } from '@/hooks/rooms/useRoomTypes';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Plus,
    Edit,
    Trash2,
    Users,
    DollarSign,
    CheckCircle2,
    XCircle,
    AlertCircle,
    Layers,
    TrendingUp
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn, formatCurrency, extractErrorMessage } from '@/lib/utils';
import type { RoomTypeDto, CreateRoomTypeCommand, UpdateRoomTypeCommand } from '@/api/types/rooms';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

const RoomTypes = () => {
    const { t } = useTranslation();
    const { data: roomTypes, isLoading, isError } = useRoomTypes();
    const actions = useRoomTypeActions();

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingRoomType, setEditingRoomType] = useState<RoomTypeDto | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Form state
    const [formData, setFormData] = useState({
        name: '',
        capacity: 2,
        defaultRate: 100,
        isActive: true
    });

    const resetForm = () => {
        setFormData({ name: '', capacity: 2, defaultRate: 100, isActive: true });
        setEditingRoomType(null);
        setError(null);
    };

    const handleOpenDialog = (roomType?: RoomTypeDto) => {
        if (roomType) {
            setEditingRoomType(roomType);
            setFormData({
                name: roomType.name,
                capacity: roomType.capacity,
                defaultRate: roomType.defaultRate,
                isActive: roomType.isActive
            });
        } else {
            resetForm();
        }
        setError(null);
        setIsDialogOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingRoomType) {
                await actions.update.mutateAsync({
                    id: editingRoomType.id,
                    command: { id: editingRoomType.id, ...formData } as UpdateRoomTypeCommand
                });
            } else {
                await actions.create.mutateAsync(formData as CreateRoomTypeCommand);
            }
            setIsDialogOpen(false);
            resetForm();
            toast.success(editingRoomType ? t('update_success') : t('create_success'));
        } catch (err: unknown) {
            setError(extractErrorMessage(err) || 'Operation failed');
        }
    };

    // Summary Statistics
    const stats = useMemo(() => {
        if (!roomTypes) return { total: 0, active: 0, totalCapacity: 0, avgRate: 0 };
        const activeTypes = roomTypes.filter(rt => rt.isActive);
        return {
            total: roomTypes.length,
            active: activeTypes.length,
            totalCapacity: roomTypes.reduce((sum, rt) => sum + rt.capacity, 0),
            avgRate: activeTypes.length > 0 ? roomTypes.reduce((sum, rt) => sum + rt.defaultRate, 0) / roomTypes.length : 0
        };
    }, [roomTypes]);

    // Confirmation Dialog State
    const [confirmState, setConfirmState] = useState<{
        isOpen: boolean;
        title: string;
        description: string;
        onConfirm: () => void;
        variant?: 'default' | 'destructive';
    }>({
        isOpen: false,
        title: '',
        description: '',
        onConfirm: () => { },
    });

    const closeConfirm = () => setConfirmState(prev => ({ ...prev, isOpen: false }));

    const handleDelete = async (id: number) => {
        setConfirmState({
            isOpen: true,
            title: t('rooms.delete_room_type_title', 'Delete Room Type'),
            description: t('confirm_delete', 'Are you sure you want to delete this room type?'),
            variant: 'destructive',
            onConfirm: async () => {
                closeConfirm();
                try {
                    await actions.delete.mutateAsync(id);
                    toast.success(t('delete_success', 'Deleted successfully'));
                } catch (err: unknown) {
                    toast.error(extractErrorMessage(err) || 'Delete failed');
                }
            }
        });
    };

    return (
        <div className="space-y-6 pb-20 sm:pb-6 font-sans">
            {/* Header */}
            <div className="flex flex-row items-center justify-between gap-4">
                <div className="space-y-1">
                    <h1 className="text-2xl font-black tracking-tight text-slate-900 leading-none uppercase">
                        {t('rooms.room_types', 'Categories')}
                    </h1>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-sm bg-slate-100 text-slate-600">
                            {t('rooms.config', 'Configuration')}
                        </span>
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-bold uppercase tracking-tighter">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                            {stats.total} {t('rooms.templates', 'Templates Defined')}
                        </div>
                    </div>
                </div>

                <Button
                    onClick={() => handleOpenDialog()}
                    className="h-11 px-6 rounded-xl bg-slate-900 hover:bg-slate-800 text-white shadow-lg shadow-slate-200 transition-all active:scale-95 font-black text-[10px] uppercase tracking-widest"
                >
                    <Plus className="w-4 h-4 me-2" />
                    {t('rooms.add_room_type', 'Add Type')}
                </Button>
            </div>

            {/* Summary Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <MetricCard
                    title={t('rooms.stat_types', 'Total Types')}
                    value={stats.total}
                    icon={<Layers className="w-4 h-4 text-blue-600" />}
                    bg="bg-blue-50"
                    isLoading={isLoading}
                />
                <MetricCard
                    title={t('rooms.stat_active_types', 'Active Categories')}
                    value={stats.active}
                    icon={<CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                    bg="bg-emerald-50"
                    isLoading={isLoading}
                />
                <MetricCard
                    title={t('rooms.stat_capacity', 'Est. Capacity')}
                    value={stats.totalCapacity}
                    icon={<Users className="w-4 h-4 text-purple-600" />}
                    bg="bg-purple-50"
                    isLoading={isLoading}
                />
                <MetricCard
                    title={t('rooms.stat_avg_rate', 'Avg. Base Rate')}
                    value={formatCurrency(stats.avgRate)}
                    icon={<TrendingUp className="w-4 h-4 text-amber-600" />}
                    bg="bg-amber-50"
                    isLoading={isLoading}
                    isCurrency
                />
            </div>

            {/* Content */}
            {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Array(4).fill(0).map((_, i) => (
                        <Skeleton key={i} className="h-40 w-full rounded-2xl" />
                    ))}
                </div>
            ) : isError ? (
                <Alert variant="destructive" className="rounded-2xl border-rose-200 bg-rose-50">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle className="font-black uppercase tracking-widest text-[10px]">{t('error')}</AlertTitle>
                    <AlertDescription className="text-sm font-medium">
                        {t('error_loading_room_types', 'Failed to synchronize category templates.')}
                    </AlertDescription>
                </Alert>
            ) : roomTypes?.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 bg-slate-50/50 rounded-3xl border border-dashed border-slate-200">
                    <Layers className="w-12 h-12 text-slate-200 mb-4" />
                    <p className="text-sm font-black text-slate-400 uppercase tracking-widest">{t('rooms.no_room_types')}</p>
                    <Button variant="link" onClick={() => handleOpenDialog()} className="text-blue-600 font-bold mt-2">
                        {t('rooms.define_first_type')}
                    </Button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {roomTypes?.map((rt) => (
                        <RoomTypeCard
                            key={rt.id}
                            roomType={rt}
                            onEdit={() => handleOpenDialog(rt)}
                            onDelete={() => handleDelete(rt.id)}
                        />
                    ))}
                </div>
            )}

            {/* Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-[480px] rounded-3xl border-none shadow-2xl p-0 overflow-hidden">
                    <div className="bg-slate-900 p-6 text-white relative">
                        <DialogHeader>
                            <DialogTitle className="text-xl font-black uppercase tracking-tight">
                                {editingRoomType ? t('rooms.edit_room_type') : t('rooms.create_room_type')}
                            </DialogTitle>
                            <DialogDescription className="text-slate-400 font-medium text-sm">
                                {editingRoomType ? t('rooms.edit_type_desc') : t('rooms.create_type_desc')}
                            </DialogDescription>
                        </DialogHeader>
                    </div>

                    <div className="p-6">
                        {error && (
                            <Alert variant="destructive" className="mb-4 rounded-xl py-2 px-3">
                                <AlertCircle className="h-4 w-4" />
                                <AlertTitle className="text-[10px] uppercase font-black tracking-widest">{t('error')}</AlertTitle>
                                <AlertDescription className="text-xs font-bold">{error}</AlertDescription>
                            </Alert>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-2">
                                <Label htmlFor="name" className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('name')}</Label>
                                <Input
                                    id="name"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="h-11 rounded-xl border-slate-200 font-bold focus:ring-slate-900"
                                    placeholder="e.g. Deluxe Double"
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="capacity" className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('rooms.capacity')}</Label>
                                    <div className="relative">
                                        <Users className="absolute left-3 top-3.5 h-4 w-4 text-slate-300" />
                                        <Input
                                            id="capacity"
                                            type="number"
                                            value={formData.capacity}
                                            onChange={(e) => setFormData({ ...formData, capacity: Number(e.target.value) })}
                                            className="h-11 rounded-xl border-slate-200 font-bold pl-10 focus:ring-slate-900"
                                            min={1}
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="rate" className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('rooms.default_rate')}</Label>
                                    <div className="relative">
                                        <DollarSign className="absolute left-3 top-3.5 h-4 w-4 text-slate-300" />
                                        <Input
                                            id="rate"
                                            type="number"
                                            className="h-11 rounded-xl border-slate-200 font-bold pl-10 focus:ring-slate-900"
                                            value={formData.defaultRate}
                                            onChange={(e) => setFormData({ ...formData, defaultRate: Number(e.target.value) })}
                                            min={0}
                                            step="0.01"
                                            required
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                <div className="flex-1">
                                    <Label htmlFor="isActive" className="text-xs font-black text-slate-900 uppercase tracking-tight block cursor-pointer">
                                        {t('active_status', 'Available for New Rooms')}
                                    </Label>
                                    <p className="text-[9px] font-bold text-slate-400 mt-0.5 uppercase tracking-tighter">
                                        {t('rooms.active_type_desc', 'Inactive types cannot be assigned to new physical rooms.')}
                                    </p>
                                </div>
                                <input
                                    type="checkbox"
                                    id="isActive"
                                    checked={formData.isActive}
                                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                                    className="w-5 h-5 rounded-lg border-slate-300 text-slate-900 focus:ring-slate-900 cursor-pointer"
                                />
                            </div>

                            <div className="flex items-center justify-end gap-3 pt-2">
                                <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)} className="h-12 px-6 rounded-xl font-black text-[10px] uppercase tracking-widest text-slate-400">
                                    {t('cancel')}
                                </Button>
                                <Button type="submit" className="h-12 px-8 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-black text-[10px] uppercase tracking-widest shadow-lg shadow-slate-200" disabled={actions.create.isPending || actions.update.isPending}>
                                    {editingRoomType ? t('save_changes') : t('create_template', 'Create Template')}
                                </Button>
                            </div>
                        </form>
                    </div>
                </DialogContent>
            </Dialog>

            <ConfirmDialog
                isOpen={confirmState.isOpen}
                title={confirmState.title}
                description={confirmState.description}
                onConfirm={confirmState.onConfirm}
                onCancel={closeConfirm}
                variant={confirmState.variant}
                confirmText={t('confirm')}
                cancelText={t('cancel')}
            />
        </div>
    );
};

const MetricCard = ({ title, value, icon, bg, isLoading, isCurrency }: { title: string, value: string | number, icon: React.ReactNode, bg: string, isLoading: boolean, isCurrency?: boolean }) => (
    <Card className="border border-slate-100 shadow-sm transition-all hover:bg-white active:scale-[0.98] group rounded-2xl overflow-hidden bg-white/50 backdrop-blur-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 pb-1">
            <CardTitle className="text-[9px] uppercase font-black text-slate-400 tracking-wider group-hover:text-slate-600 transition-colors">
                {title}
            </CardTitle>
            <div className={`${bg} p-1.5 rounded-lg group-hover:shadow-sm transition-all`}>
                {icon}
            </div>
        </CardHeader>
        <CardContent className="p-3 pt-0">
            {isLoading ? <Skeleton className="h-7 w-12" /> : (
                <div className={cn("font-black text-slate-900 leading-none tracking-tight", isCurrency ? "text-lg sm:text-xl" : "text-xl sm:text-2xl")}>
                    {value}
                </div>
            )}
        </CardContent>
    </Card>
);

const RoomTypeCard = ({ roomType, onEdit, onDelete }: { roomType: RoomTypeDto, onEdit: () => void, onDelete: () => void }) => {
    const { t } = useTranslation();

    return (
        <Card className="border border-slate-100 shadow-sm rounded-[12px] overflow-hidden bg-white hover:border-slate-300 transition-all group flex flex-col h-full">
            <div className="p-4 flex-1 space-y-4">
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-black text-sm shadow-xl shadow-slate-200">
                            {roomType.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div className="space-y-0.5">
                            <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight truncate max-w-[140px]">{roomType.name}</h3>
                            <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                <Users className="w-2.5 h-2.5" />
                                <span>{roomType.capacity} {t('guests_plural', 'Guests')}</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                        {roomType.isActive ? (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest border bg-emerald-50 text-emerald-600 border-emerald-100">
                                <CheckCircle2 className="w-2.5 h-2.5" />
                                {t('active')}
                            </span>
                        ) : (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest border bg-slate-50 text-slate-400 border-slate-100">
                                <XCircle className="w-2.5 h-2.5" />
                                {t('inactive')}
                            </span>
                        )}
                    </div>
                </div>

                <div className="pt-2">
                    <div className="flex items-baseline gap-1">
                        <span className="text-lg font-black text-slate-900">{formatCurrency(roomType.defaultRate)}</span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">/ {t('night')}</span>
                    </div>
                </div>
            </div>

            <div className="p-2 bg-slate-50/50 border-t border-slate-100 flex items-center gap-1">
                <Button
                    variant="ghost"
                    className="flex-1 h-11 rounded-xl hover:bg-white hover:shadow-sm font-black text-[9px] uppercase tracking-widest text-slate-500 hover:text-slate-900 transition-all"
                    onClick={onEdit}
                >
                    <Edit className="w-3.5 h-3.5 mr-2" />
                    {t('edit')}
                </Button>
                <div className="w-px h-4 bg-slate-200" />
                <Button
                    variant="ghost"
                    className="flex-1 h-11 rounded-xl hover:bg-white hover:shadow-sm font-black text-[9px] uppercase tracking-widest text-slate-500 hover:text-rose-600 transition-all"
                    onClick={onDelete}
                >
                    <Trash2 className="w-3.5 h-3.5 mr-2" />
                    {t('delete')}
                </Button>
            </div>
        </Card>
    );
};

export default RoomTypes;
