'use client';

import { useEffect, useState } from 'react';

interface SiteMapViewerProps {
  url: string;
  onClose: () => void;
}

// The site map at full size, over everything. "Zoom in" makes the picture wider than the screen so
// it can be scrolled around; "Fit to screen" puts it back.
export function SiteMapViewer({ url, onClose }: SiteMapViewerProps) {
  const [zoomed, setZoomed] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-black" role="dialog" aria-modal="true" aria-label="Site map">
      <div className="flex items-center justify-between gap-2 bg-black/80 px-4 py-3 text-white">
        <button
          type="button"
          onClick={() => setZoomed((z) => !z)}
          className="rounded-lg bg-white/15 px-4 py-2 text-sm font-medium"
        >
          {zoomed ? 'Fit to screen' : 'Zoom in'}
        </button>
        <button type="button" onClick={onClose} className="rounded-lg bg-white/15 px-4 py-2 text-sm font-medium">
          Close
        </button>
      </div>
      <div className="flex-1 overflow-auto">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt="Site map, full size"
          className={zoomed ? 'max-w-none w-[250%]' : 'mx-auto h-full w-full object-contain'}
        />
      </div>
    </div>
  );
}
