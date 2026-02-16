import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useRoomTypes, useRoomTypeActions } from '@/hooks/rooms/useRoomTypes';
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
    Users,
    DollarSign,
    CheckCircle2,
    XCircle,
    AlertCircle
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { formatCurrency, extractErrorMessage } from '@/lib/utils';
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
        } catch (err: unknown) {
            setError(extractErrorMessage(err) || 'Operation failed');
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
            title: t('rooms.delete_room_type_title', 'Delete Room Type'),
            description: t('common.confirm_delete', 'Are you sure you want to delete this room type?'),
            variant: 'destructive',
            onConfirm: async () => {
                closeConfirm();
                try {
                    await actions.delete.mutateAsync(id);
                    toast.success(t('common.delete_success', 'Deleted successfully'));
                } catch (err: unknown) {
                    toast.error(extractErrorMessage(err) || 'Delete failed');
                }
            }
        });
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">
                        {t('rooms.room_types', 'Room Types')}
                    </h1>
                    <p className="text-slate-500 mt-1">
                        {t('rooms.room_types_desc', 'Manage global room categories, capacities and default pricing.')}
                    </p>
                </div>
                <Button onClick={() => handleOpenDialog()} className="bg-slate-900">
                    <Plus className="w-4 h-4 me-2" />
                    {t('rooms.add_room_type', 'Add Room Type')}
                </Button>
            </div>

            <Card className="border-none shadow-sm overflow-hidden">
                <Table>
                    <TableHeader className="bg-slate-50">
                        <TableRow>
                            <TableHead>{t('common.name', 'Name')}</TableHead>
                            <TableHead>{t('rooms.capacity', 'Capacity')}</TableHead>
                            <TableHead>{t('rooms.default_rate', 'Default Rate')}</TableHead>
                            <TableHead>{t('common.status', 'Status')}</TableHead>
                            <TableHead className="text-right">{t('common.actions', 'Actions')}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            Array(3).fill(0).map((_, i) => (
                                <TableRow key={i}>
                                    <TableCell colSpan={5}><Skeleton className="h-12 w-full" /></TableCell>
                                </TableRow>
                            ))
                        ) : isError ? (
                            <TableRow>
                                <TableCell colSpan={5} className="h-32 text-center text-red-500 font-medium">
                                    {t('common.error_loading', 'Error loading room types')}
                                </TableCell>
                            </TableRow>
                        ) : roomTypes?.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="h-32 text-center text-slate-500">
                                    {t('rooms.no_room_types', 'No room types defined yet.')}
                                </TableCell>
                            </TableRow>
                        ) : (
                            roomTypes?.map((rt) => (
                                <TableRow key={rt.id} className="group">
                                    <TableCell className="font-semibold text-slate-900 capitalize">{rt.name}</TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <Users className="w-4 h-4 text-slate-400" />
                                            <span>{rt.capacity} {t('common.guests', 'Guests')}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="font-medium text-emerald-700">
                                            {formatCurrency(rt.defaultRate)}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        {rt.isActive ? (
                                            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-100 flex w-fit items-center gap-1">
                                                <CheckCircle2 className="w-3 h-3" />
                                                {t('common.active', 'Active')}
                                            </Badge>
                                        ) : (
                                            <Badge variant="outline" className="bg-slate-50 text-slate-400 border-slate-100 flex w-fit items-center gap-1">
                                                <XCircle className="w-3 h-3" />
                                                {t('common.inactive', 'Inactive')}
                                            </Badge>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(rt)}>
                                                <Edit className="w-4 h-4 text-slate-400 group-hover:text-slate-900" />
                                            </Button>
                                            <Button variant="ghost" size="icon" onClick={() => handleDelete(rt.id)}>
                                                <Trash2 className="w-4 h-4 text-slate-400 group-hover:text-red-600" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </Card>

            {/* Create/Edit Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>
                            {editingRoomType ? t('rooms.edit_room_type', 'Edit Room Type') : t('rooms.create_room_type', 'Create Room Type')}
                        </DialogTitle>
                        <DialogDescription>
                            {editingRoomType ? t('rooms.edit_type_desc', 'Update room type specifications and pricing.') : t('rooms.create_type_desc', 'Define a new category of rooms for the property.')}
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
                        <div className="space-y-2">
                            <Label htmlFor="name">{t('common.name', 'Name')}</Label>
                            <Input
                                id="name"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="e.g. Deluxe Double"
                                required
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="capacity">{t('rooms.capacity', 'Capacity')}</Label>
                                <Input
                                    id="capacity"
                                    type="number"
                                    value={formData.capacity}
                                    onChange={(e) => setFormData({ ...formData, capacity: Number(e.target.value) })}
                                    min={1}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="rate">{t('rooms.default_rate', 'Default Rate')}</Label>
                                <div className="relative">
                                    <DollarSign className="absolute left-2 top-2.5 h-4 w-4 text-slate-400" />
                                    <Input
                                        id="rate"
                                        type="number"
                                        className="pl-8"
                                        value={formData.defaultRate}
                                        onChange={(e) => setFormData({ ...formData, defaultRate: Number(e.target.value) })}
                                        min={0}
                                        step="0.01"
                                        required
                                    />
                                </div>
                            </div>
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
                                {editingRoomType ? t('common.save_changes', 'Save Changes') : t('common.create', 'Create')}
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

export default RoomTypes;
