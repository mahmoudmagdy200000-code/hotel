import { useState, useEffect } from 'react';
import { parseISO, format } from 'date-fns';
import { DatePicker } from '@/components/ui/date-picker';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useReceptionSearch } from '@/features/reception/hooks/useReceptionSearch';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Search as SearchIcon,
    SearchX,
    ChevronRight
} from 'lucide-react';

const ReceptionSearch = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();

    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [searchDate, setSearchDate] = useState<string>('');

    // Debounce search term
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchTerm);
        }, 300);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    const { data, isLoading } = useReceptionSearch(debouncedSearch, searchDate || undefined);

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <h1 className="text-3xl font-bold tracking-tight text-slate-900">
                    {t('reception.search_title', 'Find Reservation')}
                </h1>
            </div>

            {/* Global Search Header */}
            <Card className="border-none shadow-md overflow-hidden bg-slate-900 text-white">
                <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="relative flex-grow">
                            <SearchIcon className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
                            <Input
                                placeholder={t('reception.search_placeholder', 'Search by guest name, phone, or booking number...')}
                                className="pl-10 h-11 bg-white/10 border-white/20 text-white placeholder:text-slate-400 focus-visible:ring-1 focus-visible:ring-white/30"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="relative w-full md:w-48">
                            <DatePicker
                                date={searchDate ? parseISO(searchDate) : undefined}
                                setDate={(d) => setSearchDate(d ? format(d, 'yyyy-MM-dd') : '')}
                                className="h-11 bg-white/10 border-white/20 text-white hover:bg-white/20 hover:text-white justify-start text-left font-normal w-full"
                                placeholder={t('filter_date', 'Filter by Date')}
                            />
                        </div>
                    </div>
                    {searchTerm.length > 0 && searchTerm.length < 2 && (
                        <p className="mt-2 text-xs text-slate-400">
                            {t('reception.search_hint', 'Type at least 2 characters to start searching...')}
                        </p>
                    )}
                </CardContent>
            </Card>

            {/* Results */}
            <div className="space-y-4">
                {isLoading ? (
                    <Card className="border-none shadow-sm overflow-hidden">
                        <Table>
                            <TableBody>
                                {Array(5).fill(0).map((_, i) => (
                                    <TableRow key={i}>
                                        <TableCell colSpan={6}><Skeleton className="h-12 w-full" /></TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </Card>
                ) : debouncedSearch.length >= 2 ? (
                    data?.results.length === 0 ? (
                        <div className="py-20 text-center flex flex-col items-center justify-center space-y-4">
                            <div className="p-4 bg-slate-100 rounded-full">
                                <SearchX className="w-10 h-10 text-slate-400" />
                            </div>
                            <h3 className="text-lg font-semibold text-slate-900">{t('reception.no_results_title', 'No matches found')}</h3>
                            <p className="text-slate-500 max-w-xs mx-auto">
                                {t('reception.no_results_desc', "We couldn't find any reservations matching your search query.")}
                            </p>
                        </div>
                    ) : (
                        <Card className="border-none shadow-sm overflow-hidden">
                            <Table>
                                <TableHeader className="bg-slate-50">
                                    <TableRow>
                                        <TableHead>{t('reservations.guest', 'Guest')}</TableHead>
                                        <TableHead>{t('reception.booking_number', 'Booking #')}</TableHead>
                                        <TableHead>{t('reservations.dates', 'Stay Dates')}</TableHead>
                                        <TableHead>{t('reception.room_types', 'Room Types')}</TableHead>
                                        <TableHead>{t('reservations.status', 'Status')}</TableHead>
                                        <TableHead className="w-10"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {data?.results.map((res) => (
                                        <TableRow
                                            key={res.reservationId}
                                            className="cursor-pointer hover:bg-slate-50 group"
                                            onClick={() => navigate(`/reservations/${res.reservationId}`)}
                                        >
                                            <TableCell>
                                                <div className="font-semibold text-slate-900">{res.guestName}</div>
                                                <div className="text-xs text-slate-500">{res.phone}</div>
                                            </TableCell>
                                            <TableCell className="text-sm font-mono">{res.bookingNumber}</TableCell>
                                            <TableCell>
                                                <div className="text-sm">{res.checkIn} → {res.checkOut}</div>
                                                <div className="text-xs text-slate-400">{res.totalNights} {t('nights', 'nights')}</div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-wrap gap-1">
                                                    {res.roomTypeNames.map(name => (
                                                        <Badge key={name} variant="outline" className="text-[10px] py-0">{name}</Badge>
                                                    ))}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="secondary" className="capitalize text-[10px]">
                                                    {res.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-900 transition-colors" />
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </Card>
                    )
                ) : (
                    <div className="py-20 text-center text-slate-400">
                        {t('reception.start_searching', 'Enter a name, phone, or booking number to find a reservation.')}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ReceptionSearch;
