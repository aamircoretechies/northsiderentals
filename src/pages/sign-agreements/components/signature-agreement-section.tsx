import type { RcmSignatureListItem } from '@/services/rcm-documents';
import { SignaturePad } from './signature-pad';

export function signatureRowKey(item: RcmSignatureListItem): string {
  return `${item.signaturetemplateid}-${item.signingorder}`;
}

export function displayTitleForSignatureItem(item: RcmSignatureListItem): string {
  const t = item.signaturetemplatetitle?.trim();
  if (t) return t;
  return 'Rental agreement';
}

type SignatureAgreementSectionProps = {
  item: RcmSignatureListItem;
  onSignatureChange: (rowKey: string, pngBase64: string | null) => void;
};

export function SignatureAgreementSection({
  item,
  onSignatureChange,
}: SignatureAgreementSectionProps) {
  const key = signatureRowKey(item);
  const title = displayTitleForSignatureItem(item);
  const html = item.signaturetemplatetext?.trim();
  const link = item.linktoagreement?.trim();

  if (item.issigned) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-[14px] font-semibold text-emerald-700">
          Signed — no action required for this section.
        </p>
        {link ? (
          <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[14px] font-medium text-[#0061e0] hover:underline w-fit"
          >
            View agreement
          </a>
        ) : null}
      </div>
    );
  }

  if (item.overcounteronly) {
    return (
      <p className="text-[14px] text-[#6b7280]">
        This document must be completed at the rental counter.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {link ? (
        <a
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[14px] font-medium text-[#0061e0] hover:underline w-fit"
        >
          View full agreement (opens in a new tab)
        </a>
      ) : null}

      {html && html !== '<p></p>' && html !== '<p></p>\r\n' ? (
        <div className="max-h-[280px] border border-gray-100 rounded-md p-3 overflow-y-auto custom-scrollbar bg-[#fdfdfd]">
          <div
            className="text-black text-[13px] leading-relaxed [&>p]:mb-3 [&>h2]:font-bold [&>h2]:text-[14px] [&>h2]:mb-2 [&>h2]:mt-4 [&>h3]:font-bold [&>h3]:text-[14px] [&>h3]:mb-2 [&>h3]:mt-4 [&>strong]:font-bold"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        </div>
      ) : null}

      <SignaturePad onChange={(png) => onSignatureChange(key, png)} />
    </div>
  );
}
