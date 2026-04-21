import { useEffect, useState } from 'react';
import { getInitials, resolveRcmPublicUrl, shouldAuthFetchMediaUrl } from '@/lib/helpers';
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

/** Normalize to a displayable absolute URL (or data/blob URL). */
function profileImageAbsoluteUrl(raw: string): string {
  const t = raw.trim();
  if (!t) return '';
  if (t.startsWith('data:') || t.startsWith('blob:')) return t;
  if (t.startsWith('//')) return `https:${t}`;
  if (t.startsWith('http://') || t.startsWith('https://')) return t;
  return resolveRcmPublicUrl(t);
}

function hasExplicitProtocol(url: string): boolean {
  return url.startsWith('http://') || url.startsWith('https://') || url.startsWith('//');
}

export function ProfileAvatarImage({
  src,
  fallbackLabel = '',
  alt = '',
  className,
  fallbackClassName,
}: Props) {
  const trimmed = src?.trim() ?? '';
  const absoluteFromTrimmed = trimmed ? profileImageAbsoluteUrl(trimmed) : '';
  const canUseDirectImg =
    Boolean(absoluteFromTrimmed) && hasExplicitProtocol(absoluteFromTrimmed);

  const [resolved, setResolved] = useState<string | null>(() =>
    absoluteFromTrimmed &&
    (canUseDirectImg || !shouldAuthFetchMediaUrl(absoluteFromTrimmed))
      ? absoluteFromTrimmed
      : null,
  );
  const [pending, setPending] = useState(
    () =>
      Boolean(
        absoluteFromTrimmed &&
          !canUseDirectImg &&
          shouldAuthFetchMediaUrl(absoluteFromTrimmed),
      ),
  );
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const u = src?.trim() ?? '';
    if (!u) {
      setResolved(null);
      setPending(false);
      setFailed(false);
      return;
    }

    const absolute = profileImageAbsoluteUrl(u);
    if (!absolute) {
      setResolved(null);
      setPending(false);
      setFailed(false);
      return;
    }

    // Fully-qualified media URLs load directly via <img src="...">.
    // Never route /uploads/ or any https:// URL through apiBlob.
    if (hasExplicitProtocol(absolute) || !shouldAuthFetchMediaUrl(absolute)) {
      setFailed(false);
      setResolved(absolute);
      setPending(false);
      return;
    }

    let cancelled = false;
    const blobRef = { current: null as string | null };
    setPending(true);
    setResolved(null);
    setFailed(false);

    void (async () => {
      try {
        const blob = await apiBlob(absolute, {
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
          setResolved(null);
          setPending(false);
          setFailed(true);
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

  if (failed) {
    return fallbackShell;
  }

  const displaySrc =
    resolved ??
    (!absoluteFromTrimmed ||
    (!hasExplicitProtocol(absoluteFromTrimmed) &&
      shouldAuthFetchMediaUrl(absoluteFromTrimmed))
      ? null
      : absoluteFromTrimmed);

  if (!displaySrc) {
    return fallbackShell;
  }

  return (
    <img
      src={displaySrc}
      alt={alt}
      onError={() => {
        setFailed(true);
        setResolved(null);
        setPending(false);
      }}
      className={cn(
        'block size-full max-h-full max-w-full min-h-0 min-w-0 rounded-full object-cover',
        className,
      )}
    />
  );
}
