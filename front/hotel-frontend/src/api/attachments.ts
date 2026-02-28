import http from './http';
import type { AttachmentDto } from './types/attachments';

/**
 * Attachments API
 * Note: Currently, attachments are linked 1:1 with partitions/reservations via the PDF OCR flow.
 * Attachment ID in this context matches Reservation ID.
 */

export const getAttachmentMetadata = async (id: number | string): Promise<AttachmentDto | null> => {
    try {
        // Perform a HEAD request to check if the attachment exists and get metadata
        const response = await http.head(`Attachments/reservations/${id}/pdf`);

        // Extract filename from Content-Disposition if available
        let fileName = `reservation-${id}.pdf`;
        const contentDisposition = response.headers['content-disposition'];
        if (contentDisposition) {
            const match = contentDisposition.match(/filename="?([^"]+)"?/);
            if (match && match[1]) {
                fileName = match[1];
            }
        }

        // Mobile Browser Safeguard: explicitly enforce .pdf extension
        // OS variants (like iOS/Android) fail to recognize the PDF MIME type 
        // if the file string lacks a recognized extension.
        if (!fileName.toLowerCase().endsWith('.pdf')) {
            fileName += '.pdf';
        }

        return {
            id: id.toString(),
            fileName: fileName,
            contentType: response.headers['content-type'] || 'application/pdf',
            sizeBytes: parseInt(response.headers['content-length'] || '0'),
            uploadedAt: response.headers['last-modified'] || new Date().toISOString()
        };
    } catch (error: any) {
        // If it's a 404, we expect it might be missing (e.g. manual reservations without PDF).
        // The axios interceptor in http.ts is configured to suppress console errors for HEAD 404s.
        if (error.response?.status === 404) {
            return null;
        }
        throw error;
    }
};

export const downloadAttachment = async (id: number | string): Promise<Blob> => {
    // Mapping to the existing backend endpoint
    const response = await http.get(`pdf-reservations/${id}/download`, {
        responseType: 'blob'
    });
    return response.data;
};

export const getReservationPdf = async (id: number | string): Promise<Blob> => {
    // Alternative endpoint found in backend
    const response = await http.get(`Attachments/reservations/${id}/pdf`, {
        responseType: 'blob'
    });
    return response.data;
};
