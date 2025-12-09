/**
 * Centralized AI prompts configuration
 * All prompts used in the application are defined here for easy tuning and maintenance
 * 
 * STRUCTURE:
 * 1. SHARED COMPONENTS - Reusable constants (conceptual framework, expression rules, etc.)
 * 2. CHAT PROMPTS - Main chat assistant prompts
 * 3. FORMALIZATION PROMPTS - Problem formalization and component generation
 * 4. RESEARCHER PROMPTS - Researcher-specific prompts (draft formatting, etc.)
 * 
 * When editing prompts:
 * - Keep shared components at the top for easy reference
 * - Use descriptive function names and clear parameter types
 * - Add comments explaining when/where prompts are used
 * - Maintain consistent formatting for readability
 */

// ============================================
// SHARED COMPONENTS (Reference these, don't repeat)
// ============================================

/**
 * Shared conceptual framework for optimization problems
 * Used across all prompts to ensure consistency
 */
const SHARED_CONCEPTUAL_FRAMEWORK = `Variables: The decision variables of your optimization problem
  - Continuous: Real numbers with min/max bounds (must include min, max, default)
  - Discrete: Integers with min/max bounds (must include min, max, default)
  - Categorical: Named choices, each with associated data in "attributes" field

Attributes: Data associated with categorical variable choices
  - Stored directly on the variable: variable.attributes[category_name]
  - Contains static data: costs, times, scores, etc.
  - NOT computed - it's the raw data for each choice
  - MUST be included in variable "attributes" field, NEVER in properties

Properties: Computed/derived values from variables
  - Calculated using Python expressions
  - Examples: totals, averages, weighted sums, weight coefficients
  - Used as shorthand in objectives/constraints
  - NOT data storage - always computed from variables
  - DO NOT create properties that are static dictionaries or lists

Constraints: Requirements that must be satisfied
  - Hard constraints: MUST be satisfied (expression returns True) - violations make solution invalid. Use for absolute limits (e.g., budget cannot be exceeded, safety requirements).
  - Soft constraints: Preferred but can be violated - added as weighted penalty to objective. Use for preferences (e.g., prefer staying under budget, but willing to go slightly over for better quality).
  - Specify constraint type: "hard" (default) or "soft" based on whether violation is acceptable
  - For soft constraints, include "weight" field (default: 10.0) - higher weight = stronger preference to satisfy
  - Expression must return boolean (True if satisfied, False if violated)

Objectives: What to optimize
  - Each objective has its own expression and goal (minimize/maximize)
  - Multiple objectives are automatically combined: score = Σ(normalized_objective_value × weight)
  - Each objective can have a weight (default: 1.0) to control its importance
  - Higher combined score is better (system normalizes each objective to 0-1, then applies weights)`;

/**
 * Shared expression rules for Python expressions
 * Used across all prompts to ensure consistent expression syntax
 */
const SHARED_EXPRESSION_RULES = `  - All calculations must be inline - no helper functions, no separate data structures
  - DO NOT define dictionaries in expressions
  - DO NOT assign variables in expressions (e.g., "dict = {...}") - this is not allowed
  - Attributes are stored in variable "attributes" field - access them directly using dot notation: {variable_name}.attribute_name
  - Example: If a categorical variable "item" is selected, access its price as "item.price" (not "item_attributes[item]['price']")
  - For datetime/ISO string attributes: Access .hour and .minute directly (e.g., "time_attribute.hour" for ISO strings like "2023-12-18T14:30:00")
  - DO NOT use datetime.fromisoformat() - datetime objects are not available; ISO strings are automatically parsed
  - Prefer dictionary lookups over ternary chains
  - When repeating the same pattern across 3+ variables, use list comprehensions: sum([expr for v in [var1, var2, ...]]) instead of chaining with +
  - Generator expressions also work: sum(expr for v in [var1, var2, ...]) but list comprehensions are preferred
  - Available functions: sum, all, any, min, max, abs, round, sqrt, exp, log, log10, log2, sin, cos, tan, asin, acos, atan, degrees, radians, ceil, floor, fabs, set, len, sorted, int, float, str, bool
  - Available operators: +, -, *, /, //, %, **, ==, !=, <, <=, >, >=, in, not in
  - NOT available: range(), globals(), getattr(), enumerate(), and other built-ins - use explicit variable lists instead
  - Note: len() and sorted() have size limits for security (len: 10000, sorted: 1000)
  - For multiple variables: Use sum([v.attribute for v in [var1, var2, var3, ...]]) NOT sum([getattr(globals()['var' + str(i)], 'attr') for i in range(n)])
  - Example for summing attributes across multiple variables: sum([meal.prep_time for meal in [meal_assignment_1, meal_assignment_2, meal_assignment_3, meal_assignment_4, meal_assignment_5, meal_assignment_6]])
  - Example for counting with conditions: sum([1 for v in [var1, var2, var3] if v.attribute in ['value1', 'value2']])
  - Example for membership testing: (1 if var.attribute in ['value1', 'value2'] else 0) - the 'in' operator works with lists, tuples, and strings`;

