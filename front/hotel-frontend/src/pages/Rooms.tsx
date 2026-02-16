import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useRooms, useRoomActions } from '@/hooks/rooms/useRooms';
import { useRoomTypes } from '@/hooks/rooms/useRoomTypes';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@/components/ui/table';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
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
    AlertCircle
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { RoomStatus } from '@/api/types/rooms';
import { cn, formatCurrency, extractErrorMessage } from '@/lib/utils';
import type { RoomDto, CreateRoomCommand, UpdateRoomCommand } from '@/api/types/rooms';
import type { AxiosError } from 'axios';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

const DEFAULT_STATUS = { label: 'Unknown', color: 'bg-slate-50 text-slate-600 border-slate-200', icon: AlertCircle };

const STATUS_CONFIG: Record<number, { label: string, color: string, icon: React.ComponentType<{ className?: string }> }> = {
    [RoomStatus.Available]: { label: 'Available', color: 'bg-emerald-50 text-emerald-700 border-emerald-100', icon: CheckCircle2 },
    [RoomStatus.OutOfService]: { label: 'Out of Service', color: 'bg-red-50 text-red-700 border-red-100', icon: XCircle },
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

    // Default roomTypeId is derived in resetForm and handleOpenDialog instead of useEffect
    // This avoids the react-hooks/set-state-in-effect issue

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
        } catch (err: unknown) {
            const axiosErr = err as AxiosError;
            setError(extractErrorMessage(axiosErr) || 'Operation failed');
        }
    };

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
            description: t('common.confirm_delete', 'Are you sure you want to delete this room?'),
            variant: 'destructive',
            onConfirm: async () => {
                closeConfirm();
                try {
                    await actions.delete.mutateAsync(id);
                    toast.success(t('common.delete_success', 'Deleted successfully'));
                } catch (err: unknown) {
                    const axiosErr = err as AxiosError;
                    toast.error(extractErrorMessage(axiosErr) || 'Delete failed');
                }
            }
        });
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">
                        {t('rooms.title', 'Rooms')}
                    </h1>
                    <p className="text-slate-500 mt-1">
                        {t('rooms.desc', 'Inventory management and physical room assignments.')}
                    </p>
                </div>
                <Button onClick={() => handleOpenDialog()} className="bg-slate-900">
                    <Plus className="w-4 h-4 me-2" />
                    {t('rooms.add_room', 'Add Physical Room')}
                </Button>
            </div>

            <Card className="border-none shadow-sm overflow-hidden">
                <Table>
                    <TableHeader className="bg-slate-50">
                        <TableRow>
                            <TableHead>{t('rooms.room_number', 'Room Number')}</TableHead>
                            <TableHead>{t('rooms.type', 'Type')}</TableHead>
                            <TableHead>{t('rooms.floor', 'Floor')}</TableHead>
                            <TableHead>{t('common.status', 'Status')}</TableHead>
                            <TableHead className="text-right">{t('common.actions', 'Actions')}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            Array(5).fill(0).map((_, i) => (
                                <TableRow key={i}>
                                    <TableCell colSpan={5}><Skeleton className="h-12 w-full" /></TableCell>
                                </TableRow>
                            ))
                        ) : isError ? (
                            <TableRow>
                                <TableCell colSpan={5} className="h-32 text-center text-red-500 font-medium">
                                    {t('common.error_loading', 'Error loading rooms')}
                                </TableCell>
                            </TableRow>
                        ) : rooms?.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="h-32 text-center text-slate-500">
                                    {t('rooms.no_rooms', 'No rooms found.')}
                                </TableCell>
                            </TableRow>
                        ) : (
                            rooms?.map((room) => {
                                const status = STATUS_CONFIG[room.status] || DEFAULT_STATUS;
                                const StatusIcon = status.icon;

                                return (
                                    <TableRow key={room.id} className="group">
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded bg-slate-100 flex items-center justify-center font-bold text-slate-700">
                                                    {room.roomNumber}
                                                </div>
                                                {!room.isActive && (
                                                    <Badge variant="outline" className="text-[10px] text-slate-400 border-slate-200">
                                                        {t('common.hidden', 'Hidden')}
                                                    </Badge>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <Layers className="w-4 h-4 text-slate-400" />
                                                <span className="text-sm font-medium">{room.roomTypeName}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <MapPin className="w-4 h-4 text-slate-400" />
                                                <span className="text-sm">{room.floor}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className={cn(status.color, "flex w-fit items-center gap-1 border-none")}>
                                                <StatusIcon className="w-3 h-3" />
                                                {status.label}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(room)}>
                                                    <Edit className="w-4 h-4 text-slate-400 group-hover:text-slate-900" />
                                                </Button>
                                                <Button variant="ghost" size="icon" onClick={() => handleDelete(room.id)}>
                                                    <Trash2 className="w-4 h-4 text-slate-400 group-hover:text-red-600" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                );
                            })
                        )}
                    </TableBody>
                </Table>
            </Card>

            {/* Create/Edit Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>
                            {editingRoom ? t('rooms.edit_room', 'Edit Physical Room') : t('rooms.create_room', 'Add Physical Room')}
                        </DialogTitle>
                        <DialogDescription>
                            {editingRoom ? t('rooms.edit_desc', 'Update room properties and assignments.') : t('rooms.create_desc', 'Enter the physical room details to add it to inventory.')}
                        </DialogDescription>
                    </DialogHeader>

                    {error && (
                        <Alert variant="destructive" className="py-2 px-3">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle className="text-xs uppercase font-bold tracking-wider">{t('common.error', 'Error')}</AlertTitle>
                            <AlertDescription className="text-xs">
                                {error}
                            </AlertDescription>
                        </Alert>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="roomNumber">{t('rooms.room_number', 'Room Number')}</Label>
                                <Input
                                    id="roomNumber"
                                    value={formData.roomNumber}
                                    onChange={(e) => setFormData({ ...formData, roomNumber: e.target.value })}
                                    placeholder="101"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="floor">{t('rooms.floor', 'Floor')}</Label>
                                <Input
                                    id="floor"
                                    type="number"
                                    value={formData.floor}
                                    onChange={(e) => setFormData({ ...formData, floor: Number(e.target.value) })}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="roomType">{t('rooms.room_type', 'Room Type')}</Label>
                            <select
                                id="roomType"
                                className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
                                value={formData.roomTypeId}
                                onChange={(e) => setFormData({ ...formData, roomTypeId: Number(e.target.value) })}
                                required
                            >
                                <option value={0} disabled>{t('rooms.select_type', 'Select a room type...')}</option>
                                {roomTypes?.map(rt => (
                                    <option key={rt.id} value={rt.id}>{rt.name} - {formatCurrency(rt.defaultRate)}</option>
                                ))}
                            </select>
                        </div>

                        <div className="flex items-center gap-2 pt-2">
                            <input
                                type="checkbox"
                                id="isActive"
                                checked={formData.isActive}
                                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                                className="rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                            />
                            <Label htmlFor="isActive" className="cursor-pointer">{t('common.active', 'Active')}</Label>
                        </div>

                        <DialogFooter className="pt-4">
                            <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)}>
                                {t('common.cancel', 'Cancel')}
                            </Button>
                            <Button type="submit" className="bg-slate-900" disabled={actions.create.isPending || actions.update.isPending}>
                                {editingRoom ? t('common.save_changes', 'Save Changes') : t('common.create', 'Create')}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <ConfirmDialog
                isOpen={confirmState.isOpen}
                title={confirmState.title}
                description={confirmState.description}
                onConfirm={confirmState.onConfirm}
                onCancel={closeConfirm}
                variant={confirmState.variant}
                confirmText={t('common.confirm', 'Confirm')}
                cancelText={t('common.cancel', 'Cancel')}
            />
        </div>
    );
};

export default Rooms;
