import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FileText, Download, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { PdfViewer } from './PdfViewer';
import type { AttachmentDto } from '@/api/types/attachments';

interface AttachmentListProps {
    attachments: AttachmentDto[];
    reservationId: number;
}

export const AttachmentList = ({ attachments, reservationId }: AttachmentListProps) => {
    const { t } = useTranslation();
    const [viewingAttachment, setViewingAttachment] = useState<AttachmentDto | null>(null);

    if (attachments.length === 0) {
        return (
            <div className="text-center py-6 border-2 border-dashed border-slate-100 rounded-xl">
                <p className="text-sm text-slate-400">{t('attachments.no_attachments')}</p>
            </div>
        );
    }

    const formatSize = (bytes: number) => {
        if (bytes === 0) return '—';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    return (
        <div className="space-y-3">
            {attachments.map((file) => (
                <div
                    key={file.id}
                    className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-xl hover:border-slate-300 transition-colors shadow-sm group"
                >
                    <div className="flex items-center gap-3 overflow-hidden">
                        <div className="bg-slate-50 p-2 rounded-lg group-hover:bg-blue-50 transition-colors">
                            <FileText className="w-5 h-5 text-slate-400 group-hover:text-blue-500" />
                        </div>
                        <div className="flex flex-col overflow-hidden">
                            <span className="text-sm font-medium text-slate-900 truncate">
                                {file.fileName}
                            </span>
                            <span className="text-xs text-slate-500">
                                {file.contentType} {file.sizeBytes > 0 && `• ${formatSize(file.sizeBytes)}`}
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center gap-1 border-l border-slate-100 ps-3 ms-3">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-slate-400 hover:text-blue-600 hover:bg-blue-50"
                            onClick={() => setViewingAttachment(file)}
                            title={t('attachments.view_pdf')}
                        >
                            <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50"
                            title={t('attachments.download')}
                            onClick={async () => {
                                try {
                                    const blob = await import('@/api/attachments').then(m => m.downloadAttachment(reservationId));
                                    const url = window.URL.createObjectURL(blob);
                                    const link = document.createElement('a');
                                    link.href = url;
                                    link.download = file.fileName;
                                    document.body.appendChild(link);
                                    link.click();
                                    document.body.removeChild(link);
                                    window.URL.revokeObjectURL(url);
                                } catch (e) {
                                    console.error('Download failed', e);
                                }
                            }}
                        >
                            <Download className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            ))}

            {/* Viewer Dialog */}
            <Dialog
                open={!!viewingAttachment}
                onOpenChange={(open) => !open && setViewingAttachment(null)}
            >
                <DialogContent className="max-w-5xl h-[90vh] flex flex-col p-0 overflow-hidden border-none shadow-2xl">
                    <DialogHeader className="hidden">
                        <DialogTitle>PDF Viewer</DialogTitle>
                        <DialogDescription>
                            Preview of the reservation attachment.
                        </DialogDescription>
                    </DialogHeader>
                    {viewingAttachment && (
                        <PdfViewer
                            attachmentId={reservationId} // Currently mapping to reservationId
                            fileName={viewingAttachment.fileName}
                            onClose={() => setViewingAttachment(null)}
                        />
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
};
