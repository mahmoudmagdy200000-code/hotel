import React from 'react';
import { useFormContext, useFieldArray } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { parseISO, format } from 'date-fns';
import { Calendar, Bed, Plus, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import { useRoomTypes } from '@/hooks/rooms/useRoomTypes';
import { useRooms } from '@/hooks/rooms/useRooms';
import type { ReservationFormValues } from '../hooks/useReservationForm';

export const StayInformationSection: React.FC = () => {
    const { t } = useTranslation();
    const { control, watch, setValue } = useFormContext<ReservationFormValues>();
    const { fields, append, remove } = useFieldArray({
        control,
        name: 'lines'
    });

    const { data: roomTypes } = useRoomTypes();
    const checkInDate = watch('checkInDate');
    const checkOutDate = watch('checkOutDate');

    const { data: rooms } = useRooms({
        availableFrom: checkInDate,
        availableTo: checkOutDate,
        isActive: true
    });

    const handleRoomTypeChange = (index: number, roomTypeId: number) => {
        setValue(`lines.${index}.roomTypeId`, roomTypeId);

        // Reset specific room when type changes
        setValue(`lines.${index}.roomId`, 0);

        // Fetch default rate
        const rt = roomTypes?.find(t => t.id === roomTypeId);
        if (rt) {
            setValue(`lines.${index}.ratePerNight`, rt.defaultRate);
        }
    };

    return (
        <div className="space-y-6">
            {/* Stay Period */}
            <Card className="border-none shadow-sm">
                <CardHeader>
                    <CardTitle className="text-sm font-medium text-slate-500 uppercase flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        {t('reservations.stay_info', 'Stay Details')}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-2">
                        <Label>{t('period', 'Stay Period')}</Label>
                        <DatePickerWithRange
                            date={{
                                from: checkInDate ? parseISO(checkInDate) : undefined,
                                to: checkOutDate ? parseISO(checkOutDate) : undefined
                            }}
                            setDate={(range) => {
                                setValue('checkInDate', range?.from ? format(range.from, 'yyyy-MM-dd') : '');
                                setValue('checkOutDate', range?.to ? format(range.to, 'yyyy-MM-dd') : '');
                            }}
                            className="w-full"
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Rooms List */}
            <Card className="border-none shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-sm font-medium text-slate-500 uppercase flex items-center gap-2">
                        <Bed className="w-4 h-4" />
                        {t('reservations.rooms', 'Rooms')}
                    </CardTitle>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => append({ roomTypeId: 0, roomId: 0, ratePerNight: 0 })}
                        className="h-8"
                    >
                        <Plus className="w-4 h-4 me-1" />
                        {t('reservations.add_line', 'Add Room')}
                    </Button>
                </CardHeader>
                <CardContent className="space-y-4">
                    {fields.map((field, index) => {
                        const currentLine = watch(`lines.${index}`);
                        const selectedRoomIds = fields.map((_, i) => watch(`lines.${i}.roomId`)).filter(id => id > 0);

                        return (
                            <div key={field.id} className="p-4 bg-slate-50 rounded-xl space-y-4 relative group">
                                {fields.length > 1 && (
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="absolute top-2 right-2 text-slate-300 hover:text-red-500 h-8 w-8"
                                        onClick={() => remove(index)}
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                )}
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                    <div className="space-y-2">
                                        <Label>{t('rooms.room_type', 'Room Type')}</Label>
                                        <select
                                            className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950"
                                            value={currentLine.roomTypeId}
                                            onChange={(e) => handleRoomTypeChange(index, Number(e.target.value))}
                                            required
                                        >
                                            <option value={0} disabled>Select Type</option>
                                            {roomTypes?.filter(rt => rt.isActive).map(rt => (
                                                <option key={rt.id} value={rt.id}>{rt.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>{t('rooms.room', 'Room')}</Label>
                                        <select
                                            className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950"
                                            value={currentLine.roomId}
                                            onChange={(e) => setValue(`lines.${index}.roomId`, Number(e.target.value))}
                                            required
                                        >
                                            <option value={0} disabled>Select Room</option>
                                            {rooms?.filter(r =>
                                                r.isActive &&
                                                (r.roomTypeId === currentLine.roomTypeId || currentLine.roomTypeId === 0) &&
                                                (!selectedRoomIds.includes(r.id) || r.id === currentLine.roomId)
                                            ).map(r => (
                                                <option key={r.id} value={r.id}>{r.roomNumber}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>{t('reservations.rate_per_night', 'Rate per Night')}</Label>
                                        <Input
                                            type="number"
                                            {...control.register(`lines.${index}.ratePerNight`, { valueAsNumber: true })}
                                            required
                                        />
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </CardContent>
            </Card>
        </div>
    );
};
