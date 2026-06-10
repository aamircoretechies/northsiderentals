import { ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const WEBSITE_URL = 'https://northsiderentals.com.au/';

export function BackToWebsiteLink({
  variant = 'outline',
  tone = 'default',
  className = '',
}: {
  variant?: 'outline' | 'ghost' | 'primary';
  /** `navbar` — light text/button styling for the blue secondary nav bar */
  tone?: 'default' | 'navbar';
  className?: string;
}) {
  const isNavbar = tone === 'navbar';

  return (
    <Button
      variant={isNavbar ? 'outline' : variant === 'primary' ? 'primary' : variant}
      size="sm"
      className={cn(
        'gap-1 sm:gap-1.5 font-semibold shrink-0',
        isNavbar &&
          'h-9 sm:h-10 px-2.5 sm:px-4 text-xs sm:text-sm border-white/50 bg-white/10 text-white hover:bg-white/20 hover:text-white hover:border-white/70 shadow-none',
        className,
      )}
      asChild
    >
      <a href={WEBSITE_URL} target="_blank" rel="noopener noreferrer">
        <span className="hidden sm:inline">Back to Website</span>
        <span className="sm:hidden">Website</span>
        <ExternalLink
          className={cn('size-3 sm:size-3.5', isNavbar ? 'opacity-90' : 'opacity-70')}
          aria-hidden
        />
      </a>
    </Button>
  );
}
