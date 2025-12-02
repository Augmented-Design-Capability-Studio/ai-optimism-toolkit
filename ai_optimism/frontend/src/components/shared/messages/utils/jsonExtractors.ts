/**
 * JSON extraction utilities for parsing JSON blocks from markdown text
 * Used by client chat interface for displaying structured data
 */

/**
 * Extract JSON blocks from text (```json ... ```)
 */
export function extractJSONBlocks(text: string): Array<{ before: string; json: string; after: string }> {
  const blocks: Array<{ before: string; json: string; after: string }> = [];
  let offset = 0;

  // Match ```json ... ``` blocks
  const jsonBlockRegex = /```json\s*([\s\S]*?)\s*```/g;
  let match;
  
  while ((match = jsonBlockRegex.exec(text)) !== null) {
    const before = text.substring(offset, match.index);
    const json = match[1].trim();
    offset = match.index + match[0].length;
    
    blocks.push({
      before,
      json,
      after: '', // Will be filled by next iteration or final remaining
    });
  }
  
  // If we found blocks, update the last one's 'after' with remaining text
  if (blocks.length > 0) {
    blocks[blocks.length - 1].after = text.substring(offset);
  }
  
  return blocks.length > 0 ? blocks : [];
}

/**
 * Split text into parts with JSON blocks separated
 */
export function splitTextWithJSON(text: string): Array<{ type: 'text' | 'json'; content: string }> {
  const jsonBlocks = extractJSONBlocks(text);
  
  if (jsonBlocks.length === 0) {
    return [{ type: 'text', content: text }];
  }
  
  const parts: Array<{ type: 'text' | 'json'; content: string }> = [];
  
  for (let i = 0; i < jsonBlocks.length; i++) {
    const block = jsonBlocks[i];
    if (block.before) {
      parts.push({ type: 'text', content: block.before });
    }
    parts.push({ type: 'json', content: block.json });
    if (i === jsonBlocks.length - 1 && block.after) {
      parts.push({ type: 'text', content: block.after });
    }
  }
  
  return parts;
}

