import type { Message } from '@/core/services/sessionManager';
import type { AnalysisBlock } from '@/core/utils/analysisParser';

export function getLatestAnalysisFromMessages(messages: Message[]): AnalysisBlock | null {
  if (!messages || messages.length === 0) return null;
  const withAnalysis = messages
    .filter((m) => m.metadata?.analysis)
    .sort((a, b) => b.timestamp - a.timestamp);
  if (withAnalysis.length === 0) return null;
  return (withAnalysis[0].metadata?.analysis as AnalysisBlock) || null;
}
