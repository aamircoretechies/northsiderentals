export function SignaturePad() {
  return (
    <div className="flex flex-col mt-4">
      <span className="text-[15px] text-black mb-1">Sign Here</span>
      <span className="text-[13px] text-[#8692a6] mb-3">Use your finger/stylus in this empty area</span>
      <div className="border border-[#e2e8f0] rounded-[8px] bg-white h-[180px] w-full max-w-full"></div>
    </div>
  );
}
