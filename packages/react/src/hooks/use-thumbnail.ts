import { useState, useEffect, useRef } from 'react';

type ThumbnailResult = {
  thumbnailUrl: string | null;
  isGenerating: boolean;
};

/**
 * useThumbnail — generates a client-side thumbnail URL for a File.
 *
 * Architecture:
 *  - Images: URL.createObjectURL() directly (fast, no canvas resize needed for 48px display).
 *  - Videos: detached <video> element, seeked to time 0, canvas drawImage capture.
 *  - Other file types: returns null (caller renders a type icon instead).
 *  - IntersectionObserver: if containerRef is provided, thumbnail generation is deferred
 *    until the container is visible in the viewport (T-05-08 DoS mitigation).
 *  - Cleanup: URL.revokeObjectURL() called on effect cleanup to prevent memory leaks (Pitfall 5).
 *
 * @param file - The File to generate a thumbnail for, or null.
 * @param containerRef - Optional ref to observe for visibility before generating.
 */
export function useThumbnail(
  file: File | null,
  containerRef?: React.RefObject<Element | null>,
): ThumbnailResult {
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Track the active object URL so we can revoke it on cleanup
  const activeUrlRef = useRef<string | null>(null);

  useEffect(() => {
    if (!file) {
      setThumbnailUrl(null);
      setIsGenerating(false);
      return;
    }

    let cancelled = false;

    function generate() {
      if (cancelled || !file) return;

      if (file.type.startsWith('image/')) {
        // Images: createObjectURL is sufficient for thumbnail display
        const url = URL.createObjectURL(file);
        activeUrlRef.current = url;
        setThumbnailUrl(url);
        setIsGenerating(false);
      } else if (file.type.startsWith('video/')) {
        // Videos: capture first frame via canvas
        setIsGenerating(true);
        const video = document.createElement('video');
        video.muted = true;
        video.playsInline = true;

        const videoUrl = URL.createObjectURL(file);
        video.src = videoUrl;

        video.addEventListener('loadedmetadata', () => {
          video.currentTime = 0;
        });

        video.addEventListener('seeked', () => {
          if (cancelled) {
            URL.revokeObjectURL(videoUrl);
            return;
          }

          try {
            const canvas = document.createElement('canvas');
            // 160px wide, proportional height
            const aspectRatio = video.videoWidth / (video.videoHeight || 1);
            canvas.width = 160;
            canvas.height = Math.round(160 / aspectRatio);

            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
              const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
              activeUrlRef.current = dataUrl;
              setThumbnailUrl(dataUrl);
            }
          } catch {
            // Canvas tainted or other error — fall back to null (type icon shown)
            setThumbnailUrl(null);
          }

          setIsGenerating(false);
          URL.revokeObjectURL(videoUrl);
        });

        // Handle load errors gracefully
        video.addEventListener('error', () => {
          URL.revokeObjectURL(videoUrl);
          setIsGenerating(false);
          setThumbnailUrl(null);
        });
      } else {
        // Non-image/video: no thumbnail (caller shows type icon)
        setThumbnailUrl(null);
        setIsGenerating(false);
      }
    }

    if (containerRef?.current) {
      // Defer generation until container is visible in viewport
      const observer = new IntersectionObserver(
        (entries) => {
          if (entries[0]?.isIntersecting) {
            observer.disconnect();
            generate();
          }
        },
        { threshold: 0.1 },
      );
      observer.observe(containerRef.current);

      return () => {
        cancelled = true;
        observer.disconnect();
        if (activeUrlRef.current && activeUrlRef.current.startsWith('blob:')) {
          URL.revokeObjectURL(activeUrlRef.current);
          activeUrlRef.current = null;
        }
      };
    } else {
      // No containerRef — generate immediately
      generate();

      return () => {
        cancelled = true;
        if (activeUrlRef.current && activeUrlRef.current.startsWith('blob:')) {
          URL.revokeObjectURL(activeUrlRef.current);
          activeUrlRef.current = null;
        }
      };
    }
  }, [file, containerRef]);

  return { thumbnailUrl, isGenerating };
}
