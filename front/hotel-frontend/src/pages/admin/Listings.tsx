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
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Plus, Edit2, CheckCircle, XCircle, Building2, Save } from 'lucide-react';
import { toast } from 'sonner';

const Listings = () => {
    const { t } = useTranslation();
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingListing, setEditingListing] = useState<BranchListingDto | null>(null);
    const [name, setName] = useState('');
    const [channel, setChannel] = useState('Manual');

    const { data: listings, isLoading } = useAdminListings(true);
    const createListing = useCreateListing();
    const updateListing = useUpdateListing();

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
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <Building2 className="w-6 h-6" />
                        {t('admin.listings.title')}
                    </h1>
                    <p className="text-slate-500">
                        {t('admin.listings.subtitle')}
                    </p>
                </div>
                <Button onClick={() => handleOpenDialog()} className="gap-2">
                    <Plus className="w-4 h-4" />
                    {t('admin.listings.add_listing')}
                </Button>
            </div>

            <Card className="border-none shadow-sm">
                <CardContent className="pt-6">
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{t('admin.listings.name')}</TableHead>
                                    <TableHead>{t('admin.listings.channel')}</TableHead>
                                    <TableHead>{t('admin.listings.status')}</TableHead>
                                    <TableHead className="text-right">{t('reception.actions')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    [...Array(3)].map((_, i) => (
                                        <TableRow key={i}>
                                            <TableCell colSpan={4} className="h-12 animate-pulse bg-slate-50" />
                                        </TableRow>
                                    ))
                                ) : listings && listings.length > 0 ? (
                                    listings.map((item) => (
                                        <TableRow key={item.id}>
                                            <TableCell className="font-medium text-slate-900">
                                                {item.name}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className="text-slate-500">
                                                    {item.channel}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                {item.isActive ? (
                                                    <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100/80 border-none gap-1">
                                                        <CheckCircle className="w-3 h-3" />
                                                        {t('admin.listings.active')}
                                                    </Badge>
                                                ) : (
                                                    <Badge className="bg-slate-100 text-slate-600 hover:bg-slate-100/80 border-none gap-1">
                                                        <XCircle className="w-3 h-3" />
                                                        {t('admin.listings.inactive')}
                                                    </Badge>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right space-x-2">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleToggleStatus(item)}
                                                    className={item.isActive ? "text-slate-500" : "text-emerald-600"}
                                                >
                                                    {item.isActive ? t('admin.listings.inactive') : t('admin.listings.active')}
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleOpenDialog(item)}
                                                    className="text-slate-500 hover:text-slate-900"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={4} className="h-32 text-center text-slate-500">
                                            {t('admin.listings.no_listings')}
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {editingListing ? t('admin.listings.edit_listing') : t('admin.listings.add_listing')}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">{t('admin.listings.name')}</Label>
                            <Input
                                id="name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="e.g. Cairo Grand Hotel"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="channel">{t('admin.listings.channel')}</Label>
                            <Select value={channel} onValueChange={setChannel}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Booking">Booking.com</SelectItem>
                                    <SelectItem value="Agoda">Agoda</SelectItem>
                                    <SelectItem value="Manual">Manual</SelectItem>
                                    <SelectItem value="Other">Other</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                            {t('common.cancel')}
                        </Button>
                        <Button onClick={handleSave} className="gap-2">
                            <Save className="w-4 h-4" />
                            {t('common.save')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default Listings;
