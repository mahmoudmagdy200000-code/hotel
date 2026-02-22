import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAdminListings, useCreateListing, useUpdateListing } from '@/hooks/admin/useAdminListings';
import type { BranchListingDto } from '@/api/admin';
import { Card, CardContent } from '@/components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Dialog,
    DialogContent,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Plus, Edit2, CheckCircle, XCircle, Building2, Save, Globe, Smartphone, MousePointer2, Settings2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

const Listings = () => {
    const { t } = useTranslation();
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingListing, setEditingListing] = useState<BranchListingDto | null>(null);
    const [name, setName] = useState('');
    const [channel, setChannel] = useState('Manual');

    const { data: listings, isLoading } = useAdminListings(true);
    const createListing = useCreateListing();
    const updateListing = useUpdateListing();

    const stats = {
        total: listings?.length || 0,
        active: listings?.filter(l => l.isActive).length || 0,
        booking: listings?.filter(l => l.channel === 'Booking').length || 0,
        manual: listings?.filter(l => l.channel === 'Manual').length || 0
    };

    if (isLoading) {
        return (
            <div className="space-y-6 animate-pulse p-4">
                <div className="flex items-center gap-4">
                    <Skeleton className="w-12 h-12 rounded-2xl bg-slate-100" />
                    <div className="space-y-2">
                        <Skeleton className="h-6 w-48 bg-slate-100" />
                        <Skeleton className="h-4 w-64 bg-slate-100" />
                    </div>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 rounded-3xl bg-slate-50" />)}
                </div>
                <div className="space-y-4">
                    {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-24 rounded-3xl bg-slate-50" />)}
                </div>
            </div>
        );
    }

    const handleOpenDialog = (listing?: BranchListingDto) => {
        if (listing) {
            setEditingListing(listing);
            setName(listing.name);
            setChannel(listing.channel || 'Manual');
        } else {
            setEditingListing(null);
            setName('');
            setChannel('Manual');
        }
        setIsDialogOpen(true);
    };

    const handleSave = async () => {
        if (!name.trim()) {
            toast.error(t('reception.listing_required'));
            return;
        }

        try {
            if (editingListing) {
                await updateListing.mutateAsync({
                    id: editingListing.id,
                    name,
                    channel
                });
                toast.success(t('admin.listings.update_success'));
            } else {
                await createListing.mutateAsync({
                    name,
                    channel
                });
                toast.success(t('admin.listings.save_success'));
            }
            setIsDialogOpen(false);
        } catch (error: any) {
            toast.error(error.response?.data?.detail || 'Error saving listing');
        }
    };

    const handleToggleStatus = async (listing: BranchListingDto) => {
        try {
            await updateListing.mutateAsync({
                id: listing.id,
                isActive: !listing.isActive
            });
            toast.success(t('admin.listings.update_success'));
        } catch (error: any) {
            toast.error('Error updating status');
        }
    };

    return (
        <div className="space-y-6 pb-24 sm:pb-8">
            {/* STICKY NAVY ACTION BAR */}
            <div className="sticky top-0 z-40 -mx-4 sm:mx-0 px-4 py-4 bg-slate-900 shadow-2xl sm:rounded-3xl sm:static sm:bg-slate-900 border-b border-white/5">
                <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-white/10 rounded-2xl border border-white/5 backdrop-blur-xl">
                                <Building2 className="w-5 h-5 text-blue-400" />
                            </div>
                            <div>
                                <h1 className="text-sm font-black text-white uppercase tracking-tighter leading-none">
                                    {t('admin.listings.title', 'Property Channels')}
                                </h1>
                                <div className="flex items-center gap-1.5 mt-1">
                                    <span className={`w-1.5 h-1.5 rounded-full bg-emerald-500`} />
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">
                                        {t('admin.listings.subtitle', 'Revenue Stream Management')}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <Button
                                onClick={() => handleOpenDialog()}
                                className="bg-blue-600 hover:bg-blue-700 h-10 px-4 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-blue-900/40 active:scale-95 transition-all"
                            >
                                <Plus className="w-4 h-4 mr-1.5" />
                                {t('admin.listings.add_listing', 'Deploy Listing')}
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* KPI GRID */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 px-1 sm:px-0">
                <MetricCard
                    title="Total Listings"
                    value={stats.total}
                    icon={<Globe className="w-4 h-4 text-blue-600" />}
                    bg="bg-blue-100"
                    trend="Distribution Nodes"
                />
                <MetricCard
                    title="Active Sources"
                    value={stats.active}
                    icon={<CheckCircle className="w-4 h-4 text-emerald-600" />}
                    bg="bg-emerald-100"
                    trend="Operational"
                />
                <MetricCard
                    title="Booking.com"
                    value={stats.booking}
                    icon={<Smartphone className="w-4 h-4 text-amber-600" />}
                    bg="bg-amber-100"
                    trend="OTA Channel"
                />
                <MetricCard
                    title="Direct/Manual"
                    value={stats.manual}
                    icon={<MousePointer2 className="w-4 h-4 text-slate-600" />}
                    bg="bg-slate-100"
                    trend="Internal Input"
                />
            </div>

            {/* LISTINGS LEDGER */}
            <div className="space-y-4">
                <div className="flex items-center justify-between px-2">
                    <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter flex items-center gap-2">
                        <Settings2 className="w-5 h-5 text-slate-400" />
                        Distribution Matrix
                    </h2>
                </div>

                {/* MOBILE: LISTING CARDS */}
                <div className="grid grid-cols-1 gap-4 sm:hidden">
                    {listings && listings.length > 0 ? (
                        listings.map((item) => (
                            <div key={item.id} className="bg-white border border-slate-100 rounded-[32px] overflow-hidden shadow-sm p-6 space-y-5 relative active:scale-[0.99] transition-all group">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className={cn(
                                            "p-3 rounded-2xl shadow-lg transition-all",
                                            item.isActive ? "bg-slate-900 shadow-slate-900/20" : "bg-slate-100 shadow-none grayscale"
                                        )}>
                                            <Building2 className={cn("w-4 h-4", item.isActive ? "text-white" : "text-slate-400")} />
                                        </div>
                                        <div className="min-w-0">
                                            <h3 className="font-black text-slate-900 text-sm uppercase tracking-tighter truncate">{item.name}</h3>
                                            <div className="flex items-center gap-1.5 mt-0.5">
                                                <Badge variant="outline" className="text-[8px] font-black uppercase tracking-widest border-slate-100 h-4 px-1.5">
                                                    {item.channel}
                                                </Badge>
                                                <span className={cn(
                                                    "w-1 h-1 rounded-full",
                                                    item.isActive ? "bg-emerald-500" : "bg-slate-300"
                                                )} />
                                            </div>
                                        </div>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleOpenDialog(item)}
                                        className="h-10 w-10 rounded-xl hover:bg-slate-50 text-slate-400 hover:text-slate-900"
                                    >
                                        <Edit2 className="w-4 h-4" />
                                    </Button>
                                </div>

                                <div className="pt-2 border-t border-slate-50 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        {item.isActive ? (
                                            <div className="flex items-center gap-1 text-[10px] font-black text-emerald-600 uppercase tracking-widest">
                                                <CheckCircle className="w-3 h-3" />
                                                Operational
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-1 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                                <XCircle className="w-3 h-3" />
                                                Archived
                                            </div>
                                        )}
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleToggleStatus(item)}
                                        className={cn(
                                            "h-9 px-4 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all",
                                            item.isActive ? "text-rose-600 border-rose-100 hover:bg-rose-50" : "text-emerald-600 border-emerald-100 hover:bg-emerald-50"
                                        )}
                                    >
                                        {item.isActive ? 'Deactivate' : 'Activate'}
                                    </Button>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="flex flex-col items-center justify-center py-12 bg-slate-50/50 rounded-[32px] border border-dashed border-slate-200">
                            <Globe className="w-12 h-12 text-slate-200 mb-4" />
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No listings deployed</p>
                        </div>
                    )}
                </div>

                {/* DESKTOP: PREMIUM REGISTRY TABLE */}
                <div className="hidden sm:block rounded-[32px] border border-slate-100 shadow-sm overflow-hidden bg-white">
                    <Table>
                        <TableHeader className="bg-slate-50/50">
                            <TableRow className="border-b border-slate-100 font-black text-[10px] uppercase tracking-widest text-slate-400">
                                <TableHead className="px-8 py-5">Property Identity</TableHead>
                                <TableHead className="py-5">Ingestion Channel</TableHead>
                                <TableHead className="py-5">Status</TableHead>
                                <TableHead className="py-5 pr-8 text-right">Operations</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {listings && listings.length > 0 ? (
                                listings.map((item) => (
                                    <TableRow key={item.id} className="hover:bg-slate-50/50 transition-all group">
                                        <TableCell className="px-8 py-5">
                                            <div className="font-black text-slate-900 uppercase tracking-tighter text-xs">{item.name}</div>
                                            <div className="text-[9px] font-bold text-slate-300 uppercase tracking-widest mt-0.5 opacity-40 group-hover:opacity-100 transition-opacity">UID: {item.id}</div>
                                        </TableCell>
                                        <TableCell className="py-5">
                                            <Badge variant="outline" className="rounded-lg border-slate-100 font-black text-[9px] uppercase tracking-widest py-1 px-2.5 text-slate-500">
                                                {item.channel}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="py-5">
                                            {item.isActive ? (
                                                <div className="flex items-center gap-1.5 text-[10px] font-black text-emerald-600 uppercase tracking-widest">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-200" />
                                                    Active
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-1.5 text-[10px] font-black text-slate-300 uppercase tracking-widest">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-slate-200" />
                                                    Inactive
                                                </div>
                                            )}
                                        </TableCell>
                                        <TableCell className="py-5 pr-8 text-right space-x-2">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleToggleStatus(item)}
                                                className={cn(
                                                    "h-9 px-4 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all",
                                                    item.isActive ? "text-slate-400 hover:text-rose-600" : "text-emerald-600"
                                                )}
                                            >
                                                {item.isActive ? 'Suspend' : 'Resume'}
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleOpenDialog(item)}
                                                className="h-9 w-9 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-900"
                                            >
                                                <Edit2 className="w-4 h-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-40 text-center">
                                        <div className="flex flex-col items-center justify-center opacity-40">
                                            <Globe className="w-8 h-8 mb-2" />
                                            <span className="text-[10px] font-black uppercase tracking-widest">Empty Distribution Ledger</span>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>

            {/* DEPLOYMENT DIALOG */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-[425px] rounded-[32px] border-none shadow-2xl p-0 overflow-hidden">
                    <div className="bg-slate-900 p-8 text-white">
                        <h2 className="text-xl font-black uppercase tracking-tighter">
                            {editingListing ? 'Reconfigure Listing' : 'Deploy New Listing'}
                        </h2>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1 opacity-60">Distribution Node Management</p>
                    </div>

                    <div className="p-8 space-y-6">
                        <div className="space-y-1.5">
                            <Label htmlFor="name" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Label / Property Name</Label>
                            <Input
                                id="name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="rounded-xl bg-slate-50 border-slate-100 font-bold h-11"
                                placeholder="e.g. Booking.com - Deluxe Wing"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="channel" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Distribution Path</Label>
                            <Select value={channel} onValueChange={setChannel}>
                                <SelectTrigger className="rounded-xl bg-slate-50 border-slate-100 font-bold h-11 uppercase text-[10px]">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Booking">Booking.com</SelectItem>
                                    <SelectItem value="Agoda">Agoda</SelectItem>
                                    <SelectItem value="Manual">Manual Entry</SelectItem>
                                    <SelectItem value="Other">Extended Channel</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="pt-2 flex gap-3">
                            <Button variant="ghost" onClick={() => setIsDialogOpen(false)} className="flex-1 h-12 rounded-2xl font-black text-[11px] uppercase tracking-widest text-slate-400">Abort</Button>
                            <Button onClick={handleSave} className="flex-[2] h-12 rounded-2xl bg-slate-900 text-white font-black text-[11px] uppercase tracking-widest shadow-lg shadow-slate-900/10">
                                <Save className="w-4 h-4 me-2" />
                                {t('common.save', 'Commit Configuration')}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};

const MetricCard = ({ title, value, icon, bg, trend }: { title: string, value: string | number, icon: React.ReactNode, bg: string, trend: string }) => (
    <Card className="border border-slate-100 shadow-sm transition-all active:scale-[0.98] group rounded-[32px] overflow-hidden bg-white">
        <CardContent className="p-5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{title}</span>
                <div className={cn("p-1.5 rounded-xl transition-all shadow-sm", bg)}>{icon}</div>
            </div>
            <h3 className="text-xl font-black text-slate-900 leading-none tracking-tighter truncate">{value}</h3>
            <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest">{trend}</span>
        </CardContent>
    </Card>
);

export default Listings;
