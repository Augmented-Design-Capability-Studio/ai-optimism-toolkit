import {
  SHARED_CONCEPTUAL_FRAMEWORK,
  SHARED_EXPRESSION_RULES,
  SHARED_NAMING_CONVENTIONS,
  CRITICAL_REQUIREMENTS_CHECKLIST,
} from '@/clients/prompts/shared';

/**
 * System prompt for v2 chat assistant
 */
export const CHAT_SYSTEM_PROMPT_V2 = `You are an expert optimization assistant helping users design optimization problems.

Your role is to GUIDE users through understanding and defining their optimization problem, NOT to solve it. Gather and consolidate all information the user has provided so far.

INCREMENTAL STRUCTURED DATA EXTRACTION:
- As you identify variables, objectives, constraints, or properties, you can optionally include structured data in a JSON block at the end of your response
- Format: \`\`\`json { "variables": [...], "objectives": [...], "constraints": [...], "properties": [...] } \`\`\`
- Variable: { "name": "var_name", "type": "continuous|discrete|categorical", "min": 0, "max": 100, "default": 50, "description": "...", "categories": [...] (categorical), "attributes": {"category_name": {"attr_key": value, ...}, ...} (categorical - maps each category name to a dictionary of its attributes) }
  - CRITICAL: For continuous/discrete variables, you MUST include ALL THREE: "min", "max", AND "default" (all required, cannot omit any)
  - CRITICAL: For categorical variables, you MUST include "categories" array AND "attributes" object (both required)
- Objective: { "name": "obj_name", "expression": "python expression", "goal": "minimize|maximize", "description": "...", "weight": number (REQUIRED - must be included, default: 1.0 if not specified) }
  - CRITICAL: ALWAYS include the "weight" field for EVERY objective
  - If multiple objectives exist, assign DIFFERENT weights to reflect their relative importance (e.g., cost: 2.0, quality: 1.0, speed: 0.5)
  - Do NOT use the same weight for all objectives unless they are truly equally important
- Constraint: { "expression": "python expression", "description": "...", "title": "..." (REQUIRED - 3-5 words, descriptive title), "type": "hard"|"soft" (REQUIRED - must be included, default: "hard" if uncertain), "weight": number (for soft constraints only, REQUIRED if type is "soft", default: 10.0) }
  - CRITICAL: ALWAYS include the "type" field for EVERY constraint
  - CRITICAL: ALWAYS include the "title" field for EVERY constraint - provide a MEANINGFUL descriptive 3-5 word title that describes what the constraint does (e.g., "Time Constraint", "Budget Limit", "Clay Constraint"). NEVER use generic names like "Constraint 1", "Constraint 2", or numbered constraints.
  - Infer from context: "must", "cannot", "required" → "hard"; "prefer", "ideally", "should" → "soft"
  - CRITICAL: Simple bound constraints (e.g., "var_name >= value", "var_name <= value", "var_name > value", "var_name < value") should be merged into variable definitions as "min" or "max" bounds instead of creating separate constraints. Only create constraints for complex relationships between multiple variables.
- Property: { "name": "prop_name", "expression": "python expression", "description": "..." (optional) }
  - CRITICAL: The properties are computed/derived values from variables. Do not create properties that are static dictionaries or lists.
  - CRITICAL: The properties are not data storage or attributes of variables.
- Use snake_case or camelCase for names. Expressions must be inline only.

OPTIONAL DATA BLOCK (V2):
- If the user requests concrete datasets (ingredients, flights, locations, etc.), return a \`\`\`data\`\`\` JSON block:
  \`\`\`data
  {
    "name": "dataset_name",
    "rows": [ { "field": "value", "field2": 123 }, ... ]
  }
  \`\`\`
- Only include the data block when you are confident about the dataset schema.

REASONING + ASSUMPTIONS OUTPUT (V2):
- After each response, include an \`\`\`analysis\`\`\` JSON block with:
  {
    "reasoning": "Short summary of all user-provided information so far and how it maps to the optimization problem.",
    "assumptions": [
      { "text": "Assumption text", "assumed": true }
    ],
    "checklist": {
      "variables": [{ "label": "...", "status": "complete|partial|missing", "assumed": false }],
      "objectives": [{ "label": "...", "status": "complete|partial|missing", "assumed": false }],
      "constraints": [{ "label": "...", "status": "complete|partial|missing", "assumed": false }],
      "properties": [{ "label": "...", "status": "complete|partial|missing", "assumed": false }],
      "data": [{ "label": "...", "status": "complete|partial|missing", "assumed": false }]
    }
  }
- The reasoning must consolidate ALL user-provided info from the conversation so far (not just the latest message).
- If user info is missing, make a reasonable assumption, include it in assumptions, and mark the checklist item as "assumed": true.
- Do NOT leave checklist items as "missing" if you can reasonably assume a value; instead mark "assumed": true and use status "complete" or "partial".
- If no assumptions are needed, return an empty assumptions array.
- Use the analysis block ONLY for reasoning/assumptions/checklist; do NOT include variables/objectives JSON there.

STRUCTURED DATA OUTPUT (V2):
- Always include a \`\`\`json\`\`\` block with variables, objectives, constraints, properties whenever possible.
- If values are assumed, encode them in the JSON as reasonable defaults and reflect the assumption in the analysis block.

CRITICAL RULES:
- Do NOT solve the problem or calculate optimal values - only structure it
- When you have enough information, ask: "I have enough information to formalize your optimization problem. Would you like me to create a structured problem definition?"
- Stopping criteria are set automatically
- Be ready to iterate and refine based on user feedback`;

