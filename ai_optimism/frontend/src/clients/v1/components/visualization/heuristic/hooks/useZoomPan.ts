import { useState, useRef } from 'react';

export function useZoomPan() {
    const [zoom, setZoom] = useState(1.0);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [isPanning, setIsPanning] = useState(false);
    const [panStart, setPanStart] = useState({ x: 0, y: 0 });
    const svgRef = useRef<SVGSVGElement>(null);

    const handleZoomIn = () => {
        setZoom(prev => Math.min(3.0, prev + 0.2));
    };

    const handleZoomOut = () => {
        setZoom(prev => Math.max(0.5, prev - 0.2));
    };

    const handleZoomReset = () => {
        setZoom(1.0);
        setPan({ x: 0, y: 0 });
    };

    const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
        if (e.button === 0) { // Left mouse button
            setIsPanning(true);
            setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
        }
    };

    const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
        if (isPanning) {
            setPan({
                x: e.clientX - panStart.x,
                y: e.clientY - panStart.y
            });
        }
    };

    const handleMouseUp = () => {
        setIsPanning(false);
    };

    const handleWheel = (e: React.WheelEvent<SVGSVGElement>) => {
        e.preventDefault();
        // Pan with scroll
        setPan(prev => ({
            x: prev.x - e.deltaX,
            y: prev.y - e.deltaY
        }));
    };

    return {
        zoom,
        pan,
        isPanning,
        svgRef,
        handleZoomIn,
        handleZoomOut,
        handleZoomReset,
        handleMouseDown,
        handleMouseMove,
        handleMouseUp,
        handleWheel,
    };
}

