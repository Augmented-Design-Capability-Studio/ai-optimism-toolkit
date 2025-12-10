import { useRef } from 'react';
import { GraphEdges } from './GraphEdges';
import { ObjectiveNodes } from './ObjectiveNodes';
import { ModifierNodes } from './ModifierNodes';
import type { HeuristicMapData, GraphLayout } from '../types';

interface GraphSVGProps {
    data: HeuristicMapData;
    layout: GraphLayout;
    zoom: number;
    pan: { x: number; y: number };
    isPanning: boolean;
    selectedEdge: { obj: string; mod: string; weight: number } | null;
    onEdgeClick: (event: React.MouseEvent<SVGElement>, obj: string, mod: string, weight: number) => void;
    onMouseDown: (e: React.MouseEvent<SVGSVGElement>) => void;
    onMouseMove: (e: React.MouseEvent<SVGSVGElement>) => void;
    onMouseUp: () => void;
    onWheel: (e: React.WheelEvent<SVGSVGElement>) => void;
}

export function GraphSVG({
    data,
    layout,
    zoom,
    pan,
    isPanning,
    selectedEdge,
    onEdgeClick,
    onMouseDown,
    onMouseMove,
    onMouseUp,
    onWheel,
}: GraphSVGProps) {
    const svgRef = useRef<SVGSVGElement>(null);

    return (
        <svg 
            ref={svgRef}
            width="100%" 
            height="100%" 
            style={{ minHeight: 400, minWidth: layout.svgWidth, cursor: isPanning ? 'grabbing' : 'grab' }}
            viewBox={`0 0 ${layout.svgWidth} ${layout.svgHeight}`}
            preserveAspectRatio="xMidYMid meet"
            onWheel={onWheel}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseUp}
        >
            <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
                <defs>
                    <marker id="arrowhead-pos" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                        <polygon points="0 0, 10 3.5, 0 7" fill="#2e7d32" />
                    </marker>
                    <marker id="arrowhead-neg" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                        <polygon points="0 0, 10 3.5, 0 7" fill="#d32f2f" />
                    </marker>
                </defs>

                <GraphEdges
                    data={data}
                    layout={layout}
                    selectedEdge={selectedEdge}
                    onEdgeClick={onEdgeClick}
                />

                <ObjectiveNodes
                    data={data}
                    layout={layout}
                />

                <ModifierNodes
                    data={data}
                    layout={layout}
                />
            </g>
        </svg>
    );
}

