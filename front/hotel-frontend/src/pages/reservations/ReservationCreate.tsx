import { useState } from 'react';
import { useAdminListings } from '@/hooks/admin/useAdminListings';
import { parseISO, format } from 'date-fns';
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useReservationActions } from '@/hooks/reservations/useReservationActions';
import { useRoomTypes } from '@/hooks/rooms/useRoomTypes';
import { useRooms } from '@/hooks/rooms/useRooms';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    ArrowLeft,
    Save,
    Calendar,
    User,
    Bed,
    Plus,
    Trash2,
    Info,
    CreditCard,
    Building2,
    Banknote
} from 'lucide-react';
import { extractErrorMessage } from '@/lib/utils';
import type { CreateReservationCommand } from '@/api/types/reservations';
import { PaymentMethodEnum, CurrencyCodeEnum } from '@/api/types/reservations';
import type { PaymentMethodValue, CurrencyCodeValue } from '@/api/types/reservations';

interface ReservationLineFormState {
    roomTypeId: number;
    roomId: number;
    ratePerNight: number;
}

const ReservationCreate = () => {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const { create } = useReservationActions();
    const { data: roomTypes } = useRoomTypes();
    const { data: rooms } = useRooms();
    const { data: listings } = useAdminListings(false);

    // Basic Header Info
    const [formData, setFormData] = useState({
        guestName: '',
        email: '',
        phone: '',
        checkInDate: '',
        checkOutDate: '',
        paidAtArrival: true,
        currency: 'USD',
        // Phase 7.1 fields
        hotelName: '',
        balanceDue: 0,
        paymentMethod: PaymentMethodEnum.Cash as PaymentMethodValue,
        currencyCode: CurrencyCodeEnum.USD as CurrencyCodeValue,
        currencyOther: ''
    });

    // Lines
    const [lines, setLines] = useState<ReservationLineFormState[]>([
        { roomTypeId: 0, roomId: 0, ratePerNight: 0 }
    ]);

    const handleHeaderChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        const checked = (e.target as HTMLInputElement).checked;

        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleSelectChange = (name: string, value: string | number) => {
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleLineChange = (index: number, field: keyof ReservationLineFormState, value: number) => {
        const newLines = [...lines];
        newLines[index] = { ...newLines[index], [field]: value };

        // If room type changed, set default rate
        if (field === 'roomTypeId' && roomTypes) {
            const rt = roomTypes.find(t => t.id === value);
            if (rt) {
                newLines[index].ratePerNight = rt.defaultRate;
            }
        }

        setLines(newLines);
    };

    const addLine = () => {
        setLines([...lines, { roomTypeId: 0, roomId: 0, ratePerNight: 0 }]);
    };

    const removeLine = (index: number) => {
        if (lines.length === 1) return;
        setLines(lines.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validation
        if (lines.some(l => l.roomId === 0)) {
            toast.error('Please select a room for all lines.');
            return;
        }

        // CurrencyOther validation
        if (formData.currencyCode === CurrencyCodeEnum.Other && !formData.currencyOther.trim()) {
            toast.error(t('reservations.currency_other_required', 'Please specify the currency name.'));
            return;
        }

        try {
            const command: CreateReservationCommand = {
                ...formData,
                // Backend expects DateTime strings, so we ensure ISO format
                checkInDate: new Date(formData.checkInDate).toISOString(),
                checkOutDate: new Date(formData.checkOutDate).toISOString(),
                hotelName: formData.hotelName || null,
                balanceDue: Number(formData.balanceDue) || 0,
                currencyOther: formData.currencyCode === CurrencyCodeEnum.Other ? formData.currencyOther : null,
                lines: lines.map(l => ({
                    roomId: l.roomId,
                    ratePerNight: l.ratePerNight
                }))
            };

            const result = await create.mutateAsync(command);
            toast.success('Reservation created successfully!');
            navigate(`/reservations/${result.id}`);
        } catch (err: unknown) {
            const errorMessage = extractErrorMessage(err);
            if (errorMessage === 'Cannot create reservation with a past check-in date.') {
                toast.error(t('errors.past_date', 'الحجز لم يتم لأن تاريخ الوصول في الماضي'));
            } else {
                toast.error(errorMessage);
            }
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center gap-3">
                <Button
                    variant="outline"
                    size="icon"
                    onClick={() => navigate('/reservations')}
                    className="h-10 w-10 rounded-full border-slate-200 shadow-sm hover:bg-slate-50 transition-all active:scale-95"
                >
                    <ArrowLeft className="w-5 h-5 text-slate-600" />
                </Button>
                <div className="space-y-0.5">
                    <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-none uppercase">
                        {t('reservations.create_new', 'New Reservation')}
                    </h1>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        {t('reservations.fill_details_to_confirm', 'Fill details to confirm booking')}
                    </div>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Left Column: Guest Info */}
                    <div className="md:col-span-2 space-y-6">
                        <Card className="border-none shadow-sm">
                            <CardHeader>
                                <CardTitle className="text-sm font-medium text-slate-500 uppercase flex items-center gap-2">
                                    <User className="w-4 h-4" />
                                    {t('reservations.guest_info', 'Guest Information')}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="sm:col-span-2 space-y-2">
                                    <Label htmlFor="guestName">{t('name', 'Guest Name')}</Label>
                                    <Input
                                        id="guestName"
                                        name="guestName"
                                        value={formData.guestName}
                                        onChange={handleHeaderChange}
                                        required
                                        placeholder="Full name"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="email">{t('email', 'Email')}</Label>
                                    <Input
                                        id="email"
                                        name="email"
                                        type="email"
                                        value={formData.email}
                                        onChange={handleHeaderChange}
                                        placeholder="email@example.com"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="phone">{t('phone', 'Phone')}</Label>
                                    <Input
                                        id="phone"
                                        name="phone"
                                        value={formData.phone}
                                        onChange={handleHeaderChange}
                                        placeholder="+1 234 567 890"
                                    />
                                </div>
                            </CardContent>
                        </Card>

                        {/* Hotel Info */}
                        <Card className="border-none shadow-sm">
                            <CardHeader>
                                <CardTitle className="text-sm font-medium text-slate-500 uppercase flex items-center gap-2">
                                    <Building2 className="w-4 h-4" />
                                    {t('reservations.hotel_info', 'Hotel Information')}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="hotelName">{t('reservations.source', 'Source / Listing')}</Label>
                                    <select
                                        id="hotelName"
                                        name="hotelName"
                                        value={formData.hotelName}
                                        onChange={handleHeaderChange}
                                        className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950"
                                    >
                                        <option value="" disabled>Select Hotel</option>
                                        {listings?.map(listing => (
                                            <option key={listing.id} value={listing.name}>
                                                {listing.name}
                                            </option>
                                        ))}
                                        <option value="Other">Other</option>
                                    </select>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Stay Info */}
                        <Card className="border-none shadow-sm">
                            <CardHeader>
                                <CardTitle className="text-sm font-medium text-slate-500 uppercase flex items-center gap-2">
                                    <Calendar className="w-4 h-4" />
                                    {t('reservations.stay_info', 'Stay Details')}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="grid grid-cols-2 gap-4">
                                <div className="col-span-2 space-y-2">
                                    <Label>{t('period', 'Stay Period')}</Label>
                                    <DatePickerWithRange
                                        date={{
                                            from: formData.checkInDate ? parseISO(formData.checkInDate) : undefined,
                                            to: formData.checkOutDate ? parseISO(formData.checkOutDate) : undefined
                                        }}
                                        setDate={(range) => {
                                            setFormData(prev => ({
                                                ...prev,
                                                checkInDate: range?.from ? format(range.from, 'yyyy-MM-dd') : '',
                                                checkOutDate: range?.to ? format(range.to, 'yyyy-MM-dd') : ''
                                            }));
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
                                <Button type="button" variant="outline" size="sm" onClick={addLine}>
                                    <Plus className="w-4 h-4 me-1" />
                                    {t('reservations.add_line', 'Add Room')}
                                </Button>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {lines.map((line, index) => (
                                    <div key={index} className="p-4 bg-slate-50 rounded-xl space-y-4 relative group">
                                        {lines.length > 1 && (
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className="absolute top-2 right-2 text-slate-300 hover:text-red-500"
                                                onClick={() => removeLine(index)}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        )}
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                            <div className="space-y-2">
                                                <Label>{t('rooms.room_type', 'Room Type')}</Label>
                                                <select
                                                    className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950"
                                                    value={line.roomTypeId}
                                                    onChange={(e) => handleLineChange(index, 'roomTypeId', Number(e.target.value))}
                                                    required
                                                >
                                                    <option value={0} disabled>Select Type</option>
                                                    {roomTypes?.map(rt => (
                                                        <option key={rt.id} value={rt.id}>{rt.name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="space-y-2">
                                                <Label>{t('rooms.room', 'Room')}</Label>
                                                <select
                                                    className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950"
                                                    value={line.roomId}
                                                    onChange={(e) => handleLineChange(index, 'roomId', Number(e.target.value))}
                                                    required
                                                >
                                                    <option value={0} disabled>Select Room</option>
                                                    {rooms?.filter(r => r.roomTypeId === line.roomTypeId || line.roomTypeId === 0).map(r => (
                                                        <option key={r.id} value={r.id}>{r.roomNumber}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="space-y-2">
                                                <Label>{t('reservations.rate_per_night', 'Rate per Night')}</Label>
                                                <Input
                                                    type="number"
                                                    value={line.ratePerNight}
                                                    onChange={(e) => handleLineChange(index, 'ratePerNight', Number(e.target.value))}
                                                    required
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Right Column: Summary & Actions */}
                    <div className="space-y-6">
                        {/* Financial Card */}
                        <Card className="border-none shadow-sm">
                            <CardHeader>
                                <CardTitle className="text-sm font-medium text-slate-500 uppercase flex items-center gap-2">
                                    <Banknote className="w-4 h-4" />
                                    {t('reservations.financial_info', 'Financial Details')}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label>{t('reservations.currency', 'Currency')}</Label>
                                    <select
                                        className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950"
                                        value={formData.currencyCode}
                                        onChange={(e) => {
                                            const val = Number(e.target.value) as CurrencyCodeValue;
                                            handleSelectChange('currencyCode', val);
                                            // Also sync the old currency string field
                                            const currencyMap: Record<number, string> = { 1: 'EGP', 2: 'USD', 3: 'EUR' };
                                            handleSelectChange('currency', currencyMap[val] || 'OTH');
                                        }}
                                    >
                                        <option value={CurrencyCodeEnum.EGP}>EGP - جنيه مصري</option>
                                        <option value={CurrencyCodeEnum.USD}>USD - دولار</option>
                                        <option value={CurrencyCodeEnum.EUR}>EUR - يورو</option>
                                        <option value={CurrencyCodeEnum.Other}>{t('other', 'Other')}</option>
                                    </select>
                                </div>

                                {formData.currencyCode === CurrencyCodeEnum.Other && (
                                    <div className="space-y-2">
                                        <Label>{t('reservations.currency_other', 'Currency Name')}</Label>
                                        <Input
                                            name="currencyOther"
                                            value={formData.currencyOther}
                                            onChange={handleHeaderChange}
                                            placeholder="e.g. GBP, SAR"
                                            maxLength={12}
                                            required
                                        />
                                    </div>
                                )}

                                <div className="space-y-2">
                                    <Label>{t('reservations.payment_method', 'Payment Method')}</Label>
                                    <select
                                        className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950"
                                        value={formData.paymentMethod}
                                        onChange={(e) => handleSelectChange('paymentMethod', Number(e.target.value))}
                                    >
                                        <option value={PaymentMethodEnum.Cash}>{t('reservations.cash', 'Cash')}</option>
                                        <option value={PaymentMethodEnum.Visa}>{t('reservations.visa', 'Visa')}</option>
                                        <option value={PaymentMethodEnum.Other}>{t('other', 'Other')}</option>
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="balanceDue">{t('reservations.balance_due', 'Balance Due')}</Label>
                                    <Input
                                        id="balanceDue"
                                        name="balanceDue"
                                        type="number"
                                        min={0}
                                        step="0.01"
                                        value={formData.balanceDue}
                                        onChange={handleHeaderChange}
                                        placeholder="0.00"
                                    />
                                    <p className="text-xs text-slate-400 flex items-start gap-1">
                                        <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
                                        {t('reservations.balance_due_hint', 'Remaining unpaid amount')}
                                    </p>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Payment Summary Card */}
                        <Card className="border-none shadow-sm bg-slate-900 text-white sticky top-6">
                            <CardHeader>
                                <CardTitle className="text-xs font-medium text-slate-400 uppercase flex items-center gap-2">
                                    <CreditCard className="w-4 h-4" />
                                    {t('reservations.payment', 'Payment')}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            id="paidAtArrival"
                                            name="paidAtArrival"
                                            checked={formData.paidAtArrival}
                                            onChange={handleHeaderChange}
                                            className="rounded border-slate-700 bg-slate-800 text-blue-500 focus:ring-blue-500"
                                        />
                                        <Label htmlFor="paidAtArrival" className="text-sm font-medium cursor-pointer">
                                            {t('reservations.pay_at_arrival', 'Pay at Arrival')}
                                        </Label>
                                    </div>
                                    <div className="text-xs text-slate-500 flex items-start gap-2">
                                        <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
                                        <span>{t('reservations.payment_hint', 'Check if the guest will pay upon reaching the hotel.')}</span>
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-slate-800 space-y-4">
                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center text-xs text-slate-500">
                                            <span>{t('reservations.nights', 'Nights')}</span>
                                            <span>
                                                {formData.checkInDate && formData.checkOutDate
                                                    ? Math.max(0, Math.ceil((new Date(formData.checkOutDate).getTime() - new Date(formData.checkInDate).getTime()) / (1000 * 60 * 60 * 24)))
                                                    : 0}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-slate-400">{t('total', 'Total Estimate')}</span>
                                            <span className="font-bold text-lg">
                                                {formData.currency} {(() => {
                                                    const nights = formData.checkInDate && formData.checkOutDate
                                                        ? Math.max(0, Math.ceil((new Date(formData.checkOutDate).getTime() - new Date(formData.checkInDate).getTime()) / (1000 * 60 * 60 * 24)))
                                                        : 0;
                                                    const nightlyTotal = lines.reduce((sum, l) => sum + (l.ratePerNight || 0), 0);
                                                    return (nightlyTotal * (nights || 1)).toFixed(2);
                                                })()}
                                            </span>
                                        </div>
                                    </div>
                                    <Button
                                        type="submit"
                                        className="w-full bg-white text-slate-900 hover:bg-slate-100 h-12 text-md font-bold"
                                        disabled={create.isPending}
                                    >
                                        <Save className="w-5 h-5 me-2" />
                                        {create.isPending ? t('saving', 'Saving...') : t('save_reservation', 'Save Reservation')}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </form>
        </div>
    );
};

export default ReservationCreate;
