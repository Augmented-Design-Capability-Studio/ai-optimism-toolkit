import { getModifierY } from '../utils/graphLayout';
import { parseModifier, formatLabel } from '../utils/labelFormatting';
import type { HeuristicMapData, GraphLayout } from '../types';

interface ModifierNodesProps {
    data: HeuristicMapData;
    layout: GraphLayout;
}

export function ModifierNodes({ data, layout }: ModifierNodesProps) {
    const numModifiers = data.modifiers?.length || 0;

    return (
        <>
            {data.modifiers.map((mod, idx) => {
                const y = getModifierY(idx, layout, numModifiers);
                const { action, variable } = parseModifier(mod);
                return (
                    <g key={mod} transform={`translate(${layout.rightX}, ${y})`}>
                        <rect 
                            x={-layout.modBoxWidth / 2} 
                            y={-layout.nodeHeight / 2} 
                            width={layout.modBoxWidth} 
                            height={layout.nodeHeight} 
                            rx="5" 
                            fill="#f3e5f5" 
                            stroke="#7b1fa2" 
                            strokeWidth="1" 
                        />
                        {action ? (
                            <>
                                <text 
                                    x="0" 
                                    y="-5" 
                                    textAnchor="middle" 
                                    fontSize="10" 
                                    fill="#4a148c" 
                                    fontWeight="bold" 
                                    dominantBaseline="middle"
                                >
                                    {action}
                                </text>
                                <text 
                                    x="0" 
                                    y="8" 
                                    textAnchor="middle" 
                                    fontSize="10" 
                                    fill="#4a148c" 
                                    fontWeight="normal" 
                                    dominantBaseline="middle"
                                >
                                    {variable.length > 18 ? variable.substring(0, 16) + '..' : variable}
                                </text>
                            </>
                        ) : (
                            <text 
                                x="0" 
                                y="0" 
                                textAnchor="middle" 
                                fontSize="10" 
                                fill="#4a148c" 
                                fontWeight="bold" 
                                dominantBaseline="middle"
                            >
                                {variable.length > 20 ? variable.substring(0, 18) + '..' : variable}
                            </text>
                        )}
                        <title>{formatLabel(mod, 'modifier')}</title>
                    </g>
                );
            })}
        </>
    );
}

