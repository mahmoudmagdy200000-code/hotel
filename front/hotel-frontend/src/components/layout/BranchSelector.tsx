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

interface BranchSelectorProps {
    variant?: 'header' | 'sidebar';
}

const BranchSelector = ({ variant = 'header' }: BranchSelectorProps) => {
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

    if (variant === 'sidebar') {
        return (
            <div className="px-3 mb-6">
                <div className="bg-slate-800/50 rounded-2xl p-3 border border-slate-700/50 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/20 flex items-center justify-center shrink-0">
                        <Building2 className="text-blue-400 w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">
                            {t('common.branch', 'Operating Branch')}
                        </p>
                        <Select
                            value={selectedBranchId || 'all'}
                            onValueChange={handleValueChange}
                        >
                            <SelectTrigger className="border-none h-auto p-0 bg-transparent text-[11px] font-black text-white focus:ring-0 shadow-none gap-2 hover:text-blue-400 transition-colors uppercase text-left justify-start">
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
            </div>
        );
    }

    return (
        <div className="flex items-center gap-3 px-4 py-2 bg-slate-50 border border-slate-200/60 rounded-xl shadow-sm hover:shadow-md transition-all">
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
