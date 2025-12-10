import type { GraphLayout, HeuristicMapData } from '../types';

/**
 * Calculate graph layout dimensions and spacing
 */
export const calculateGraphLayout = (data: HeuristicMapData): GraphLayout => {
    const numObjectives = data.objectives?.length || 0;
    const numModifiers = data.modifiers?.length || 0;
    const minSpacing = 60;
    const padding = 50;
    const nodeHeight = 55;
    const objBoxWidth = 150;
    const modBoxWidth = 130;
    
    // Calculate SVG dimensions
    const baseHeight = Math.max(numObjectives, numModifiers) * minSpacing + 2 * padding;
    const svgHeight = Math.max(400, baseHeight);
    const svgWidth = 600;
    
    // Calculate spacing based on actual SVG height
    const objSpacing = numObjectives > 1 
        ? Math.max(minSpacing, (svgHeight - 2 * padding - nodeHeight) / (numObjectives - 1))
        : 0;
    const modSpacing = numModifiers > 1
        ? Math.max(minSpacing, (svgHeight - 2 * padding - nodeHeight) / (numModifiers - 1))
        : 0;
    
    const leftX = 100;
    const rightX = svgWidth - 100;

    return {
        svgWidth,
        svgHeight,
        leftX,
        rightX,
        objSpacing,
        modSpacing,
        nodeHeight,
        objBoxWidth,
        modBoxWidth,
    };
};

/**
 * Get Y position for objective node
 */
export const getObjectiveY = (idx: number, layout: GraphLayout, numObjectives: number): number => {
    if (numObjectives === 1) return layout.svgHeight / 2;
    const padding = 50;
    return padding + (idx * layout.objSpacing);
};

/**
 * Get Y position for modifier node
 */
export const getModifierY = (idx: number, layout: GraphLayout, numModifiers: number): number => {
    if (numModifiers === 1) return layout.svgHeight / 2;
    const padding = 50;
    return padding + (idx * layout.modSpacing);
};

