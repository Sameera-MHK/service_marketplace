import { useState } from 'react';

/**
 * ShareButton — uses the native Web Share API on mobile (Android/iOS).
 * Falls back to clipboard copy on desktop or unsupported browsers.
 *
 * Props:
 *   title   - Share card title (e.g. worker name + trade)
 *   text    - Short description line
 *   url     - Full URL to share (defaults to current page)
 */
export default function ShareButton({ title, text, url, label = 'Share' }) {
  const [copied, setCopied] = useState(false);

  const shareUrl = url || window.location.href;

  async function handleShare() {
    // Web Share API — triggers native share sheet on Android/iOS
    if (navigator.share) {
      try {
        await navigator.share({ title, text, url: shareUrl });
      } catch (err) {
        // User dismissed the share sheet — not an error
        if (err.name !== 'AbortError') console.warn('Share failed:', err);
      }
      return;
    }

    // Fallback — copy link to clipboard
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Last resort — select a temporary input
      const input = document.createElement('input');
      input.value = shareUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  }

  return (
    <button
      onClick={handleShare}
      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-stone-200
                 text-stone-600 text-sm font-medium hover:border-violet-300 hover:text-violet-700
                 hover:bg-violet-50 transition-all"
      title="Share this profile"
    >
      {copied ? (
        <>
          <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
          <span className="text-green-600">Link copied!</span>
        </>
      ) : (
        <>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
          </svg>
          {label}
        </>
      )}
    </button>
  );
}
