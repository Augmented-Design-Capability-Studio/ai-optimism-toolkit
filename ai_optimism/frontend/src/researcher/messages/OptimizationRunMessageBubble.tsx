/**
 * Optimization run message bubble with accordions
 */

import { Message } from '../../core/services/sessionManager';
import { OptimizationRunMessage } from '../../core/components/shared/chat';

interface OptimizationRunMessageBubbleProps {
  message: Message;
}

export function OptimizationRunMessageBubble({ message }: OptimizationRunMessageBubbleProps) {
  return (
    <OptimizationRunMessage
      content={message.content}
      status={message.metadata?.status as 'completed' | 'failed' | 'running' | undefined}
      bestScore={message.metadata?.bestScore}
      runId={message.metadata?.runId}
      optimizationPacket={message.metadata?.optimizationPacket}
      heuristicMap={message.metadata?.heuristic_map}
      variant="default"
      useMarkdown={true}
    />
  );
}

