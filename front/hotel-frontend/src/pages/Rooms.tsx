import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useRooms, useRoomActions } from '@/hooks/rooms/useRooms';
import { useRoomTypes } from '@/hooks/rooms/useRoomTypes';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
    Layers,
    CheckCircle2,
    XCircle,
    MapPin,
    AlertCircle,
    Building2,
    EyeOff
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { RoomStatus } from '@/api/types/rooms';
import { cn, formatCurrency, extractErrorMessage } from '@/lib/utils';
import type { RoomDto, CreateRoomCommand, UpdateRoomCommand } from '@/api/types/rooms';
import type { AxiosError } from 'axios';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

const DEFAULT_STATUS = { label: 'Unknown', color: 'bg-slate-50 text-slate-400 border-slate-100', icon: AlertCircle };

const STATUS_CONFIG: Record<number, { label: string, color: string, icon: React.ComponentType<{ className?: string }> }> = {
    [RoomStatus.Available]: { label: 'Available', color: 'bg-emerald-50 text-emerald-600 border-emerald-100', icon: CheckCircle2 },
    [RoomStatus.OutOfService]: { label: 'Out of Service', color: 'bg-rose-50 text-rose-600 border-rose-100', icon: XCircle },
};

const Rooms = () => {
    const { t } = useTranslation();
    const { data: rooms, isLoading, isError } = useRooms();
    const { data: roomTypes } = useRoomTypes();
    const actions = useRoomActions();

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingRoom, setEditingRoom] = useState<RoomDto | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Form state
    const [formData, setFormData] = useState({
        roomNumber: '',
        roomTypeId: 0,
        floor: 1,
        isActive: true
    });

    const resetForm = () => {
        setFormData({
            roomNumber: '',
            roomTypeId: roomTypes?.[0]?.id || 0,
            floor: 1,
            isActive: true
        });
        setEditingRoom(null);
        setError(null);
    };

    const handleOpenDialog = (room?: RoomDto) => {
        if (room) {
            setEditingRoom(room);
            setFormData({
                roomNumber: room.roomNumber,
                roomTypeId: room.roomTypeId,
                floor: room.floor || 1,
                isActive: room.isActive
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
            if (editingRoom) {
                await actions.update.mutateAsync({
                    id: editingRoom.id,
                    command: { id: editingRoom.id, ...formData } as UpdateRoomCommand
                });
            } else {
                await actions.create.mutateAsync(formData as CreateRoomCommand);
            }
            setIsDialogOpen(false);
            resetForm();
            toast.success(editingRoom ? t('update_success') : t('create_success'));
        } catch (err: unknown) {
            const axiosErr = err as AxiosError;
            setError(extractErrorMessage(axiosErr) || 'Operation failed');
        }
    };

    // Summary Statistics
    const stats = useMemo(() => {
        if (!rooms) return { total: 0, active: 0, outOfService: 0, hidden: 0, uniqueTypes: 0 };
        return {
            total: rooms.length,
            active: rooms.filter(r => r.isActive && r.status === RoomStatus.Available).length,
            outOfService: rooms.filter(r => r.status === RoomStatus.OutOfService).length,
            hidden: rooms.filter(r => !r.isActive).length,
            uniqueTypes: new Set(rooms.map(r => r.roomTypeId)).size
        };
    }, [rooms]);

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
            title: t('rooms.delete_room_title', 'Delete Room'),
            description: t('confirm_delete', 'Are you sure you want to delete this room?'),
            variant: 'destructive',
            onConfirm: async () => {
                closeConfirm();
                try {
                    await actions.delete.mutateAsync(id);
                    toast.success(t('delete_success', 'Deleted successfully'));
                } catch (err: unknown) {
                    const axiosErr = err as AxiosError;
                    toast.error(extractErrorMessage(axiosErr) || 'Delete failed');
                }
            }
        });
    };

    return (
        <div className="space-y-6 pb-20 sm:pb-6 font-sans">
            {/* Header: Core Navigation */}
            <div className="flex flex-row items-center justify-between gap-4">
                <div className="space-y-1">
                    <h1 className="text-2xl font-black tracking-tight text-slate-900 leading-none uppercase">
                        {t('rooms.title', 'Inventory')}
                    </h1>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-sm bg-slate-900 text-white">
                            {t('rooms.physical_rooms', 'Physical Rooms')}
                        </span>
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-bold uppercase tracking-tighter">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            {stats.total} {t('active_units', 'Units Registered')}
                        </div>
                    </div>
                </div>

                <Button
                    onClick={() => handleOpenDialog()}
                    className="h-11 px-6 rounded-xl bg-slate-900 hover:bg-slate-800 text-white shadow-lg shadow-slate-200 transition-all active:scale-95 font-black text-[10px] uppercase tracking-widest"
                >
                    <Plus className="w-4 h-4 me-2" />
                    {t('rooms.add_room', 'Add Room')}
                </Button>
            </div>

            {/* Summary Metrics: Compact Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <MetricCard
                    title={t('rooms.stat_total', 'Total Units')}
                    value={stats.total}
                    icon={<Building2 className="w-4 h-4 text-slate-600" />}
                    bg="bg-slate-50"
                    isLoading={isLoading}
                />
                <MetricCard
                    title={t('rooms.stat_available', 'Active & Ready')}
                    value={stats.active}
                    icon={<CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                    bg="bg-emerald-50"
                    isLoading={isLoading}
                />
                <MetricCard
                    title={t('rooms.stat_oos', 'Maintenance')}
                    value={stats.outOfService}
                    icon={<XCircle className="w-4 h-4 text-rose-600" />}
                    bg="bg-rose-50"
                    isLoading={isLoading}
                />
                <MetricCard
                    title={t('rooms.stat_hidden', 'Hidden Units')}
                    value={stats.hidden}
                    icon={<EyeOff className="w-4 h-4 text-amber-600" />}
                    bg="bg-amber-50"
                    isLoading={isLoading}
                />
            </div>

            {/* Content: Responsive Data Representation */}
            {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {Array(8).fill(0).map((_, i) => (
                        <Skeleton key={i} className="h-40 w-full rounded-2xl" />
                    ))}
                </div>
            ) : isError ? (
                <Alert variant="destructive" className="rounded-2xl border-rose-200 bg-rose-50">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle className="font-black uppercase tracking-widest text-[10px]">{t('error')}</AlertTitle>
                    <AlertDescription className="text-sm font-medium">
                        {t('error_loading_rooms', 'Failed to synchronize room inventory.')}
                    </AlertDescription>
                </Alert>
            ) : rooms?.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 bg-slate-50/50 rounded-3xl border border-dashed border-slate-200">
                    <Building2 className="w-12 h-12 text-slate-200 mb-4" />
                    <p className="text-sm font-black text-slate-400 uppercase tracking-widest">{t('rooms.no_rooms')}</p>
                    <Button variant="link" onClick={() => handleOpenDialog()} className="text-blue-600 font-bold mt-2">
                        {t('rooms.add_your_first')}
                    </Button>
                </div>
            ) : (
                <>
                    {/* Mobile & Tablet & Desktop: Unified Card Experience for Cohesion */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {rooms?.map((room) => (
                            <RoomCard
                                key={room.id}
                                room={room}
                                onEdit={() => handleOpenDialog(room)}
                                onDelete={() => handleDelete(room.id)}
                            />
                        ))}
                    </div>

                    {/* Table View Hidden but kept in code for potential high-density desktop toggle if needed later */}
                    <div className="hidden sm:hidden rounded-2xl border border-slate-100 shadow-sm overflow-hidden bg-white">
                        {/* Table logic (Disabled for Cards-First approach) */}
                    </div>
                </>
            )}

            {/* Create/Edit Dialog: Premium Refinement */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-[480px] rounded-3xl border-none shadow-2xl p-0 overflow-hidden">
                    <div className="bg-slate-900 p-6 text-white relative overflow-hidden">
                        <div className="absolute -right-10 -top-10 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl" />
                        <DialogHeader>
                            <DialogTitle className="text-xl font-black uppercase tracking-tight">
                                {editingRoom ? t('rooms.edit_room') : t('rooms.add_room')}
                            </DialogTitle>
                            <DialogDescription className="text-slate-400 font-medium text-sm">
                                {editingRoom ? t('rooms.edit_desc') : t('rooms.create_desc')}
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
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="roomNumber" className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('rooms.room_number')}</Label>
                                    <Input
                                        id="roomNumber"
                                        value={formData.roomNumber}
                                        onChange={(e) => setFormData({ ...formData, roomNumber: e.target.value })}
                                        className="h-11 rounded-xl border-slate-200 focus:ring-slate-900 font-bold"
                                        placeholder="101"
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="floor" className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('rooms.floor')}</Label>
                                    <Input
                                        id="floor"
                                        type="number"
                                        value={formData.floor}
                                        onChange={(e) => setFormData({ ...formData, floor: Number(e.target.value) })}
                                        className="h-11 rounded-xl border-slate-200 focus:ring-slate-900 font-bold"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="roomType" className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('rooms.room_type')}</Label>
                                <select
                                    id="roomType"
                                    className="flex h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 font-bold"
                                    value={formData.roomTypeId}
                                    onChange={(e) => setFormData({ ...formData, roomTypeId: Number(e.target.value) })}
                                    required
                                >
                                    <option value={0} disabled className="font-bold">{t('rooms.select_type')}</option>
                                    {roomTypes?.map(rt => (
                                        <option key={rt.id} value={rt.id} className="font-bold text-slate-900">
                                            {rt.name.toUpperCase()} — {formatCurrency(rt.defaultRate)}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                <div className="flex-1">
                                    <Label htmlFor="isActive" className="text-xs font-black text-slate-900 uppercase tracking-tight block cursor-pointer">
                                        {t('active_inventory', 'Active in Inventory')}
                                    </Label>
                                    <p className="text-[9px] font-bold text-slate-400 mt-0.5 uppercase tracking-tighter">
                                        {t('rooms.active_desc', 'Show this room in reception search and occupancy.')}
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
                                    {editingRoom ? t('save_changes') : t('create_room', 'Create Room')}
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

// --- Sub-components (Premium Architecture) ---

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

const RoomCard = ({ room, onEdit, onDelete }: { room: RoomDto, onEdit: () => void, onDelete: () => void }) => {
    const { t } = useTranslation();
    const status = STATUS_CONFIG[room.status] || DEFAULT_STATUS;
    const StatusIcon = status.icon;

    return (
        <Card className="border border-slate-100 shadow-sm rounded-[12px] overflow-hidden bg-white hover:border-slate-300 transition-all group flex flex-col h-full">
            <div className="p-4 flex-1 space-y-4">
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-black text-sm shadow-xl shadow-slate-200">
                            {room.roomNumber}
                        </div>
                        <div className="space-y-0.5">
                            <h3 className="text-xs font-black text-slate-900 uppercase tracking-tight truncate max-w-[120px]">{room.roomTypeName}</h3>
                            <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                <MapPin className="w-3 h-3" />
                                <span>{t('rooms.floor_label', 'Floor')} {room.floor}</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                        <span className={cn(
                            "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest border",
                            status.color
                        )}>
                            <StatusIcon className="w-2.5 h-2.5" />
                            {status.label}
                        </span>
                        {!room.isActive && (
                            <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-none text-[8px] font-black tracking-tighter uppercase rounded-md px-1 py-0 h-4 shadow-sm border border-amber-200">
                                {t('hidden')}
                            </Badge>
                        )}
                    </div>
                </div>

                <div className="pt-2 flex items-center gap-2">
                    <div className="flex -space-x-1.5">
                        <div className="w-6 h-6 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center shadow-sm">
                            <Layers className="w-2.5 h-2.5 text-slate-400" />
                        </div>
                    </div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                        {room.roomTypeName}
                    </span>
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

export default Rooms;
