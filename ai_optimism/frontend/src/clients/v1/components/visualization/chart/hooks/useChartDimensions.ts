import { useState, useEffect, useRef } from 'react';

export function useChartDimensions() {
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const updateDimensions = () => {
            if (containerRef.current) {
                const rect = containerRef.current.getBoundingClientRect();
                if (rect.width > 0 && rect.height > 0) {
                    setDimensions({
                        width: rect.width,
                        height: Math.max(rect.height, 400),
                    });
                } else {
                    // Fallback: use default dimensions if container not yet measured
                    setDimensions({
                        width: 800,
                        height: 500,
                    });
                }
            }
        };

        // Initial update
        updateDimensions();
        
        // Small delay to ensure DOM is ready
        const timeoutId = setTimeout(updateDimensions, 100);
        
        window.addEventListener('resize', updateDimensions);
        
        // Use ResizeObserver for more accurate measurements
        const resizeObserver = new ResizeObserver(updateDimensions);
        if (containerRef.current) {
            resizeObserver.observe(containerRef.current);
        }

        return () => {
            clearTimeout(timeoutId);
            window.removeEventListener('resize', updateDimensions);
            resizeObserver.disconnect();
        };
    }, []);

    return { dimensions, containerRef };
}

