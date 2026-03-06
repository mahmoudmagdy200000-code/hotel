import { useTranslation } from 'react-i18next';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Home, Bed, Info, CheckCircle2 } from 'lucide-react';
import type { BookingDisplayData } from '@/api/adapters/bookingAdapter';

interface AssignRoomBottomSheetProps {
    isOpen: boolean;
    onClose: () => void;
    booking: BookingDisplayData | null;
}

export const AssignRoomBottomSheet = ({
    isOpen,
    onClose,
    booking
}: AssignRoomBottomSheetProps) => {
    const { t } = useTranslation();

    if (!booking) return null;

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[425px] rounded-t-3xl sm:rounded-2xl border-none p-0 overflow-hidden bg-slate-50">
                <DialogHeader className="p-6 bg-white border-b border-slate-100">
                    <DialogTitle className="flex items-center gap-2 text-xl font-black tracking-tight text-slate-900">
                        <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                            <Home className="w-4 h-4" />
                        </div>
                        {t('reception.select_available_room', 'Select Room')}
                    </DialogTitle>
                    <DialogDescription className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">
                        {booking.guestName} • {booking.roomTypeNames.join(', ')}
                    </DialogDescription>
                </DialogHeader>

                <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
                    {/* Placeholder Info Box */}
                    <div className="flex gap-3 p-4 bg-blue-50/50 border border-blue-100 rounded-2xl">
                        <Info className="w-5 h-5 text-blue-500 flex-shrink-0" />
                        <div className="space-y-1">
                            <p className="text-xs font-black text-blue-900 uppercase tracking-tight">Manual Assignment Enabled</p>
                            <p className="text-[10px] text-blue-700 leading-relaxed font-bold">
                                Select a room from the list below. Only available rooms matching the requested type are shown.
                            </p>
                        </div>
                    </div>

                    {/* Placeholder Room List */}
                    <div className="grid grid-cols-1 gap-2">
                        {[101, 102, 103, 104, 201, 202].map((roomNumber) => (
                            <button
                                key={roomNumber}
                                onClick={() => {
                                    alert(`Room ${roomNumber} placeholder selected`);
                                    onClose();
                                }}
                                className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl hover:border-blue-200 hover:bg-blue-50/30 transition-all active:scale-[0.98] group"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-slate-50 text-slate-400 group-hover:bg-blue-100 group-hover:text-blue-600 flex items-center justify-center transition-colors">
                                        <Bed className="w-5 h-5" />
                                    </div>
                                    <div className="text-left">
                                        <p className="text-sm font-black text-slate-900 uppercase tracking-tight">Room {roomNumber}</p>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic leading-none mt-0.5">Standard Double</p>
                                    </div>
                                </div>
                                <CheckCircle2 className="w-5 h-5 text-slate-100 group-hover:text-blue-500 transition-colors" />
                            </button>
                        ))}
                    </div>
                </div>

                <DialogFooter className="p-4 bg-white border-t border-slate-100 sm:flex-row gap-2">
                    <Button
                        variant="ghost"
                        className="flex-1 h-12 rounded-xl font-black text-[11px] uppercase tracking-widest text-slate-500 hover:bg-slate-50 active:scale-95 transition-all"
                        onClick={onClose}
                    >
                        {t('common.cancel', 'Cancel')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
