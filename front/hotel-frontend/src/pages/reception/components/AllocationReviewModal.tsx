import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CalendarDays, Hash } from 'lucide-react';
import type {
    ReservationAllocationPlanDto,
    ConfirmAllocationRequest
} from '@/api/types/reception';
import { formatCurrency, cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

interface Props {
    isOpen: boolean;
    plan: ReservationAllocationPlanDto | null;
    isLoading: boolean;
    isSubmitting: boolean;
    onClose: () => void;
    onConfirm: (request: ConfirmAllocationRequest) => void;
}

export function AllocationReviewModal({ isOpen, plan, isLoading, isSubmitting, onClose, onConfirm }: Props) {
    const { t } = useTranslation();
    const [selections, setSelections] = useState<Record<number, number[]>>({});

    // Initialize selections from plan proposals
    useEffect(() => {
        if (plan) {
            const initialSelections: Record<number, number[]> = {};
            plan.items.forEach(item => {
                // Pre-select proposed rooms up to requested count
                if (item.proposedRooms.length > 0) {
                    initialSelections[item.reservationId] = item.proposedRooms.map(r => r.roomId);
                } else {
                    initialSelections[item.reservationId] = [];
                }
            });
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setSelections(initialSelections);
        }
    }, [plan]);

    const handleRoomChange = (reservationId: number, roomIndex: number, roomId: number) => {
        setSelections(prev => {
            const currentRooms = prev[reservationId] ? [...prev[reservationId]] : [];
            // Resize if needed (fill with first candidate if undefined)
            // But usually we respect requestedRoomCount size
            currentRooms[roomIndex] = roomId;
            return {
                ...prev,
                [reservationId]: currentRooms
            };
        });
    };

    const handleConfirm = () => {
        if (!plan) return;

        const approvals = Object.entries(selections).map(([resId, roomIds]) => ({
            reservationId: parseInt(resId),
            selectedRoomIds: roomIds.filter(id => id > 0) // Filter out unset/invalid
        }));

        onConfirm({ approvals });
    };

    const getStatusBadge = (status: string, className?: string) => {
        const base = "font-black text-[8px] sm:text-[9px] uppercase tracking-widest px-1.5 py-0.5 rounded border whitespace-nowrap ";
        switch (status) {
            case 'Proposed':
                return <span className={cn(base, "bg-emerald-50 text-emerald-600 border-emerald-100", className)}>{t('common.ready', 'Ready')}</span>;
            case 'NeedsManual':
                return <span className={cn(base, "bg-amber-50 text-amber-600 border-amber-100", className)}>{t('common.manual', 'Manual')}</span>;
            case 'PriceUnknown':
                return <span className={cn(base, "bg-blue-50 text-blue-600 border-blue-100", className)}>{t('reception.check_price', 'Price?')}</span>;
            case 'NoRooms':
                return <span className={cn(base, "bg-rose-50 text-rose-600 border-rose-100", className)}>No Rooms</span>;
            default:
                return <span className={cn(base, "bg-slate-50 text-slate-400 border-slate-100", className)}>{status}</span>;
        }
    };

    // Calculate summary statistics
    const totalCount = plan?.items.length || 0;
    const readyCount = Object.values(selections).filter(ids => ids && ids.length > 0).length;
    const hasIssues = plan?.items.some(i => i.status !== 'Proposed');

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !isSubmitting && !open && onClose()}>
            <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>{t('reception.review_allocation_plan', 'Review Room Assignments')}</DialogTitle>
                    <DialogDescription>
                        {t('reception.review_allocation_desc', 'Review and adjust proposed room assignments before confirming. Prices are matched to the closest available room.')}
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-auto py-4">
                    {isLoading ? (
                        <div className="flex items-center justify-center p-8">Loading plan...</div>
                    ) : !plan || plan.items.length === 0 ? (
                        <div className="text-center p-8 text-muted-foreground">No pending items selected.</div>
                    ) : (
                        <Table>
                            <TableHeader className="bg-slate-50/50">
                                <TableRow className="border-b border-slate-100 uppercase tracking-tighter font-black text-[9px] sm:text-xs">
                                    <TableHead className="px-2 sm:px-4 py-3">Guest & Details</TableHead>
                                    <TableHead className="px-2 sm:px-4 py-3 hidden md:table-cell">Target Price</TableHead>
                                    <TableHead className="px-2 sm:px-4 py-3 min-w-[110px] sm:min-w-[200px]">Assignment</TableHead>
                                    <TableHead className="px-2 sm:px-4 py-3 hidden lg:table-cell">Diff</TableHead>
                                    <TableHead className="px-2 sm:px-4 py-3 text-right">Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {plan.items.map(item => {
                                    const selectedRoomIds = selections[item.reservationId] || [];
                                    const requestedCount = item.requestedRoomCount || 1;

                                    // Helper to find room details
                                    const getRoomDetails = (rId: number) => item.candidateRooms.find(r => r.roomId === rId);

                                    return (
                                        <TableRow key={item.reservationId} className="group hover:bg-blue-50/20 transition-colors">
                                            <TableCell className="align-top py-3 px-2 sm:px-4">
                                                <div className="font-black text-slate-900 text-[10px] sm:text-sm uppercase tracking-tight truncate max-w-[80px] sm:max-w-none">
                                                    {item.guestName}
                                                </div>
                                                <div className="flex items-center gap-1 mt-0.5 text-[8px] sm:text-[10px] font-bold text-slate-400">
                                                    <Hash className="w-2 sm:w-3 h-2 sm:h-3" />
                                                    <span>{item.bookingNumber}</span>
                                                </div>
                                                <div className="flex items-center gap-1 mt-1 text-[8px] sm:text-[10px] font-bold text-blue-600/80">
                                                    <CalendarDays className="w-2 sm:w-3 h-2 sm:h-3" />
                                                    <span>{item.checkInDate.split('T')[0]} → {item.checkOutDate.split('T')[0]}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="align-top py-3 px-2 sm:px-4 hidden md:table-cell">
                                                <div className="font-bold text-slate-900">
                                                    {item.targetNightlyPrice ? formatCurrency(item.targetNightlyPrice) : '—'}
                                                </div>
                                                {requestedCount > 1 && item.targetNightlyPrice && (
                                                    <div className="text-[10px] text-slate-400 font-bold">
                                                        ({formatCurrency(item.targetNightlyPrice / requestedCount)}/r)
                                                    </div>
                                                )}
                                            </TableCell>
                                            <TableCell className="align-top py-3 px-2 sm:px-4">
                                                <div className="flex flex-col gap-1.5">
                                                    {Array.from({ length: requestedCount }).map((_, idx) => {
                                                        const currentRoomId = selectedRoomIds[idx];
                                                        return (
                                                            <div key={idx} className="flex gap-1 items-center">
                                                                {requestedCount > 1 && <span className="text-[8px] font-black text-slate-300 w-3">#{idx + 1}</span>}
                                                                {item.candidateRooms.length > 0 ? (
                                                                    <div className="relative w-full">
                                                                        <select
                                                                            className="w-full h-7 sm:h-9 rounded-lg border border-slate-200 bg-white px-2 py-0 text-[10px] sm:text-xs font-bold text-slate-700 shadow-sm focus:ring-1 focus:ring-blue-500 outline-none"
                                                                            value={currentRoomId || ''}
                                                                            onChange={(e) => handleRoomChange(item.reservationId, idx, parseInt(e.target.value))}
                                                                        >
                                                                            <option value="" disabled>Select Room...</option>
                                                                            {item.candidateRooms.map(room => {
                                                                                const isSelectedElsewhere = selectedRoomIds.some((id, otherIdx) => id === room.roomId && otherIdx !== idx);
                                                                                return (
                                                                                    <option key={room.roomId} value={room.roomId} disabled={isSelectedElsewhere}>
                                                                                        {room.roomNumber} - {formatCurrency(room.roomPrice)}
                                                                                    </option>
                                                                                );
                                                                            })}
                                                                        </select>
                                                                    </div>
                                                                ) : (
                                                                    <span className="text-rose-600 text-[10px] font-black uppercase tracking-tight">No Rooms</span>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                    {item.warnings.map((w, i) => (
                                                        <div key={i} className="text-rose-500 text-[8px] font-bold leading-none mt-1">{w}</div>
                                                    ))}
                                                </div>
                                            </TableCell>
                                            <TableCell className="align-top py-3 px-2 sm:px-4 hidden lg:table-cell">
                                                {selectedRoomIds.map((rId, idx) => {
                                                    const room = getRoomDetails(rId);
                                                    if (!room || !item.targetNightlyPrice) return null;

                                                    const targetPerRoom = item.targetNightlyPrice / requestedCount;
                                                    const diff = room.roomPrice - targetPerRoom;

                                                    return (
                                                        <div key={idx} className={cn(
                                                            "text-[10px] font-black h-7 sm:h-9 flex items-center",
                                                            diff > 0.01 ? "text-amber-600" : diff < -0.01 ? "text-emerald-600" : "text-slate-400"
                                                        )}>
                                                            {diff > 0 ? '+' : ''}
                                                            {formatCurrency(diff)}
                                                        </div>
                                                    );
                                                })}
                                            </TableCell>
                                            <TableCell className="align-top py-3 px-2 sm:px-4 text-right">
                                                {(() => {
                                                    if (item.status !== 'Proposed') return getStatusBadge(item.status);

                                                    // Calculate total difference
                                                    let totalDiff = 0;
                                                    let hasSelection = false;

                                                    selectedRoomIds.forEach(rId => {
                                                        const room = getRoomDetails(rId);
                                                        if (room && item.targetNightlyPrice) {
                                                            const targetPerRoom = item.targetNightlyPrice / requestedCount;
                                                            totalDiff += (room.roomPrice - targetPerRoom);
                                                            hasSelection = true;
                                                        }
                                                    });

                                                    if (!hasSelection) return getStatusBadge('Pending');

                                                    if (Math.abs(totalDiff) < 0.01) {
                                                        return <span className="bg-slate-50 text-slate-400 border-slate-100 font-black text-[8px] sm:text-[9px] uppercase tracking-widest px-1.5 py-0.5 rounded border">Match</span>;
                                                    }

                                                    const isExtra = totalDiff > 0;
                                                    return (
                                                        <span className={cn(
                                                            "font-black text-[8px] sm:text-[9px] uppercase tracking-widest px-1.5 py-0.5 rounded border whitespace-nowrap",
                                                            isExtra ? "bg-amber-50 text-amber-600 border-amber-100" : "bg-emerald-50 text-emerald-600 border-emerald-100"
                                                        )}>
                                                            {isExtra ? '+' : ''}{formatCurrency(totalDiff).replace('$', '')}
                                                        </span>
                                                    );
                                                })()}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    )}
                </div>

                <DialogFooter className="gap-2 sm:gap-0">
                    <div className="flex-1 flex items-center text-sm text-muted-foreground">
                        {readyCount} of {totalCount} ready to confirm.
                    </div>
                    <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleConfirm}
                        disabled={isSubmitting || readyCount === 0 || isLoading}
                        className={hasIssues ? "bg-amber-600 hover:bg-amber-700" : ""}
                    >
                        {isSubmitting ? "Confirming..." : `Confirm ${readyCount} Reservations`}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
