import React from 'react';
import { useFormContext } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { User, Building2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useAdminListings } from '@/hooks/admin/useAdminListings';
import type { ReservationFormValues } from '../hooks/useReservationForm';

export const GuestInformationSection: React.FC = () => {
    const { t } = useTranslation();
    const { register, watch, setValue } = useFormContext<ReservationFormValues>();
    const { data: listings } = useAdminListings(false);

    const selectedHotelName = watch('hotelName');

    return (
        <div className="space-y-6">
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
                            {...register('guestName', { required: true })}
                            placeholder="Full name"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="email">{t('email', 'Email')}</Label>
                        <Input
                            id="email"
                            type="email"
                            {...register('email')}
                            placeholder="email@example.com"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="phone">{t('phone', 'Phone')}</Label>
                        <Input
                            id="phone"
                            {...register('phone')}
                            placeholder="+1 234 567 890"
                        />
                    </div>
                </CardContent>
            </Card>

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
                            className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950"
                            value={selectedHotelName}
                            onChange={(e) => setValue('hotelName', e.target.value)}
                        >
                            <option value="" disabled>Select Hotel</option>
                            <option value="Walk-in">Walk-in</option>
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
        </div>
    );
};
