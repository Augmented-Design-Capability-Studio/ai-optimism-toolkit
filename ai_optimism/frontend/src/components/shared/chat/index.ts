/**
 * Shared chat components and utilities
 * Used by both client and researcher chat interfaces
 * 
 * Structure:
 * - input/ - Input/editing components (contentEditable, live formatting)
 * - messages/ - Message display components (ReactMarkdown, static rendering)
 */

// Input components
export { MarkdownInput } from './input/MarkdownInput';

// Message components
export { MarkdownContent } from './messages/MarkdownContent';
export { FormalizationMessage } from './messages/FormalizationMessage';
export { OptimizationRunMessage } from './messages/OptimizationRunMessage';
export { JSONBlockCollapsible } from './messages/JSONBlockCollapsible';
export { markdownStyles, markdownStylesLight } from './messages/utils/markdownStyles';
export { extractJSONBlocks, splitTextWithJSON } from './messages/utils/jsonExtractors';

