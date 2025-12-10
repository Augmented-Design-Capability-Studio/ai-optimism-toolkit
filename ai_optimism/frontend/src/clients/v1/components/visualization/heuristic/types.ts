export interface HeuristicNetworkProps {
    data: any;
    onWeightsChange?: (weights: Record<string, Record<string, number>>) => void;
}

export interface HeuristicMapData {
    objectives: string[];
    modifiers: string[];
    weights: Record<string, Record<string, number>>;
}

export interface Edge {
    obj: string;
    mod: string;
    weight: number;
}

export interface NodePosition {
    x: number;
    y: number;
}

export interface GraphLayout {
    svgWidth: number;
    svgHeight: number;
    leftX: number;
    rightX: number;
    objSpacing: number;
    modSpacing: number;
    nodeHeight: number;
    objBoxWidth: number;
    modBoxWidth: number;
}

