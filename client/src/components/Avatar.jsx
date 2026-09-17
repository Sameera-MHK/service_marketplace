/**
 * Shared Avatar component
 * - Shows profilePhoto if available and loads successfully
 * - Falls back to gradient initials on broken URL or missing photo
 */
export default function Avatar({ name = '', photo, size = 40, className = '' }) {
  const initials = name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || '?';

  const px = typeof size === 'number' ? `${size}px` : size;

  if (photo) {
    return (
      <img
        src={photo}
        alt={name}
        onError={(e) => {
          // Swap to initials div on broken URL
          e.currentTarget.style.display = 'none';
          e.currentTarget.nextSibling.style.display = 'flex';
        }}
        className={`rounded-full object-cover shrink-0 ${className}`}
        style={{ width: px, height: px }}
      />
    );
  }

  return (
    <InitialsAvatar initials={initials} size={px} className={className} />
  );
}

// Used as onError fallback — exported so it can be used standalone
export function InitialsAvatar({ initials, size = '40px', className = '' }) {
  const px = typeof size === 'number' ? `${size}px` : size;
  const fs = `calc(${px} * 0.36)`;
  return (
    <div
      className={`rounded-full flex items-center justify-center text-white font-bold
                  bg-gradient-to-br from-violet-500 to-pink-400 shrink-0 ${className}`}
      style={{ width: px, height: px, fontSize: fs }}
    >
      {initials}
    </div>
  );
}

/**
 * Dual-element version — renders both img + fallback div, img hides on error.
 * Use this when you need a clean onError swap without JS re-render.
 */
export function AvatarWithFallback({ name = '', photo, size = 40, className = '' }) {
  const initials = name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase() || '?';
  const px = typeof size === 'number' ? `${size}px` : size;
  const fs = `calc(${px} * 0.36)`;

  return (
    <span className="relative inline-block shrink-0" style={{ width: px, height: px }}>
      {photo && (
        <img
          src={photo}
          alt={name}
          onError={(e) => { e.currentTarget.style.display = 'none'; }}
          className={`rounded-full object-cover absolute inset-0 w-full h-full ${className}`}
        />
      )}
      <span
        className={`rounded-full flex items-center justify-center text-white font-bold
                    bg-gradient-to-br from-violet-500 to-pink-400 w-full h-full ${className}`}
        style={{ fontSize: fs }}
      >
        {initials}
      </span>
    </span>
  );
}
