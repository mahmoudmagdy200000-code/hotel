export interface AttachmentDto {
    id: string; // This will be the reservationId in our current context
    fileName: string;
    contentType: string;
    sizeBytes: number;
    uploadedAt: string;
}
