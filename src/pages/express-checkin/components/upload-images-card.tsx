import { Check } from 'lucide-react';

/** Staged after `POST /documents/rcm/upload`; committed on Save via `POST /documents/rcm/store`. */
export interface PendingDocumentStore {
  url: string;
  originalname: string;
  resultsprovider: Record<string, unknown>;
}

export interface UploadDocumentItem {
  id: string;
  customerId: number;
  documentLinkSetupId: number;
  documentLinkId: number;
  seqno: number;
  doctype: string;
  storageprovider: string;
  description: string;
  title: string;
  /** Saved on server (existing upload or after successful store). */
  uploaded: boolean;
  isUploading?: boolean;
  pendingStore?: PendingDocumentStore | null;
  notes: string;
}

export interface UploadImagesForm {
  docs: UploadDocumentItem[];
}

export function UploadImagesCard({
  value,
  onUpload,
  onDelete,
}: {
  value: UploadImagesForm;
  onUpload: (id: string, file: File) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <span className="text-[14px] text-black font-semibold mb-1">Required Documents</span>
      {value.docs.map((doc) => {
        const hasPending = Boolean(doc.pendingStore?.url);
        const statusLabel = hasPending
          ? 'File ready — press Save to attach'
          : doc.uploaded
            ? 'Saved'
            : 'Not uploaded yet';
        const showSavedIcon = doc.uploaded && !hasPending;
        return (
          <div
            key={doc.id}
            className="flex items-center justify-between bg-[#f8f9fa] rounded-[12px] p-4"
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                  showSavedIcon
                    ? 'bg-[#0051ba]'
                    : hasPending
                      ? 'border border-[#f59e0b] bg-amber-50'
                      : 'border border-dashed border-[#0051ba] bg-white'
                }`}
              >
                <Check
                  className={`w-3.5 h-3.5 ${
                    showSavedIcon ? 'text-white' : hasPending ? 'text-amber-600' : 'text-gray-200'
                  } stroke-[3]`}
                />
              </div>
              <div className="flex flex-col">
                <span className="text-black text-[14px] font-medium mb-0.5">{doc.title}</span>
                <span className="text-gray-500 text-[12px]">{statusLabel}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <label className="h-8 rounded-full border border-[#0061e0] text-[#0061e0] px-4 hover:bg-[#f0f6ff] text-[13px] font-medium inline-flex items-center cursor-pointer">
                {doc.isUploading
                  ? 'Uploading...'
                  : doc.uploaded && !hasPending
                    ? 'Re-upload'
                    : 'Upload'}
                <input
                  type="file"
                  className="hidden"
                  disabled={doc.isUploading}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) onUpload(doc.id, file);
                    e.currentTarget.value = '';
                  }}
                />
              </label>
              {doc.uploaded || hasPending ? (
                <button
                  type="button"
                  className="h-8 rounded-full border border-red-300 text-red-600 px-4 hover:bg-red-50 text-[13px] font-medium"
                  onClick={() => onDelete(doc.id)}
                  disabled={doc.isUploading}
                >
                  {hasPending && !doc.uploaded ? 'Clear' : 'Delete'}
                </button>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