/**
 * Shared naming conventions
 */
const SHARED_NAMING_CONVENTIONS = `Use snake_case or camelCase. No spaces or special characters.`;

/**
 * Consolidated critical requirements checklist
 * Consolidates all "CRITICAL" instructions that were repeated across prompts
 */
const CRITICAL_REQUIREMENTS_CHECKLIST = `CRITICAL REQUIREMENTS - Verify ALL before submitting:

□ ATTRIBUTES HANDLING:
  - Attributes belong in variable.attributes, NEVER in properties
  - Search ENTIRE conversation/description from beginning to end for ALL attribute values
  - Extract EVERY attribute value mentioned (prices, costs, times, scores, durations, etc.)
  - Include COMPLETE attributes object with ALL actual values (no summaries or placeholders)
  - Look for patterns like "category X has property Y = value Z" or "X: Y" or "X is Y" throughout ALL messages
  - Attribute values may appear early in the conversation - search EVERY message from the beginning

□ REQUIRED FIELDS:
  - Objectives: "weight" field REQUIRED (default: 1.0 if not specified)
  - Constraints: "type" field REQUIRED ("hard" or "soft", default: "hard" if uncertain)
  - Variables: min/max/default for continuous/discrete; categories+attributes for categorical (both required)
  - Every variable must be listed individually - do not use "see above" or shared definitions

□ EXPRESSIONS:
  - Must be executable Python code (not descriptions, placeholders, or summaries)
  - No dictionaries in expressions - use dot notation: {variable_name}.attribute_name
  - DO NOT use range(), globals(), getattr(), or other unavailable functions - use explicit variable lists in list comprehensions
  - For multiple variables: list them explicitly [var1, var2, var3] not dynamically with range() or globals()
  - Objectives: return numeric values (system normalizes to 0-1 automatically)
  - Constraints: return boolean values (True if satisfied, False if violated)

□ COMPLETENESS:
  - Extract ALL values mentioned (don't summarize or omit any data)
  - Complete JSON with all fields populated
  - Every categorical variable has both "categories" array AND complete "attributes" object with ALL categories
  - All objectives have complete Python expressions (not descriptions)
  - All constraints have complete Python expressions that return booleans
  - DO NOT use placeholders like "scoring_weights" without defining the actual expression
  - DO NOT say "see attributes above" - include the full attributes object in each variable's JSON
  - The JSON block MUST contain COMPLETE data - not summaries or placeholders`;

// ============================================
// CHAT PROMPTS
// ============================================

/**
 * System prompt for the main chat assistant
 * Used in: /app/api/chat/route.ts
 */
export const CHAT_SYSTEM_PROMPT = `You are an expert optimization assistant helping users design optimization problems.

Your role is to GUIDE users through understanding and defining their optimization problem, NOT to solve it. Help gather information about variables, properties, objectives, and constraints.

INCREMENTAL STRUCTURED DATA EXTRACTION:
- As you identify variables, objectives, constraints, or properties, you can optionally include structured data in a JSON block at the end of your response
- Format: \`\`\`json { "variables": [...], "objectives": [...], "constraints": [...], "properties": [...] } \`\`\`
- Variable: { "name": "var_name", "type": "continuous|discrete|categorical", "min": 0, "max": 100, "default": 50, "description": "...", "categories": [...] (categorical), "attributes": {"category_name": {"attr_key": value, ...}, ...} (categorical - maps each category name to a dictionary of its attributes) }
- Objective: { "name": "obj_name", "expression": "python expression", "goal": "minimize|maximize", "description": "...", "weight": number (REQUIRED - must be included, default: 1.0 if not specified) }
  - CRITICAL: ALWAYS include the "weight" field for EVERY objective
  - If multiple objectives exist, assign DIFFERENT weights to reflect their relative importance (e.g., cost: 2.0, quality: 1.0, speed: 0.5)
  - Do NOT use the same weight for all objectives unless they are truly equally important
- Constraint: { "expression": "python expression", "description": "...", "title": "..." (3-5 words), "type": "hard"|"soft" (REQUIRED - must be included, default: "hard" if uncertain), "weight": number (for soft constraints only, REQUIRED if type is "soft", default: 10.0) }
  - CRITICAL: ALWAYS include the "type" field for EVERY constraint
  - Infer from context: "must", "cannot", "required" → "hard"; "prefer", "ideally", "should" → "soft"
- Property: { "name": "prop_name", "expression": "python expression", "description": "..." (optional) }
  - CRITICAL: The properties are computed/derived values from variables. Do not create properties that are static dictionaries or lists.
  - CRITICAL: The properties are not data storage or attributes of variables.
- Use snake_case or camelCase for names. Expressions must be inline only.

CRITICAL RULES:
- Do NOT solve the problem or calculate optimal values - only structure it
- When you have enough information, ask: "I have enough information to formalize your optimization problem. Would you like me to create a structured problem definition?"
- Stopping criteria are set automatically
- Be ready to iterate and refine based on user feedback`;

