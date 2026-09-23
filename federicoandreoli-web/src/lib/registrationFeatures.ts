/** Step 18 document upload — enable when Laravel multipart / presigned URL is ready. */
export function isRegistrationDocumentUploadEnabled(): boolean {
  return import.meta.env.VITE_REGISTRATION_DOCUMENT_UPLOAD === 'true'
}
