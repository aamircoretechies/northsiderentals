import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function UploadImagesCard() {
  return (
    <div className="flex flex-col gap-3">
      <span className="text-[14px] text-black font-semibold mb-1">Driving License</span>
      
      {/* Uploaded State */}
      <div className="flex items-center justify-between bg-[#f8f9fa] rounded-[12px] p-4">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 rounded-full bg-[#0051ba] flex items-center justify-center shrink-0">
            <Check className="w-3.5 h-3.5 text-white stroke-[3]" />
          </div>
          <div className="flex flex-col">
            <span className="text-black text-[14px] font-medium mb-0.5">Ethan Carter</span>
            <span className="text-gray-500 text-[12px]">Updated on 06/03/2026 10:01 am</span>
          </div>
        </div>
        <Button variant="outline" className="h-8 rounded-full border-[#0061e0] text-[#0061e0] px-5 hover:bg-[#f0f6ff]">
          Edit
        </Button>
      </div>

      {/* Pending Upload State */}
      <div className="flex items-center justify-between bg-[#f8f9fa] rounded-[12px] p-4">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 rounded-full border border-dashed border-[#0051ba] bg-white flex items-center justify-center shrink-0 object-cover">
             <Check className="w-3 h-3 text-gray-200" />
          </div>
          <div className="flex flex-col">
            <span className="text-black text-[14px] font-medium mb-0.5">Test User</span>
            <span className="text-gray-500 text-[12px]">Not uploaded yet</span>
          </div>
        </div>
        <Button variant="outline" className="h-8 rounded-full border-[#0061e0] text-[#0061e0] px-4 hover:bg-[#f0f6ff]">
          Upload
        </Button>
      </div>
    </div>
  );
}
