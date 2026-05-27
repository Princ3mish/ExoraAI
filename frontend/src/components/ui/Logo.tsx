import { useState } from 'react';
import logo from '@/assets/logo.png';

// ── Types ─────────────────────────────────────────────────────────────────────

interface LogoProps {
  /** Display mode: 'full' shows image + text, 'icon' shows image only */
  variant?: 'full' | 'icon';
  /** Size scale — affects both image dimensions and text size */
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

// ── Size maps ─────────────────────────────────────────────────────────────────

const imageSizeMap: Record<NonNullable<LogoProps['size']>, number> = {
  sm: 24,
  md: 32,
  lg: 40,
};

const textSizeMap: Record<NonNullable<LogoProps['size']>, string> = {
  sm: 'text-base',
  md: 'text-lg',
  lg: 'text-xl',
};

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * Exora AI brand logo component.
 *
 * - variant="full"  → logo image + "Exora AI" text (default)
 * - variant="icon"  → logo image only
 *
 * Falls back to an indigo gradient placeholder if the image fails to load.
 */
export function Logo({ variant = 'full', size = 'md', className = '' }: LogoProps) {
  const [imgError, setImgError] = useState(false);
  const px = imageSizeMap[size];
  const textSize = textSizeMap[size];

  const logoImage = imgError ? (
    // Graceful fallback: indigo gradient square with "E" initial
    <div
      style={{ width: px, height: px }}
      className="rounded-lg indigo-gradient flex items-center justify-center shrink-0 shadow-glass"
      aria-hidden="true"
    >
      <span className="text-white font-bold" style={{ fontSize: px * 0.45 }}>
        E
      </span>
    </div>
  ) : (
    <img
      src={logo}
      alt="Exora AI logo"
      width={px}
      height={px}
      style={{ width: px, height: px }}
      className="rounded-lg object-cover shrink-0 shadow-glass"
      onError={() => setImgError(true)}
    />
  );

  if (variant === 'icon') {
    return (
      <div className={`inline-flex items-center ${className}`} aria-label="Exora AI">
        {logoImage}
      </div>
    );
  }

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      {logoImage}
      <span className={`font-bold text-gradient tracking-tight ${textSize}`}>
        Exora AI
      </span>
    </div>
  );
}

export default Logo;
