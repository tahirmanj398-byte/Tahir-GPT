import { useEffect, useRef } from 'react';

interface AdBannerProps {
  className?: string;
  dataAdSlot: string;
  dataAdFormat?: string;
  dataFullWidthResponsive?: boolean;
}

export default function AdBanner({ 
  className = '', 
  dataAdSlot, 
  dataAdFormat = 'auto', 
  dataFullWidthResponsive = true 
}: AdBannerProps) {
  const adRef = useRef<HTMLModElement>(null);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const initAd = () => {
      if (!adRef.current) return;

      // AdSense throws an error if the container width is 0.
      // Wait until the container is visible and has a width before initializing.
      if (adRef.current.offsetWidth === 0) {
        timeoutId = setTimeout(initAd, 200);
        return;
      }

      try {
        const isInitialized = adRef.current.getAttribute('data-adsbygoogle-status') === 'done';
        if (!isInitialized) {
          // @ts-ignore
          (window.adsbygoogle = window.adsbygoogle || []).push({});
        }
      } catch (err: any) {
        const errorMessage = err?.message || err?.toString() || '';
        if (errorMessage.includes('already have ads')) {
          return;
        }
        console.error('AdSense error:\n', err);
      }
    };

    // Small delay to ensure DOM is fully painted
    timeoutId = setTimeout(initAd, 100);

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [dataAdSlot]);

  return (
    <div className={`relative w-full overflow-hidden flex justify-center items-center bg-gray-50 dark:bg-zinc-900/30 border border-gray-100 dark:border-zinc-800/50 rounded-xl p-2 min-h-[60px] ${className}`}>
      <ins
        ref={adRef}
        className="adsbygoogle"
        style={{ display: 'block', width: '100%', minHeight: '50px' }}
        data-ad-client="ca-pub-YOUR_ADSENSE_ID"
        data-ad-slot={dataAdSlot}
        data-ad-format={dataAdFormat}
        data-full-width-responsive={dataFullWidthResponsive ? "true" : "false"}
      />
      {/* Placeholder text visible only during development/before ads load */}
      <div className="absolute inset-0 flex items-center justify-center text-xs text-gray-400 dark:text-zinc-500 pointer-events-none font-mono -z-10">
        Advertisement Space
      </div>
    </div>
  );
}
