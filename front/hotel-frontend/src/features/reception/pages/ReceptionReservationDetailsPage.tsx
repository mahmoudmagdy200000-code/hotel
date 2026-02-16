
import { useParams, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const ReceptionReservationDetailsPage = () => {
    const { id } = useParams();
    const { t } = useTranslation();

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" asChild>
                    <Link to="/reception/today">
                        <ArrowLeft className="h-4 w-4" />
                    </Link>
                </Button>
                <h1 className="text-2xl font-bold tracking-tight">
                    {t('reception.reservation_details', 'Reservation Details')}
                </h1>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Reservation #{id}</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-slate-500">
                        {t('common.coming_soon', 'Feature coming soon...')}
                    </p>
                </CardContent>
            </Card>
        </div>
    );
};

export default ReceptionReservationDetailsPage;
