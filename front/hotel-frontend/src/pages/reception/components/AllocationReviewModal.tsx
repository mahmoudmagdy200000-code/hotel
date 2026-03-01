import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CalendarDays, Hash, ArrowLeft, Bed, Users, Tag } from 'lucide-react';
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
                return <span className={cn(base, "bg-emerald-50 text-emerald-600 border-emerald-100", className)}>{t('ready', 'Ready')}</span>;
            case 'NeedsManual':
                return <span className={cn(base, "bg-amber-50 text-amber-600 border-amber-100", className)}>{t('manual', 'Manual')}</span>;
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
                <DialogHeader className="flex flex-row items-center gap-3 space-y-0">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="sm:hidden h-10 w-10 -ml-2 rounded-full hover:bg-slate-100"
                        onClick={onClose}
                    >
                        <ArrowLeft className="h-5 w-5 text-slate-500" />
                    </Button>
                    <div className="space-y-1 text-left">
                        <DialogTitle>{t('reception.review_allocation_plan', 'Review Room Assignments')}</DialogTitle>
                        <DialogDescription className="hidden sm:block">
                            {t('reception.review_allocation_desc', 'Review and adjust proposed room assignments before confirming. Prices are matched to the closest available room.')}
                        </DialogDescription>
                    </div>
                </DialogHeader>

                <div className="flex-1 overflow-auto py-4">
                    {isLoading ? (
                        <div className="flex items-center justify-center p-8">Loading plan...</div>
                    ) : !plan || plan.items.length === 0 ? (
                        <div className="text-center p-8 text-muted-foreground">No pending items selected.</div>
                    ) : (
                        <div className="space-y-3 px-0.5">
                            {plan.items.map(item => {
                                const selectedRoomIds = selections[item.reservationId] || [];
                                const requestedCount = item.requestedRoomCount || 1;
                                const getRoomDetails = (rId: number) => item.candidateRooms.find(r => r.roomId === rId);

                                return (
                                    <div key={item.reservationId} className="group border border-slate-100 rounded-2xl bg-white shadow-sm p-4 hover:bg-slate-50/50 transition-all">
                                        <div className="flex flex-col md:flex-row md:items-center gap-5">
                                            {/* Mobile Header / Desktop Column 1: Guest Info */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between md:block">
                                                    <div className="font-black text-slate-900 text-sm sm:text-base uppercase tracking-tight truncate pr-2">
                                                        {item.guestName}
                                                    </div>
                                                    <div className="md:hidden">
                                                        {getStatusBadge(item.status)}
                                                    </div>
                                                </div>

                                                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-2">
                                                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400">
                                                        <Hash className="w-3 h-3" />
                                                        <span>{item.bookingNumber}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-blue-600/80">
                                                        <CalendarDays className="w-3 h-3" />
                                                        <span>{item.checkInDate.split('T')[0]} → {item.checkOutDate.split('T')[0]}</span>
                                                    </div>
                                                </div>

                                                {/* PDF Metadata Enrichment */}
                                                {(item.requestedRoomHint || item.guestCount || item.otaPrice) && (
                                                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 border-t border-slate-50 pt-2">
                                                        {item.requestedRoomHint && (
                                                            <div className="flex items-center gap-1.5 text-[10px] font-medium text-slate-500">
                                                                <Bed className="w-3.5 h-3.5 text-slate-400" />
                                                                <span className="truncate max-w-[120px] sm:max-w-none">{item.requestedRoomHint}</span>
                                                            </div>
                                                        )}
                                                        {item.guestCount && (
                                                            <div className="flex items-center gap-1.5 text-[10px] font-medium text-slate-500">
                                                                <Users className="w-3.5 h-3.5 text-slate-400" />
                                                                <span>{item.guestCount} {item.guestCount === 1 ? 'Guest' : 'Guests'}</span>
                                                            </div>
                                                        )}
                                                        {item.otaPrice && (
                                                            <div className="flex items-center gap-1.5 text-[10px] font-medium text-emerald-600">
                                                                <Tag className="w-3.5 h-3.5 text-emerald-400" />
                                                                <span>OTA: {formatCurrency(item.otaPrice)}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Desktop Column 2: Price (Hidden on mobile as it's less critical for quick assignments) */}
                                            <div className="hidden md:block w-32 shrink-0">
                                                <div className="text-[10px] uppercase font-black text-slate-400 tracking-wider mb-1">Target</div>
                                                <div className="font-bold text-slate-900">
                                                    {item.targetNightlyPrice ? formatCurrency(item.targetNightlyPrice) : '—'}
                                                </div>
                                                {requestedCount > 1 && item.targetNightlyPrice && (
                                                    <div className="text-[10px] text-slate-400 font-bold">
                                                        {formatCurrency(item.targetNightlyPrice / requestedCount)}/r
                                                    </div>
                                                )}
                                            </div>

                                            {/* Assignment Section: Vertical stack on mobile, flexible row on desktop */}
                                            <div className="flex-[2] space-y-2.5">
                                                <div className="md:hidden text-[10px] uppercase font-black text-slate-400 tracking-wider">Select Assignment</div>
                                                {Array.from({ length: requestedCount }).map((_, idx) => {
                                                    const currentRoomId = selectedRoomIds[idx];
                                                    const room = getRoomDetails(currentRoomId);

                                                    return (
                                                        <div key={idx} className="flex flex-col sm:flex-row gap-2 sm:items-center">
                                                            <div className="flex-1 relative">
                                                                {item.candidateRooms.length > 0 ? (
                                                                    <select
                                                                        className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 py-0 text-xs font-bold text-slate-700 shadow-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all appearance-none truncate"
                                                                        value={currentRoomId || ''}
                                                                        onChange={(e) => handleRoomChange(item.reservationId, idx, parseInt(e.target.value))}
                                                                    >
                                                                        <option value="" disabled>Select Room Assignment...</option>
                                                                        {item.candidateRooms
                                                                            .filter(c => {
                                                                                // Double Booking Prevention: 
                                                                                // Filter out rooms already selected in OTHER rows of THIS reservation
                                                                                const isSelectedElsewhere = selectedRoomIds.some((id, otherIdx) => id === c.roomId && otherIdx !== idx);
                                                                                return !isSelectedElsewhere;
                                                                            })
                                                                            .map(c => (
                                                                                <option key={c.roomId} value={c.roomId}>
                                                                                    {c.roomNumber} - {c.roomTypeName} - {formatCurrency(c.roomPrice)}
                                                                                </option>
                                                                            ))
                                                                        }
                                                                    </select>
                                                                ) : (
                                                                    <div className="h-10 flex items-center px-4 rounded-xl bg-rose-50 border border-rose-100 text-rose-600 text-[10px] font-black uppercase tracking-tight">
                                                                        No Rooms Available
                                                                    </div>
                                                                )}
                                                                {item.candidateRooms.length > 0 && (
                                                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                                                        <svg className="h-4 w-4 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" /></svg>
                                                                    </div>
                                                                )}
                                                            </div>

                                                            {/* Diff for this specific room - shown next to dropdown on large screens, or below on small */}
                                                            {room && item.targetNightlyPrice && (
                                                                <div className={cn(
                                                                    "shrink-0 font-black text-[10px] px-2 py-1 rounded-lg sm:bg-transparent",
                                                                    (room.roomPrice - (item.targetNightlyPrice / requestedCount)) > 0.01
                                                                        ? "bg-amber-50 text-amber-600"
                                                                        : (room.roomPrice - (item.targetNightlyPrice / requestedCount)) < -0.01
                                                                            ? "bg-emerald-50 text-emerald-600"
                                                                            : "bg-slate-50 text-slate-400"
                                                                )}>
                                                                    {(room.roomPrice - (item.targetNightlyPrice / requestedCount)) > 0 ? '+' : ''}
                                                                    {formatCurrency(room.roomPrice - (item.targetNightlyPrice / requestedCount))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                                {item.warnings.map((w, i) => (
                                                    <div key={i} className="flex items-center gap-1.5 text-rose-500 text-[10px] font-bold mt-1 bg-rose-50/50 w-fit px-2 py-0.5 rounded-md">
                                                        <span>⚠️</span> {w}
                                                    </div>
                                                ))}
                                            </div>

                                            {/* Desktop Status Badge & Total Diff */}
                                            <div className="hidden md:flex flex-col items-end gap-1.5 w-24 shrink-0">
                                                {getStatusBadge(item.status)}
                                                {(() => {
                                                    if (item.status !== 'Proposed') return null;

                                                    let totalDiff = 0;
                                                    let hasSelection = false;

                                                    selectedRoomIds.forEach(rId => {
                                                        const r = getRoomDetails(rId);
                                                        if (r && item.targetNightlyPrice) {
                                                            const targetPerRoom = item.targetNightlyPrice / requestedCount;
                                                            totalDiff += (r.roomPrice - targetPerRoom);
                                                            hasSelection = true;
                                                        }
                                                    });

                                                    if (!hasSelection) return null;

                                                    if (Math.abs(totalDiff) < 0.01) {
                                                        return <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Match</span>;
                                                    }

                                                    const isExtra = totalDiff > 0;
                                                    return (
                                                        <div className={cn(
                                                            "text-[10px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded border",
                                                            isExtra ? "bg-amber-50 text-amber-600 border-amber-100" : "bg-emerald-50 text-emerald-600 border-emerald-100"
                                                        )}>
                                                            {isExtra ? '+' : ''}{formatCurrency(totalDiff).replace('$', '')}
                                                        </div>
                                                    );
                                                })()}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
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
        </Dialog >
    );
}
