import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, Download, AlertCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { downloadAttachment } from '@/api/attachments';

interface PdfViewerProps {
    attachmentId: number | string;
    fileName: string;
    onClose?: () => void;
}

export const PdfViewer = ({ attachmentId, fileName, onClose }: PdfViewerProps) => {
    const { t } = useTranslation();
    const [pdfUrl, setPdfUrl] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let url: string | null = null;

        const fetchPdf = async () => {
            try {
                setIsLoading(true);
                setError(null);
                const blob = await downloadAttachment(attachmentId);
                url = URL.createObjectURL(blob);
                setPdfUrl(url);
            } catch (err) {
                console.error('Failed to load PDF:', err);
                setError(t('attachments.error_loading'));
            } finally {
                setIsLoading(false);
            }
        };

        fetchPdf();

        return () => {
            if (url) {
                URL.revokeObjectURL(url);
            }
        };
    }, [attachmentId, t]);

    const handleDownload = () => {
        if (!pdfUrl) return;
        const link = document.createElement('a');
        link.href = pdfUrl;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="flex flex-col h-full bg-slate-50 rounded-lg overflow-hidden border border-slate-200">
            {/* Toolbar */}
            <div className="bg-white border-b border-slate-200 px-4 py-2 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-2 overflow-hidden">
                    <span className="text-sm font-medium text-slate-700 truncate max-w-[200px] md:max-w-md">
                        {fileName}
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleDownload}
                        disabled={!pdfUrl}
                        title={t('attachments.download')}
                    >
                        <Download className="w-4 h-4" />
                    </Button>
                    {onClose && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={onClose}
                        >
                            <X className="w-4 h-4" />
                        </Button>
                    )}
                </div>
            </div>

            {/* Content area */}
            <div className="flex-grow relative min-h-[400px] md:min-h-[600px]">
                {isLoading && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50/80 z-10">
                        <Loader2 className="w-10 h-10 text-slate-400 animate-spin mb-3" />
                        <p className="text-sm text-slate-500 font-medium">{t('attachments.loading')}</p>
                    </div>
                )}

                {error && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
                        <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
                        <p className="text-slate-900 font-semibold mb-2">{t('error')}</p>
                        <p className="text-sm text-slate-500 mb-6">{error}</p>
                        <Button onClick={handleDownload} className="gap-2">
                            <Download className="w-4 h-4" />
                            {t('attachments.download')}
                        </Button>
                    </div>
                )}

                {!isLoading && !error && pdfUrl && (
                    <iframe
                        src={`${pdfUrl}#toolbar=0&navpanes=0`}
                        className="w-full h-full border-none"
                        title={fileName}
                    />
                )}
            </div>
        </div>
    );
};