// ============================================
// FORMALIZATION PROMPTS
// ============================================

/**
 * Prompt for problem formalization
 * Used in: useChatSession.ts, useResearcherSessions.ts
 * 
 * @param conversationContext - The conversation history to analyze
 * @param jsonStructures - Optional aggregated JSON structures from AI messages (variables, objectives, constraints, properties)
 * @returns Formatted formalization prompt
 */
export const getFormalizationPrompt = (
  conversationContext: string,
  jsonStructures?: {
    variables?: Array<Record<string, unknown>>;
    objectives?: Array<Record<string, unknown>>;
    constraints?: Array<Record<string, unknown>>;
    properties?: Array<Record<string, unknown>>;
  } | null
): string => {
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
    if (jsonStructures.variables && jsonStructures.variables.length > 0) {
      jsonParts.push(`Variables:\n${JSON.stringify(jsonStructures.variables, null, 2)}`);
    }
    if (jsonStructures.objectives && jsonStructures.objectives.length > 0) {
      jsonParts.push(`Objectives:\n${JSON.stringify(jsonStructures.objectives, null, 2)}`);
    }
    if (jsonStructures.constraints && jsonStructures.constraints.length > 0) {
      jsonParts.push(`Constraints:\n${JSON.stringify(jsonStructures.constraints, null, 2)}`);
    }
    if (jsonStructures.properties && jsonStructures.properties.length > 0) {
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
  - Each constraint: Python expression (returns boolean), description, title (3-5 words), type ("hard" or "soft" - REQUIRED), weight (for soft constraints only, REQUIRED if type is "soft", default: 10.0)
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
 * Check if a formalization response indicates incompleteness
 * Used to determine if the formalization failed due to missing information
 * 
 * @param text - The formalization response text
 * @returns true if formalization is incomplete
 */
export const isIncompleteFormalization = (text: string): boolean => {
  const lowerText = text.toLowerCase();
  return (
    lowerText.includes('incomplete formalization') ||
    lowerText.includes('not yet defined') ||
    lowerText.includes('to be determined') ||
    lowerText.includes('missing information') ||
    // If the model output fails to mention any objective keywords, treat as incomplete
    (!lowerText.includes('objective') && !lowerText.includes('objectives') && !lowerText.includes('objective:'))
  );
};

/**
 * Prompt for generating optimization controls from problem description
 * Used in: /app/api/generate/route.ts
 * 
 * @param description - The formalized problem description
 * @param versionContext - Optional version context ('v1' | 'v2' | 'v3') for version-specific instructions
 * @returns Formatted generation prompt
 */
export const getGenerateControlsPrompt = (
  description: string,
  versionContext?: 'v1' | 'v2' | 'v3'
): string => {
  const basePrompt = `Extract optimization problem details from the following description and structure them:

Description: ${description}

The description above contains the complete problem definition. You MUST extract ALL information including every attribute value mentioned. The description includes the ENTIRE conversation history, so search from the beginning for ALL attribute values. Do not summarize or omit any data.

Identify:
1. Variables: continuous (real numbers), discrete (integers), categorical (named options)
   - You MUST define ALL variables explicitly - do not omit any
   - Continuous: provide min, max, default (all required)
   - Discrete: provide min, max, default (all required)
   - Categorical: provide 'categories' array AND 'attributes' mapping each category to its data (both required)
2. Objectives: minimize/maximize with Python expressions
   - Each objective should have its own expression - the system combines them automatically
   - Each objective can have a weight (default: 1.0) to control relative importance
3. Properties: only if used in objectives/constraints, with Python expressions
   - Properties are DERIVED/COMPUTED values calculated from variables - NOT category data
   - Example property: "total_cost" with expression "{var1}.price + {var2}.price"
4. Constraints: Python expressions with title (3-5 words)
   - Expression must return boolean (True if satisfied, False if violated)
   - Do NOT create simple bounds (use variable min/max instead)
   - When applying the same pattern across 3+ variables, use list comprehensions instead of chaining with +
5. Stopping criteria: max_iterations (default 100), convergence_threshold (default 0.001)

CONCEPTUAL FRAMEWORK:
${SHARED_CONCEPTUAL_FRAMEWORK}

EXPRESSION RULES:
${SHARED_EXPRESSION_RULES}

NAMING: ${SHARED_NAMING_CONVENTIONS}

The description contains the complete problem definition. Extract ALL information including:
- Every variable with complete definitions
- For categorical variables: ALL categories AND complete attributes object with ALL values mentioned
- All objectives with executable expressions
- All constraints and properties
- Do NOT summarize or omit any attribute values - include EVERY value mentioned in the description

${CRITICAL_REQUIREMENTS_CHECKLIST}`;

  // Version-specific instructions (can be extended in the future)
  let versionInstructions = '';
  if (versionContext === 'v2') {
    // Canvas-specific: Controls will be visualized on a canvas
    // Future: Add canvas-specific instructions if needed
    versionInstructions = '';
  } else if (versionContext === 'v3') {
    // Extraction panel: Controls will be displayed in extraction panels
    // Future: Add extraction panel-specific instructions if needed
    versionInstructions = '';
  }
  // v1 (default): Four-panel layout - no additional instructions needed

  return basePrompt + (versionInstructions ? `\n\n${versionInstructions}` : '');
};

/**
 * Prompt for generating a specific formalization component
 * Used in: /app/api/sessions/[id]/formalize/component/route.ts
 * 
 * @param component - The component type to generate ('variables' | 'properties' | 'objectives' | 'constraints')
 * @param conversationContext - The conversation history to analyze
 * @param existingComponents - Optional existing components from previous messages
 * @returns Formatted component generation prompt
 */
export const getComponentGenerationPrompt = (
  component: 'variables' | 'properties' | 'objectives' | 'constraints',
  conversationContext: string,
  existingComponents?: {
    variables?: Array<Record<string, unknown>>;
    objectives?: Array<Record<string, unknown>>;
    constraints?: Array<Record<string, unknown>>;
    properties?: Array<Record<string, unknown>>;
  } | null
): string => {
  const componentLabels = {
    variables: 'Variables',
    properties: 'Properties',
    objectives: 'Objectives',
    constraints: 'Constraints',
  };

  const componentLabel = componentLabels[component];

  // Build context about existing components
  let existingContext = '';
  if (existingComponents) {
    const parts: string[] = [];
    if (existingComponents.variables && existingComponents.variables.length > 0) {
      parts.push(`Existing Variables:\n${JSON.stringify(existingComponents.variables, null, 2)}`);
    }
    if (existingComponents.objectives && existingComponents.objectives.length > 0) {
      parts.push(`Existing Objectives:\n${JSON.stringify(existingComponents.objectives, null, 2)}`);
    }
    if (existingComponents.constraints && existingComponents.constraints.length > 0) {
      parts.push(`Existing Constraints:\n${JSON.stringify(existingComponents.constraints, null, 2)}`);
    }
    if (existingComponents.properties && existingComponents.properties.length > 0) {
      parts.push(`Existing Properties:\n${JSON.stringify(existingComponents.properties, null, 2)}`);
    }
    if (parts.length > 0) {
      existingContext = `\n\nEXISTING COMPONENTS FROM CONVERSATION:\n${parts.join('\n\n')}\n`;
    }
  }

  // Component-specific instructions
  let componentInstructions = '';
  let dependencyNote = '';

  switch (component) {
    case 'variables':
      componentInstructions = `Generate VARIABLES for the optimization problem:
- You MUST define ALL variables explicitly - do not omit any
- Continuous: provide min, max, default (all required)
- Discrete: provide min, max, default (all required)
- Categorical: provide 'categories' array AND 'attributes' mapping each category to its data (both required)`;
      break;

    case 'properties':
      dependencyNote = 'CRITICAL: Properties require variables to exist. Ensure variables are defined in the conversation.';
      componentInstructions = `Generate PROPERTIES (computed/derived values) for the optimization problem:
- Properties are DERIVED/COMPUTED values calculated from variables using Python expressions
- Properties are NOT data storage - they are calculations like totals, averages, weighted sums
- Only create properties that are used in objectives or constraints
- Include: name (snake_case/camelCase), expression (Python), description (optional)
- Reference variables that exist in the conversation`;
      break;

    case 'objectives':
      dependencyNote = 'CRITICAL: Objectives require variables to exist. Ensure variables are defined in the conversation.';
      componentInstructions = `Generate OBJECTIVES for the optimization problem:
- Each objective should have its own expression - the system combines them automatically
- Include: name (snake_case/camelCase), expression (Python), goal (minimize/maximize), description, weight (REQUIRED - must be included, default: 1.0)
- For multiple objectives, assign weights to control relative importance (e.g., cost objective: weight 2.0, quality objective: weight 1.0)
- If no specific weights are mentioned, use weight: 1.0 for all objectives
- Each objective expression should evaluate to a single numeric value (the system normalizes to 0-1 automatically)
- Reference variables and properties that exist in the conversation`;
      break;

    case 'constraints':
      dependencyNote = 'CRITICAL: Constraints require variables to exist. Ensure variables are defined in the conversation.';
      componentInstructions = `Generate CONSTRAINTS for the optimization problem:
- Each constraint: Python expression (returns boolean), description, title (3-5 words), type ("hard" or "soft" - REQUIRED), weight (for soft constraints only, REQUIRED if type is "soft", default: 10.0)
- Hard constraints (type: "hard"): Must be satisfied - violations invalidate solution. Use for absolute requirements.
- Soft constraints (type: "soft"): Preferred but can be violated - system adds as penalty to objective. Use for preferences.
- Infer from context whether each constraint is hard or soft - ALWAYS include the "type" field:
  * Hard: "must not exceed", "cannot be", "required to be", "must satisfy", "at least", "at most", "exactly"
  * Soft: "prefer", "ideally", "should be", "try to keep", "preferably"
- Expression must return boolean (True if satisfied, False if violated)
- Do NOT create simple bounds (use variable min/max instead)
- When applying the same pattern across 3+ variables, use list comprehensions instead of chaining with +
- Reference variables and properties that exist in the conversation`;
      break;
  }

  return `Based on the following conversation, generate ${componentLabel} for the optimization problem:

${conversationContext}
${existingContext}

${dependencyNote ? dependencyNote + '\n\n' : ''}${componentInstructions}

CONCEPTUAL FRAMEWORK:
${SHARED_CONCEPTUAL_FRAMEWORK}

EXPRESSION RULES:
${SHARED_EXPRESSION_RULES}

NAMING: ${SHARED_NAMING_CONVENTIONS}

RESPONSE FORMAT:
  - Provide a concise, human-readable summary (2-4 sentences) explaining the generated ${componentLabel.toLowerCase()}
  - Include complete JSON at the end: \`\`\`json { "${component}": [...] } \`\`\`
  - The JSON block is REQUIRED and must contain valid ${componentLabel} data

${CRITICAL_REQUIREMENTS_CHECKLIST}`;
};

// ============================================
// RESEARCHER PROMPTS
// ============================================

/**
 * System prompt appendix for researcher draft formatting
 * Used when researcher requests AI to format/improve their draft message
 * Appended to CHAT_SYSTEM_PROMPT for context-aware formatting
 */
export const RESEARCHER_DRAFT_FORMAT_SYSTEM_APPENDIX = `
IMPORTANT CONTEXT FOR DRAFT FORMATTING:
- You are helping a RESEARCHER colleague format their draft message, not a user seeking optimization help
- The researcher may write simple messages (like greetings) that don't need optimization guidance - just format them professionally
- When the draft contains optimization-related content, you can enhance it with better structure and clarity while maintaining optimization guidance principles
- Do NOT reject or criticize simple messages - just format them appropriately for the conversation context
- Your goal is to improve clarity and professionalism while preserving the researcher's intent, whether the message is simple or optimization-focused`;

/**
 * Prompt for formatting researcher draft messages
 * Used in: /app/api/sessions/[id]/ai-response/route.ts (when draft is provided)
 * 
 * @param draft - The draft text to format
 * @param conversationContext - Optional recent conversation context (last N messages)
 * @returns Formatted prompt for draft improvement
 */
export const getDraftFormattingPrompt = (
  draft: string,
  conversationContext?: string
): string => {
  return `You are helping a researcher improve and format a draft message. The researcher has typed a draft response and wants you to improve it for clarity, professionalism, and effectiveness while preserving their intent.

${conversationContext ? `Recent conversation context:\n${conversationContext}\n\n` : ''}Draft text to improve:
"""
${draft}
"""

Please improve and format this draft message. Make it clear, professional, and appropriate for the conversation context. Preserve the researcher's intent and main points, but improve clarity, grammar, and structure. Return only the improved text without any additional commentary or explanation.`;
};
