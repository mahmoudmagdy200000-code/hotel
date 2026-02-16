import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react';
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

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'Proposed': return <Badge className="bg-green-600"><CheckCircle2 className="w-3 h-3 mr-1" /> Ready</Badge>;
            case 'NeedsManual': return <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1" /> Manual</Badge>;
            case 'PriceUnknown': return <Badge variant="secondary"><AlertTriangle className="w-3 h-3 mr-1" /> Check Price</Badge>;
            case 'NoRooms': return <Badge variant="destructive">No Rooms</Badge>;
            default: return <Badge variant="outline">{status}</Badge>;
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
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Guest</TableHead>
                                    <TableHead>Dates</TableHead>
                                    <TableHead>Target Price</TableHead>
                                    <TableHead className="min-w-[200px]">Room Selection</TableHead>
                                    <TableHead>Difference</TableHead>
                                    <TableHead className="w-[100px]">Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {plan.items.map(item => {
                                    const selectedRoomIds = selections[item.reservationId] || [];
                                    const requestedCount = item.requestedRoomCount || 1;

                                    // Helper to find room details
                                    const getRoomDetails = (rId: number) => item.candidateRooms.find(r => r.roomId === rId);

                                    return (
                                        <TableRow key={item.reservationId}>
                                            <TableCell className="align-top">
                                                <div className="font-medium">{item.guestName}</div>
                                                <div className="text-xs text-muted-foreground">{item.bookingNumber}</div>
                                                {requestedCount > 1 && (
                                                    <Badge variant="outline" className="mt-1 text-[10px] h-5 bg-slate-50">
                                                        {requestedCount} Rooms
                                                    </Badge>
                                                )}
                                            </TableCell>
                                            <TableCell className="align-top">
                                                <div className="text-sm">
                                                    {item.checkInDate.split('T')[0]} <ArrowRight className="inline w-3 h-3" /> {item.checkOutDate.split('T')[0]}
                                                </div>
                                            </TableCell>
                                            <TableCell className="align-top">
                                                <div className="font-medium">
                                                    {item.targetNightlyPrice ? formatCurrency(item.targetNightlyPrice) : '—'}
                                                </div>
                                                {requestedCount > 1 && item.targetNightlyPrice && (
                                                    <div className="text-xs text-muted-foreground">
                                                        ({formatCurrency(item.targetNightlyPrice / requestedCount)} / room)
                                                    </div>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col gap-2">
                                                    {Array.from({ length: requestedCount }).map((_, idx) => {
                                                        const currentRoomId = selectedRoomIds[idx];
                                                        return (
                                                            <div key={idx} className="flex gap-2 items-center">
                                                                {requestedCount > 1 && <span className="text-xs text-muted-foreground w-4">#{idx + 1}</span>}
                                                                {item.candidateRooms.length > 0 ? (
                                                                    <div className="relative w-full">
                                                                        <select
                                                                            className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors md:text-sm"
                                                                            value={currentRoomId || ''}
                                                                            onChange={(e) => handleRoomChange(item.reservationId, idx, parseInt(e.target.value))}
                                                                        >
                                                                            <option value="" disabled>Select Room...</option>
                                                                            {item.candidateRooms.map(room => {
                                                                                const isSelectedElsewhere = selectedRoomIds.some((id, otherIdx) => id === room.roomId && otherIdx !== idx);
                                                                                return (
                                                                                    <option key={room.roomId} value={room.roomId} disabled={isSelectedElsewhere}>
                                                                                        {room.roomNumber} ({room.roomTypeName}) - {formatCurrency(room.roomPrice)}
                                                                                    </option>
                                                                                );
                                                                            })}
                                                                        </select>
                                                                    </div>
                                                                ) : (
                                                                    <span className="text-destructive text-sm font-medium">No available rooms</span>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                    {item.warnings.map((w, i) => (
                                                        <div key={i} className="text-destructive text-xs">{w}</div>
                                                    ))}
                                                </div>
                                            </TableCell>
                                            <TableCell className="align-top">
                                                {selectedRoomIds.map((rId, idx) => {
                                                    const room = getRoomDetails(rId);
                                                    if (!room || !item.targetNightlyPrice) return null;

                                                    const targetPerRoom = item.targetNightlyPrice / requestedCount;
                                                    const diff = room.roomPrice - targetPerRoom;

                                                    return (
                                                        <div key={idx} className={cn(
                                                            "text-sm font-medium h-9 flex items-center",
                                                            diff > 0.01 ? "text-amber-600" : diff < -0.01 ? "text-emerald-600" : "text-slate-500"
                                                        )}>
                                                            {diff > 0 ? '+' : ''}
                                                            {formatCurrency(diff)}
                                                        </div>
                                                    );
                                                })}
                                            </TableCell>
                                            <TableCell className="align-top">
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

                                                    if (!hasSelection) return <Badge variant="outline">Pending</Badge>;

                                                    if (totalDiff > 0.01) {
                                                        return <Badge className="bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100">+{formatCurrency(totalDiff)} (Extra)</Badge>;
                                                    } else if (totalDiff < -0.01) {
                                                        return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-100">{formatCurrency(totalDiff)} (Save)</Badge>;
                                                    } else {
                                                        return <Badge className="bg-slate-100 text-slate-800 border-slate-200 hover:bg-slate-100">Exact Match</Badge>;
                                                    }
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
