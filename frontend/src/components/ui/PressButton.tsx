import { Link } from 'react-router-dom';

// ── Variant config ─────────────────────────────────────────────────────────────

const variantMap = {
  primary: {
    buttonColor: '#6366F1',
    outlineColor: '#4338CA',
    topColor: '#ffffff',
  },
  secondary: {
    buttonColor: '#FAFAF8',
    outlineColor: '#78716C',
    topColor: '#1C1917',
  },
  accent: {
    buttonColor: '#F59E0B',
    outlineColor: '#D97706',
    topColor: '#ffffff',
  },
} as const;

// ── Size config ────────────────────────────────────────────────────────────────

const sizeMap = {
  sm: { fontSize: '13px', padding: '0.5em 1em' },
  md: { fontSize: '15px', padding: '0.75em 1.5em' },
  lg: { fontSize: '17px', padding: '0.9em 2em' },
} as const;

// ── Props ──────────────────────────────────────────────────────────────────────

interface PressButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  href?: string;
  variant?: 'primary' | 'secondary' | 'accent';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  disabled?: boolean;
  type?: 'button' | 'submit';
}

// ── Component ──────────────────────────────────────────────────────────────────

export function PressButton({
  children,
  onClick,
  href,
  variant = 'primary',
  size = 'md',
  className = '',
  disabled = false,
  type = 'button',
}: PressButtonProps) {
  const { buttonColor, outlineColor, topColor } = variantMap[variant];
  const { fontSize, padding } = sizeMap[size];

  const cssVars = {
    '--button_color': buttonColor,
    '--button_outline_color': outlineColor,
    '--button_top_color': topColor,
  } as React.CSSProperties;

  const topStyle: React.CSSProperties = {
    fontSize,
    padding,
  };

  const buttonEl = (
    <button
      type={type}
      style={cssVars}
      className={`press-button ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
    >
      <span className="button_top" style={topStyle}>
        {children}
      </span>
    </button>
  );

  if (href && !disabled) {
    // External URL
    if (href.startsWith('http://') || href.startsWith('https://')) {
      return (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className={`inline-block ${className}`}
          style={cssVars}
        >
          <button
            type="button"
            style={cssVars}
            className={`press-button ${className}`}
          >
            <span className="button_top" style={topStyle}>
              {children}
            </span>
          </button>
        </a>
      );
    }
    // Internal route via React Router
    return (
      <Link to={href} className={`inline-block ${className}`}>
        <button
          type="button"
          style={cssVars}
          className="press-button"
        >
          <span className="button_top" style={topStyle}>
            {children}
          </span>
        </button>
      </Link>
    );
  }

  return buttonEl;
}
