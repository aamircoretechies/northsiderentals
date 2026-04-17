import { useState, useEffect } from 'react';
import { SignaturePad } from './signature-pad';
import { apiJson } from '@/utils/api-client';
import { getFriendlyError } from '@/utils/api-error-handler';

export function TermsAndConditionsCard() {
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchTerms() {
      try {
        const data = await apiJson<Record<string, unknown>>(
          'https://northsiderentals.com.au/wp-json/wp/v2/pages/10078',
          { method: 'GET', auth: 'none', fallbackError: 'Could not load terms and conditions.' },
        );
        setContent(
          ((data.content as Record<string, unknown> | undefined)?.rendered as string) || '',
        );
      } catch (err) {
        setError(getFriendlyError(err, 'Could not load terms and conditions.'));
      } finally {
        setLoading(false);
      }
    }
    
    fetchTerms();
  }, []);

  return (
    <div className="flex flex-col">
      <div className="max-h-[300px] border border-gray-100 rounded-md p-3 overflow-y-auto custom-scrollbar mb-2 bg-[#fdfdfd]">
        {loading ? (
          <div className="text-[#8692a6] text-[13px] py-8 flex items-center justify-center">Loading terms and conditions...</div>
        ) : error ? (
          <div className="text-red-500 text-[13px] py-4">{error}</div>
        ) : (
          <div 
            className="text-black text-[13px] leading-relaxed [&>p]:mb-3 [&>h2]:font-bold [&>h2]:text-[14px] [&>h2]:mb-2 [&>h2]:mt-4 [&>h3]:font-bold [&>h3]:text-[14px] [&>h3]:mb-2 [&>h3]:mt-4 [&>h4]:font-bold [&>h4]:mb-2 [&>ul]:list-disc [&>ul]:pl-5 [&>ul]:mb-3 [&>ol]:list-decimal [&>ol]:pl-5 [&>ol]:mb-3 [&>strong]:font-bold"
            dangerouslySetInnerHTML={{ __html: content }} 
          />
        )}
      </div>

      <div className="mt-4">
        <SignaturePad />
      </div>
    </div>
  );
}
