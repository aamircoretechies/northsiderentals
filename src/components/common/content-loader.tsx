import { cn } from '@/lib/utils';
import { toAbsoluteUrl } from '@/lib/helpers';

export function ContentLoader({ className }: { className?: string }) {
  return (
    <div
      className={cn('flex items-center justify-center grow w-full py-10', className)}
    >
      <div className="flex flex-col items-center gap-2">
        <img
          className="h-[30px] max-w-none"
          src={toAbsoluteUrl('/media/app/mini-logo.svg')}
          alt="logo"
        />
        <div className="text-muted-foreground font-medium text-sm">
          Loading...
        </div>
      </div>
    </div>
  );
}
