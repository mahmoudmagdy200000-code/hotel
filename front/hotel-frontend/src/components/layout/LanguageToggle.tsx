import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { setDirection } from '@/i18n/setDirection';

const LanguageToggle = () => {
    const { i18n } = useTranslation();

    const toggleLanguage = () => {
        const nextLang = i18n.language === 'en' ? 'ar' : 'en';
        i18n.changeLanguage(nextLang);
        localStorage.setItem('lang', nextLang);
        setDirection(nextLang);
    };

    return (
        <Button
            variant="ghost"
            size="sm"
            onClick={toggleLanguage}
            className="font-bold text-xs"
        >
            {i18n.language === 'en' ? 'العربية' : 'EN'}
        </Button>
    );
};

export default LanguageToggle;
