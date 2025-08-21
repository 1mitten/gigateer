'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';

interface LazyImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  placeholder?: string;
  priority?: boolean;
  onLoad?: () => void;
  onError?: () => void;
}

export function LazyImage({
  src,
  alt,
  width,
  height,
  className = '',
  placeholder = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIwIiBoZWlnaHQ9IjMyMCIgdmlld0JveD0iMCAwIDMyMCAzMjAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIzMjAiIGhlaWdodD0iMzIwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0xMzIuNSAxNzUuNUw5Ny41IDE0MC41TDEyNyAxMTFMMTU3LjUgMTQwLjVMMTkyLjUgMTA1LjVMMjIyLjUgMTM1LjVWMTg1LjVIMTMyLjVWMTc1LjVaIiBmaWxsPSIjRTVFN0VCIi8+CjxjaXJjbGUgY3g9IjE0Ny41IiBjeT0iMTM1LjUiIHI9IjE1LjUiIGZpbGw9IiNFNUU3RUIiLz4KPC9zdmc+',
  priority = false,
  onLoad,
  onError,
}: LazyImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isInView, setIsInView] = useState(priority);
  const imgRef = useRef<HTMLDivElement>(null);

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (priority || isInView) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      {
        rootMargin: '50px 0px',
        threshold: 0.1,
      }
    );

    const currentRef = imgRef.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [priority, isInView]);

  const handleLoad = () => {
    setIsLoaded(true);
    onLoad?.();
  };

  const handleError = () => {
    setHasError(true);
    onError?.();
  };

  return (
    <div 
      ref={imgRef}
      className={`relative overflow-hidden bg-gray-100 ${className}`}
      style={{ 
        width: width || '100%', 
        height: height || 'auto',
        aspectRatio: width && height ? `${width} / ${height}` : undefined 
      }}
    >
      {/* Placeholder */}
      {!isInView && (
        <div 
          className="absolute inset-0 bg-gray-200 animate-fade-in"
          style={{
            backgroundImage: `url("${placeholder}")`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
      )}

      {/* Actual image */}
      {isInView && !hasError && (
        <Image
          src={src}
          alt={alt}
          width={width || 320}
          height={height || 320}
          className={`transition-opacity duration-300 ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          style={{
            objectFit: 'cover',
            width: '100%',
            height: '100%',
          }}
          priority={priority}
          onLoad={handleLoad}
          onError={handleError}
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />
      )}

      {/* Error state */}
      {hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <div className="text-center text-gray-500">
            <svg 
              className="mx-auto h-12 w-12 mb-2" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={1.5} 
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" 
              />
            </svg>
            <p className="text-sm">Image unavailable</p>
          </div>
        </div>
      )}

      {/* Loading indicator */}
      {isInView && !isLoaded && !hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      )}
    </div>
  );
}

// Optimized image component specifically for gig images
export function GigImage({
  src,
  alt,
  className = '',
  ...props
}: Omit<LazyImageProps, 'width' | 'height'>) {
  return (
    <LazyImage
      src={src}
      alt={alt}
      width={400}
      height={300}
      className={`rounded-lg ${className}`}
      {...props}
    />
  );
}

// Avatar component for artist/venue images
export function Avatar({
  src,
  alt,
  size = 'md',
  className = '',
  ...props
}: Omit<LazyImageProps, 'width' | 'height'> & {
  size?: 'sm' | 'md' | 'lg' | 'xl';
}) {
  const sizeMap = {
    sm: { width: 32, height: 32, className: 'w-8 h-8' },
    md: { width: 48, height: 48, className: 'w-12 h-12' },
    lg: { width: 64, height: 64, className: 'w-16 h-16' },
    xl: { width: 96, height: 96, className: 'w-24 h-24' },
  };

  const { width, height, className: sizeClass } = sizeMap[size];

  return (
    <LazyImage
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={`rounded-full ${sizeClass} ${className}`}
      {...props}
    />
  );
}