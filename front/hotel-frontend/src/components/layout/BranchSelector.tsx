import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Building2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useBranches } from '@/hooks/admin/useUserManagement';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

const BranchSelector = () => {
    const { t } = useTranslation();
    const { user, selectedBranchId, setSelectedBranchId } = useAuth();
    const { data: branches } = useBranches();

    // Stale Data Protection: If selected branch is not in the list of available branches, reset it
    useEffect(() => {
        if (selectedBranchId && branches && branches.length > 0) {
            const exists = branches.some(b => b.id === selectedBranchId);
            if (!exists) {
                console.warn('Selected branch no longer exists, resetting to global view');
                setSelectedBranchId(null);
            }
        }
    }, [branches, selectedBranchId, setSelectedBranchId]);

    // Only Owners can switch branches
    if (user?.role !== 'Owner') return null;

    const handleValueChange = (value: string) => {
        const newId = value === 'all' ? null : value;
        setSelectedBranchId(newId);
        // Explicitly reload to clear all states and trigger fresh fetches with new header
        window.location.reload();
    };

    return (
        <div className="hidden lg:flex items-center gap-3 px-4 py-2 bg-slate-50 border border-slate-200/60 rounded-xl shadow-sm hover:shadow-md transition-all">
            <div className="p-1.5 bg-blue-50 rounded-lg text-blue-600 font-bold">
                <Building2 className="w-4 h-4" />
            </div>
            <div className="flex flex-col min-w-[120px]">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">
                    {t('common.branch', 'Operating Branch')}
                </span>
                <Select
                    value={selectedBranchId || 'all'}
                    onValueChange={handleValueChange}
                >
                    <SelectTrigger className="border-none h-auto p-0 bg-transparent text-[11px] font-black text-slate-900 focus:ring-0 shadow-none gap-2 hover:text-blue-600 transition-colors uppercase text-left justify-start">
                        <SelectValue placeholder={t('common.all_branches', 'Global View')} />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">
                            {t('common.all_branches', 'Global View (All)')}
                        </SelectItem>
                        {branches?.map((branch) => (
                            <SelectItem
                                key={branch.id}
                                value={branch.id}
                            >
                                {branch.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
        </div>
    );
};

export default BranchSelector;
