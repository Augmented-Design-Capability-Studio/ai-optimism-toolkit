import { getObjectiveY, getModifierY } from '../utils/graphLayout';
import type { HeuristicMapData, GraphLayout } from '../types';

interface GraphEdgesProps {
    data: HeuristicMapData;
    layout: GraphLayout;
    selectedEdge: { obj: string; mod: string; weight: number } | null;
    onEdgeClick: (event: React.MouseEvent<SVGElement>, obj: string, mod: string, weight: number) => void;
}

export function GraphEdges({ data, layout, selectedEdge, onEdgeClick }: GraphEdgesProps) {
    const numObjectives = data.objectives?.length || 0;
    const numModifiers = data.modifiers?.length || 0;

    return (
        <>
            {data.objectives.map((obj, objIdx) => {
                return data.modifiers.map((mod, modIdx) => {
                    // Get weight from data, unless currently editing this specific edge
                    let weight = data.weights[obj]?.[mod] || 0;

                    // If this edge is being edited, show the live value from the slider
                    if (selectedEdge && selectedEdge.obj === obj && selectedEdge.mod === mod) {
                        weight = selectedEdge.weight;
                    }

                    if (weight === 0 && (!selectedEdge || selectedEdge.obj !== obj || selectedEdge.mod !== mod)) {
                        return null;
                    }

                    // Calculate positions using dynamic layout
                    const objY = getObjectiveY(objIdx, layout, numObjectives);
                    const modY = getModifierY(modIdx, layout, numModifiers);

                    const startX = layout.leftX + layout.objBoxWidth / 2;
                    const startY = objY;
                    const endX = layout.rightX - layout.modBoxWidth / 2;
                    const endY = modY;

                    const color = weight > 0 ? '#2e7d32' : '#d32f2f';
                    const opacity = Math.min(1, Math.abs(weight) + 0.2);
                    const strokeWidth = 1 + Math.abs(weight) * 3;

                    return (
                        <g 
                            key={`${obj}-${mod}`}
                            style={{ cursor: 'pointer' }}
                            onClick={(e) => onEdgeClick(e, obj, mod, weight)}
                        >
                            <path
                                d={`M ${startX} ${startY} C ${startX + 100} ${startY}, ${endX - 100} ${endY}, ${endX} ${endY}`}
                                stroke={color}
                                strokeWidth={strokeWidth}
                                fill="none"
                                opacity={opacity}
                                markerEnd={`url(#arrowhead-${weight > 0 ? 'pos' : 'neg'})`}
                            />
                            {/* Invisible wider path for easier clicking */}
                            <path
                                d={`M ${startX} ${startY} C ${startX + 100} ${startY}, ${endX - 100} ${endY}, ${endX} ${endY}`}
                                stroke="transparent"
                                strokeWidth={15}
                                fill="none"
                            />
                        </g>
                    );
                });
            })}
        </>
    );
}

