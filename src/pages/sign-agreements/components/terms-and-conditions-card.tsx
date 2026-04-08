import { useState, useEffect } from 'react';
import { SignaturePad } from './signature-pad';

export function TermsAndConditionsCard() {
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchTerms() {
      try {
        const response = await fetch('https://northsiderentals.com.au/wp-json/wp/v2/pages/10078');
        if (!response.ok) throw new Error('Failed to fetch terms');
        const data = await response.json();
        setContent(data.content.rendered);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
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