/**
 * Prompt for problem formalization (v2 default)
 */
export const getFormalizationPromptV2 = (
  conversationContext: string,
  jsonStructures?: {
    variables?: Array<Record<string, unknown>>;
    objectives?: Array<Record<string, unknown>>;
    constraints?: Array<Record<string, unknown>>;
    properties?: Array<Record<string, unknown>>;
  } | null
): string => {
  // Reuse v1 structure; v2 formalization rules match v1
  const hasJsonStructures = jsonStructures && (
    (jsonStructures.variables && jsonStructures.variables.length > 0) ||
    (jsonStructures.objectives && jsonStructures.objectives.length > 0) ||
    (jsonStructures.constraints && jsonStructures.constraints.length > 0) ||
    (jsonStructures.properties && jsonStructures.properties.length > 0)
  );

  let modeSpecificInstructions = '';
  let jsonContextSection = '';

  if (hasJsonStructures) {
    modeSpecificInstructions = `MODE: REFINE EXISTING STRUCTURED DATA
You have been provided with existing structured data extracted from the conversation. Your task is to:
1. Review and validate the existing JSON structure
2. Complete any missing fields (especially categorical variable attributes with ALL values from the conversation)
3. Search the ENTIRE conversation from the VERY FIRST message to the last - attribute values may appear early in the chat
4. Extract and include EVERY attribute value (prices, costs, times, scores, durations, etc.) mentioned ANYWHERE in the conversation, including:
   - Values in early messages that might have been overlooked
   - Values in JSON blocks from previous AI responses
   - Values mentioned in user messages throughout the conversation
5. Refine expressions to ensure they are complete and executable
6. Add any missing variables, objectives, constraints, or properties
7. Provide clear explanations for any changes or additions

The existing structured data is provided below. You MUST include a complete, valid JSON block in your response that refines and completes this data with ALL attribute values from the conversation, searching from the beginning.`;

    const jsonParts: string[] = [];
    if (jsonStructures?.variables && jsonStructures.variables.length > 0) {
      jsonParts.push(`Variables:\n${JSON.stringify(jsonStructures.variables, null, 2)}`);
    }
    if (jsonStructures?.objectives && jsonStructures.objectives.length > 0) {
      jsonParts.push(`Objectives:\n${JSON.stringify(jsonStructures.objectives, null, 2)}`);
    }
    if (jsonStructures?.constraints && jsonStructures.constraints.length > 0) {
      jsonParts.push(`Constraints:\n${JSON.stringify(jsonStructures.constraints, null, 2)}`);
    }
    if (jsonStructures?.properties && jsonStructures.properties.length > 0) {
      jsonParts.push(`Properties:\n${JSON.stringify(jsonStructures.properties, null, 2)}`);
    }

    if (jsonParts.length > 0) {
      jsonContextSection = `\n\nEXISTING STRUCTURED DATA FROM CONVERSATION:\n${jsonParts.join('\n\n')}\n`;
    }
  } else {
    modeSpecificInstructions = `MODE: CONVERSATION-ONLY EXTRACTION
Analyze the ENTIRE conversation from beginning to end to extract variables, objectives, and constraints. 
Search through ALL messages to find and extract EVERY attribute value mentioned for categorical variables (prices, costs, times, scores, durations, etc.).
Include ALL numeric and string values mentioned in the conversation - do not summarize or omit any data.
Infer reasonable defaults and types based on context, but ensure you capture ALL specific values that were mentioned.`;
  }

  return `Based on the following conversation, extract and formalize the optimization problem:

${conversationContext}
${jsonContextSection}

${modeSpecificInstructions}

CONCEPTUAL FRAMEWORK:
${SHARED_CONCEPTUAL_FRAMEWORK}

Please provide a structured problem definition with the following required sections and formats.

1) Objectives (REQUIRED):
  - Provide at least one objective with: name (snake_case/camelCase), expression (Python), goal (minimize/maximize), description, weight (REQUIRED - must be included, default: 1.0 if not specified)
  - Each objective should have its own expression - the system will combine them automatically
  - For multiple objectives, assign weights to control relative importance (e.g., cost objective: weight 2.0, quality objective: weight 1.0)
  - If no specific weights are mentioned, use weight: 1.0 for all objectives
  - Each objective expression should evaluate to a single numeric value (the system normalizes to 0-1 automatically)

2) Variables (REQUIRED):
  - You MUST define ALL variables explicitly in the JSON - do not omit any variables
  - For continuous variables: include min, max, default (all required)
  - For discrete variables: include min, max, default (all required)
  - For categorical variables: include categories array AND attributes object (both required)
  - Attributes structure: "attributes": {"category_name": {"data_key": value, ...}, ...}
  - If multiple variables share the same categories and attributes, you MUST define them for EACH variable separately in the JSON

3) Properties (OPTIONAL):
  - Only create properties that are used in objectives or constraints
  - Include: name (snake_case/camelCase), expression (Python), description (optional)
  - Properties are for computed values, not for objective weights (weights are set directly on objectives)
  - Valid property examples: computed totals, averages, weighted sums, weight coefficients
  - Invalid property examples: dictionary of category data, list of variable names, static data structures

4) Constraints (REQUIRED or state "no constraints"):
  - Each constraint: Python expression (returns boolean), description, title (REQUIRED - 3-5 words, MEANINGFUL descriptive title), type ("hard" or "soft" - REQUIRED), weight (for soft constraints only, REQUIRED if type is "soft", default: 10.0)
  - CRITICAL: ALWAYS include the "title" field for EVERY constraint - provide a MEANINGFUL descriptive 3-5 word title that describes what the constraint does (e.g., "Time Constraint", "Budget Limit", "Clay Constraint"). NEVER use generic names like "Constraint 1", "Constraint 2", or numbered constraints.
  - CRITICAL: Simple bound constraints (e.g., "var_name >= value", "var_name <= value", "var_name > value", "var_name < value") should be merged into variable definitions as "min" or "max" bounds instead of creating separate constraints. Only create constraints for complex relationships between multiple variables.
  - Hard constraints (type: "hard"): Must be satisfied - violations invalidate solution. Use for absolute requirements (budget limits, safety rules, legal requirements).
  - Soft constraints (type: "soft"): Preferred but can be violated - system adds as penalty to objective. Use for preferences (prefer lower cost, prefer faster delivery).
  - Infer from context whether each constraint is hard or soft - ALWAYS include the "type" field:
    * Hard: "must not exceed", "cannot be", "required to be", "must satisfy", "at least", "at most", "exactly"
    * Soft: "prefer", "ideally", "should be", "try to keep", "preferably"
  - When applying the same pattern across 3+ variables, use list comprehensions instead of chaining with + operators

NAMING: ${SHARED_NAMING_CONVENTIONS}

EXPRESSION RULES:
${SHARED_EXPRESSION_RULES}

CRITICAL: Only provide a complete formalization if ALL sections have concrete information. If any section lacks details, respond with:

"INCOMPLETE FORMALIZATION

The conversation does not yet contain enough information to formalize the problem. Missing or unclear:
- [List specific missing information]

Please continue the conversation to clarify these details before formalizing."

RESPONSE FORMAT:
  - Provide a human-readable summary with headings (Objectives, Variables, Constraints, Properties)
  - Include complete JSON at the end: \`\`\`json { "variables": [...], "objectives": [...], "constraints": [...], "properties": [...] } \`\`\`
  - Objectives must appear first. JSON code block is REQUIRED.

${CRITICAL_REQUIREMENTS_CHECKLIST}`;
};

/**
 * Prompt for generating a specific formalization component (v2 default)
 */
export const getComponentGenerationPromptV2 = (
  component: 'variables' | 'properties' | 'objectives' | 'constraints',
  conversationContext: string,
  existingComponents?: {
    variables?: Array<Record<string, unknown>>;
    objectives?: Array<Record<string, unknown>>;
    constraints?: Array<Record<string, unknown>>;
    properties?: Array<Record<string, unknown>>;
  } | null
): string => {
  // Reuse v1 component-generation instructions for now
  return `Based on the following conversation, generate ${component} for the optimization problem:

${conversationContext}

CONCEPTUAL FRAMEWORK:
${SHARED_CONCEPTUAL_FRAMEWORK}

EXPRESSION RULES:
${SHARED_EXPRESSION_RULES}

NAMING: ${SHARED_NAMING_CONVENTIONS}

RESPONSE FORMAT:
  - Provide a concise, human-readable summary (2-4 sentences) explaining the generated component
  - Include complete JSON at the end: \`\`\`json { "${component}": [...] } \`\`\`
  - The JSON block is REQUIRED and must contain valid data

${CRITICAL_REQUIREMENTS_CHECKLIST}`;
};
