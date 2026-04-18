import { useEffect, useState } from 'react';
import { getInitials } from '@/lib/helpers';
import { cn } from '@/lib/utils';
import { apiBlob } from '@/utils/api-client';

type Props = {
  src: string | null | undefined;
  /** Used for initials while the image loads or if it fails */
  fallbackLabel?: string;
  alt?: string;
  className?: string;
  fallbackClassName?: string;
};

/**
 * Only relative (or path-only) `/uploads/...` URLs may need Authorization on some stacks.
 * Full `https://…/uploads/…` links are public static files — use them as normal `<img src>`.
 */
function needsBearerFetch(url: string): boolean {
  if (!url) return false;
  if (url.startsWith('data:') || url.startsWith('blob:')) return false;
  const u = url.trim().toLowerCase();
  if (u.startsWith('http://') || u.startsWith('https://') || u.startsWith('//')) {
    return false;
  }
  return u.startsWith('/uploads/') || u.includes('/uploads/');
}

export function ProfileAvatarImage({
  src,
  fallbackLabel = '',
  alt = '',
  className,
  fallbackClassName,
}: Props) {
  const trimmed = src?.trim() ?? '';
  const [resolved, setResolved] = useState<string | null>(() =>
    trimmed && !needsBearerFetch(trimmed) ? trimmed : null,
  );
  const [pending, setPending] = useState(
    () => Boolean(trimmed && needsBearerFetch(trimmed)),
  );

  useEffect(() => {
    const u = src?.trim() ?? '';
    if (!u) {
      setResolved(null);
      setPending(false);
      return;
    }

    if (!needsBearerFetch(u)) {
      setResolved(u);
      setPending(false);
      return;
    }

    let cancelled = false;
    const blobRef = { current: null as string | null };
    setPending(true);
    setResolved(null);

    void (async () => {
      try {
        const blob = await apiBlob(u, {
          method: 'GET',
          auth: 'optional',
          fallbackError: 'Could not load profile image.',
        });
        if (cancelled) return;
        const objectUrl = URL.createObjectURL(blob);
        if (cancelled) {
          URL.revokeObjectURL(objectUrl);
          return;
        }
        blobRef.current = objectUrl;
        setResolved(objectUrl);
        setPending(false);
      } catch {
        if (!cancelled) {
          setResolved(u);
          setPending(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      if (blobRef.current) {
        URL.revokeObjectURL(blobRef.current);
        blobRef.current = null;
      }
    };
  }, [src]);

  const initials = getInitials(fallbackLabel, 2) || '';

  const fallbackShell = (
    <div
      className={cn(
        'flex size-full min-h-0 min-w-0 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold text-foreground',
        className,
        fallbackClassName,
      )}
    >
      {initials || null}
    </div>
  );

  if (!trimmed) {
    return fallbackShell;
  }

  if (pending && !resolved) {
    return fallbackShell;
  }

  return (
    <img
      src={resolved || trimmed}
      alt={alt}
      className={cn(
        'block size-full max-h-full max-w-full min-h-0 min-w-0 rounded-full object-cover',
        className,
      )}
    />
  );
}
