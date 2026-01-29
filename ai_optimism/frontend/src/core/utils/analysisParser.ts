export type AnalysisChecklistStatus = 'complete' | 'partial' | 'missing';

export interface AnalysisChecklistItem {
  label: string;
  status: AnalysisChecklistStatus;
  assumed?: boolean;
}

export interface AnalysisBlock {
  reasoning?: string;
  assumptions?: Array<{ text: string; assumed?: boolean }>;
  checklist?: {
    variables?: AnalysisChecklistItem[];
    objectives?: AnalysisChecklistItem[];
    constraints?: AnalysisChecklistItem[];
    properties?: AnalysisChecklistItem[];
    data?: AnalysisChecklistItem[];
  };
}

export function parseAnalysisBlock(text: string): AnalysisBlock | null {
  const match = text.match(/```analysis\s*([\s\S]*?)\s*```/i);
  if (!match) return null;

  try {
    const parsed = JSON.parse(match[1]);
    return normalizeAnalysisBlock(parsed);
  } catch (error) {
    console.warn('[analysisParser] Failed to parse analysis block:', error);
    return null;
  }
}

export function parseAnalysisBlockLoose(text: string): AnalysisBlock | null {
  const fenced = parseAnalysisBlock(text);
  if (fenced) return fenced;

  const analysisIndex = text.toLowerCase().indexOf('analysis');
  if (analysisIndex === -1) return null;

  const jsonStart = text.indexOf('{', analysisIndex);
  if (jsonStart === -1) return null;

  const jsonText = extractJsonObject(text.slice(jsonStart));
  if (!jsonText) return null;

  try {
    const parsed = JSON.parse(jsonText);
    return normalizeAnalysisBlock(parsed);
  } catch (error) {
    console.warn('[analysisParser] Failed to parse loose analysis block:', error);
    return null;
  }
}

function extractJsonObject(text: string): string | null {
  let depth = 0;
  let inString = false;
  let escape = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (char === '\\') {
      escape = true;
      continue;
    }
    if (char === '"' && !escape) {
      inString = !inString;
    }
    if (inString) continue;

    if (char === '{') depth += 1;
    if (char === '}') depth -= 1;

    if (depth === 0 && char === '}') {
      return text.slice(0, i + 1);
    }
  }

  return null;
}

function normalizeChecklistItems(value: any): AnalysisChecklistItem[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const normalized = value
    .filter((item) => item && typeof item.label === 'string')
    .map((item) => ({
      label: item.label.trim(),
      status: normalizeStatus(item.status),
      assumed: typeof item.assumed === 'boolean' ? item.assumed : false,
    }));
  return normalized.length > 0 ? normalized : undefined;
}

function normalizeStatus(value: any): AnalysisChecklistStatus {
  if (value === 'complete' || value === 'partial' || value === 'missing') {
    return value;
  }
  return 'missing';
}

function normalizeAnalysisBlock(value: any): AnalysisBlock | null {
  if (!value || typeof value !== 'object') return null;

  const reasoning =
    typeof value.reasoning === 'string' ? value.reasoning.trim() : undefined;

  const assumptions = Array.isArray(value.assumptions)
    ? value.assumptions
        .filter((item: any) => item && typeof item.text === 'string')
        .map((item: any) => ({
          text: item.text.trim(),
          assumed: typeof item.assumed === 'boolean' ? item.assumed : true,
        }))
    : [];

  const checklist = value.checklist && typeof value.checklist === 'object'
    ? {
        variables: normalizeChecklistItems(value.checklist.variables),
        objectives: normalizeChecklistItems(value.checklist.objectives),
        constraints: normalizeChecklistItems(value.checklist.constraints),
        properties: normalizeChecklistItems(value.checklist.properties),
        data: normalizeChecklistItems(value.checklist.data),
      }
    : undefined;

  if (!reasoning && assumptions.length === 0 && !checklist) {
    return null;
  }

  return {
    reasoning,
    assumptions,
    checklist,
  };
}
