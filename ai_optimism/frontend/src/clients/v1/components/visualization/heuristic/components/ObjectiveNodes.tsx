import { getObjectiveY } from '../utils/graphLayout';
import { formatLabel, splitTextIntoLines } from '../utils/labelFormatting';
import type { HeuristicMapData, GraphLayout } from '../types';

interface ObjectiveNodesProps {
    data: HeuristicMapData;
    layout: GraphLayout;
}

export function ObjectiveNodes({ data, layout }: ObjectiveNodesProps) {
    const numObjectives = data.objectives?.length || 0;

    return (
        <>
            {data.objectives.map((obj, idx) => {
                const y = getObjectiveY(idx, layout, numObjectives);
                const label = formatLabel(obj, 'objective');
                
                // Determine if it's a violation or regular objective
                let typeLabel = 'Objective';
                let contentLabel = obj;
                
                if (obj.startsWith('Violation: ')) {
                    typeLabel = 'Violation';
                    contentLabel = obj.substring(11);
                } else if (obj.startsWith('Violation(')) {
                    typeLabel = 'Violation';
                    contentLabel = obj.substring(10, obj.length - 1);
                } else {
                    contentLabel = obj;
                }
                
                // Split content into multiple lines
                const displayLines = splitTextIntoLines(contentLabel, 22, 2);
                
                // Calculate vertical positions to center text in the box
                let typeLabelY: number;
                let contentLineYs: number[];
                
                if (displayLines.length === 1) {
                    typeLabelY = -6;
                    contentLineYs = [6];
                } else if (displayLines.length === 2) {
                    typeLabelY = -10;
                    contentLineYs = [0, 10];
                } else {
                    typeLabelY = 0;
                    contentLineYs = [];
                }
                
                return (
                    <g key={obj} transform={`translate(${layout.leftX}, ${y})`}>
                        <rect 
                            x={-layout.objBoxWidth / 2} 
                            y={-layout.nodeHeight / 2} 
                            width={layout.objBoxWidth} 
                            height={layout.nodeHeight} 
                            rx="5" 
                            fill="#e3f2fd" 
                            stroke="#1976d2" 
                            strokeWidth="1" 
                        />
                        <text 
                            x="0" 
                            y={typeLabelY} 
                            textAnchor="middle" 
                            fontSize="10" 
                            fill="#0d47a1" 
                            fontWeight="bold" 
                            dominantBaseline="middle"
                        >
                            {typeLabel}
                        </text>
                        {displayLines.map((line, lineIdx) => (
                            <text 
                                key={lineIdx}
                                x="0" 
                                y={contentLineYs[lineIdx]} 
                                textAnchor="middle" 
                                fontSize="9" 
                                fill="#0d47a1" 
                                fontWeight="normal" 
                                dominantBaseline="middle"
                            >
                                {line}
                            </text>
                        ))}
                        <title>{label}</title>
                    </g>
                );
            })}
        </>
    );
}

