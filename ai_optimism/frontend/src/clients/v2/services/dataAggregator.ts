import type { Message } from '@/core/services/sessionManager';
import type { DataPayload } from '@/core/utils/dataParser';

export function getLatestDataFromMessages(messages: Message[]): DataPayload | null {
  if (!messages || messages.length === 0) return null;
  const withData = messages
    .filter((m) => m.metadata?.dataPayload)
    .sort((a, b) => b.timestamp - a.timestamp);
  if (withData.length === 0) return null;
  return (withData[0].metadata?.dataPayload as DataPayload) || null;
}
