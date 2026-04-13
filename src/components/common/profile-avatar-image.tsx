import { useEffect, useState } from 'react';
import { getAuth } from '@/auth/lib/helpers';
import { getInitials } from '@/lib/helpers';
import { cn } from '@/lib/utils';

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

    const token = getAuth()?.access_token?.trim();
    if (!token) {
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
        const res = await fetch(u, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (cancelled) return;
        if (!res.ok) {
          setResolved(u);
          setPending(false);
          return;
        }
        const blob = await res.blob();
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

  const initials = getInitials(fallbackLabel, 2) || '?';

  if (!trimmed) {
    return (
      <div
        className={cn(
          'flex items-center justify-center rounded-full bg-muted text-xs font-bold text-foreground',
          className,
          fallbackClassName,
        )}
      >
        {initials}
      </div>
    );
  }

  if (pending && !resolved) {
    return (
      <div
        className={cn(
          'flex items-center justify-center rounded-full bg-muted text-xs font-bold text-foreground',
          className,
          fallbackClassName,
        )}
      >
        {initials}
      </div>
    );
  }

  return (
    <img
      src={resolved || trimmed}
      alt={alt}
      className={className}
    />
  );
}
