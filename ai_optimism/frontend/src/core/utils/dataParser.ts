export interface DataPayload {
  name: string;
  rows: Array<Record<string, unknown>>;
}

export function parseDataBlock(text: string): DataPayload | null {
  const match = text.match(/```data\s*([\s\S]*?)\s*```/i);
  if (!match) return null;

  try {
    const parsed = JSON.parse(match[1]);
    return normalizeDataPayload(parsed);
  } catch (error) {
    console.warn('[dataParser] Failed to parse data block:', error);
    return null;
  }
}

function normalizeDataPayload(value: any): DataPayload | null {
  if (!value || typeof value !== 'object') return null;
  if (typeof value.name !== 'string' || !Array.isArray(value.rows)) {
    return null;
  }
  const rows = value.rows.filter((row: any) => row && typeof row === 'object' && !Array.isArray(row));
  return {
    name: value.name.trim() || 'dataset',
    rows,
  };
}
