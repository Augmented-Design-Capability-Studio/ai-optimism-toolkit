/**
 * Centralized AI prompts configuration
 * All prompts used in the application are defined here for easy tuning and maintenance
 */

/**
 * System prompt for the main chat assistant
 * Used in: /app/api/chat/route.ts
 */
export const CHAT_SYSTEM_PROMPT = `You are an expert optimization assistant helping users design optimization problems.

Your role is to GUIDE users through understanding and defining their optimization problem, NOT to solve it. Help gather information about variables, properties, objectives, and constraints.

INCREMENTAL STRUCTURED DATA EXTRACTION:
- As you identify variables, objectives, constraints, or properties, you can optionally include structured data in a JSON block at the end of your response
- Format: \`\`\`json { "variables": [...], "objectives": [...], "constraints": [...], "properties": [...] } \`\`\`
- Variable: { "name": "var_name", "type": "continuous|discrete|categorical", "min": 0, "max": 100, "default": 50, "description": "...", "categories": [...] (categorical), "attributes": {...} (categorical) }
- Objective: { "name": "obj_name", "expression": "python expression", "goal": "minimize|maximize", "description": "..." }
- Constraint: { "expression": "python expression", "description": "...", "title": "..." (3-5 words) }
- Property: { "name": "prop_name", "expression": "python expression", "description": "..." (optional) }
- Use snake_case or camelCase for names. Expressions must be inline only.

CRITICAL RULES:
- Do NOT solve the problem or calculate optimal values - only structure it
- When you have enough information, ask: "I have enough information to formalize your optimization problem. Would you like me to create a structured problem definition?"
- Stopping criteria are set automatically
- Be ready to iterate and refine based on user feedback`;

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
    modeSpecificInstructions = `MODE: AI-GENERATED STRUCTURES DETECTED
Review the existing structured data below, cross-reference with the conversation, and produce a complete refined formalization incorporating all information.`;

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
Analyze the conversation to extract variables, objectives, and constraints. Infer reasonable defaults and types based on context.`;
  }

  return `Based on the following conversation, extract and formalize the optimization problem:

${conversationContext}
${jsonContextSection}

${modeSpecificInstructions}

Please provide a structured problem definition with the following required sections and formats.

1) Objectives (REQUIRED):
  - Provide at least one objective with: name (snake_case/camelCase), expression (Python), goal (minimize/maximize), description
  - CRITICAL: If there are 2+ objectives, you MUST combine them into a single weighted cost function
  - For multiple objectives, use: "w1 * obj1 - w2 * obj2 + w3 * obj3" (use - for maximize, + for minimize after normalizing)
  - Weight names should be descriptive: "w_cost", "w_quality", "w_time", etc.
  - CRITICAL: The expression field MUST contain actual executable Python code, not a description or placeholder
  - CRITICAL: If using weights, define them as properties first, then reference them in the objective expression
  - DO NOT create separate objectives for each goal - combine them into one weighted expression
  - DO NOT define dictionaries or data structures in objective expressions - reference variable attributes directly

2) Variables (REQUIRED):
  - List each variable with: name (snake_case/camelCase), type (continuous|discrete|categorical), min/max/default (continuous/discrete), categories (categorical), description
  - For categorical variables: if each category has associated data (cost, time, scores, etc.), store them in the variable's "attributes" field
  - Attributes structure: "attributes": {"category_name": {"data_key": value, ...}, ...}
  - CRITICAL: Category data belongs in variable "attributes", NOT in the properties section
  - CRITICAL: If multiple variables share the same categories and attributes, you MUST define them for EACH variable separately in the JSON
  - CRITICAL: Every categorical variable MUST have both "categories" array AND "attributes" object with data for ALL categories

3) Properties (OPTIONAL):
  - Properties are DERIVED/COMPUTED values calculated from variables using expressions
  - Only create properties that are used in objectives or constraints
  - Include: name (snake_case/camelCase), expression (Python), description (optional)
  - CRITICAL: The expression field MUST contain actual executable Python code, not a description
  - If weights are needed for objectives, create them as properties with numeric values (e.g., "w_cost": -1.0, "w_health": 1.0)
  - DO NOT create properties that list category data - category data belongs in variable "attributes"
  - DO NOT create dictionary properties mapping categories to data - use variable "attributes" instead

4) Constraints (REQUIRED or state "no constraints"):
  - Each constraint: Python expression, description, title (3-5 words)
  - CRITICAL: The expression field MUST contain actual executable Python code, not a description
  - When applying the same pattern across 3+ variables, use list comprehensions instead of chaining with + operators
  - Example pattern: "all(sum(1 for v in [var1, var2, ...] if v == value) <= limit for value in [value1, value2, ...])"

NAMING: Use snake_case or camelCase. No spaces or special characters.

EXPRESSION RULES:
  - All calculations must be inline - no helper functions, no separate data structures
  - DO NOT define dictionaries (like meta_data_dict, meal_properties, etc.) in objective expressions
  - DO NOT assign variables in expressions (e.g., "meta_data_dict = {...}") - this is not allowed
  - Attributes are stored in variable "attributes" field - reference them directly: {variable_name}_attributes[{variable_name}]['attribute_name']
  - Prefer dictionary lookups over ternary chains
  - When repeating the same pattern across 3+ variables, use list comprehensions: sum([expr for v in [var1, var2, ...]]) instead of chaining with +
  - Generator expressions also work: sum(expr for v in [var1, var2, ...]) but list comprehensions are preferred
  - Available functions: sum, all, any, min, max, abs, round, sqrt, exp, log, sin, cos, tan

CRITICAL: Only provide a complete formalization if ALL sections have concrete information. If any section lacks details, respond with:

"INCOMPLETE FORMALIZATION

The conversation does not yet contain enough information to formalize the problem. Missing or unclear:
- [List specific missing information]

Please continue the conversation to clarify these details before formalizing."

RESPONSE FORMAT:
  - Provide a human-readable summary with headings (Objectives, Variables, Constraints, Properties)
  - Include complete JSON at the end: \`\`\`json { "variables": [...], "objectives": [...], "constraints": [...], "properties": [...] } \`\`\`
  - Objectives must appear first. JSON code block is REQUIRED.

CRITICAL REQUIREMENTS FOR JSON:
  - Variables: Each variable MUST include ALL required fields (name, type, description, and for categorical: categories array AND attributes object with ALL category data)
  - Objectives: Each objective MUST include a complete Python expression (not a description, but actual executable code)
  - Constraints: Each constraint MUST include a complete Python expression (not a description, but actual executable code)
  - Properties: If included, each property MUST include a complete Python expression
  - DO NOT use placeholders like "scoring_weights" without defining the actual expression
  - DO NOT describe what should be in the JSON - actually provide the complete JSON with all fields populated
  - DO NOT say "see attributes above" - include the full attributes object in each variable's JSON
  - DO NOT say "expression uses scoring_weights" - provide the actual expression with property references like "w_cost * total_cost + w_health * total_health"`;
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
 * @returns Formatted generation prompt
 */
export const getGenerateControlsPrompt = (description: string): string => {
  return `Extract optimization problem details from the following description and structure them:

Description: ${description}

Identify:
1. Variables: continuous (real numbers), discrete (integers), categorical (named options)
   - Categorical: provide 'categories' array, 'attributes' mapping each category to its data if needed
   - Continuous/discrete: provide min/max/default
   - CRITICAL: Category data (cost, time, scores, etc.) belongs in variable "attributes", NOT in properties
2. Objectives: minimize/maximize with Python expressions
   - CRITICAL: If 2+ objectives exist, combine into single weighted cost function: "w1 * obj1 - w2 * obj2 + w3 * obj3"
   - DO NOT create separate objectives - always combine multiple goals into one weighted expression
   - DO NOT define dictionaries in expressions - reference variable attributes directly: {variable_name}_attributes[{variable_name}]['attribute_name']
3. Properties: only if used in objectives/constraints, with Python expressions
   - Properties are DERIVED/COMPUTED values calculated from variables - NOT category data
   - Do NOT create properties that map categories to data - use variable "attributes" instead
4. Constraints: Python expressions with title (3-5 words)
   - Do NOT create simple bounds (use variable min/max instead)
   - When applying the same pattern across 3+ variables, use list comprehensions instead of chaining with +
5. Stopping criteria: max_iterations (default 100), convergence_threshold (default 0.001)

EXPRESSION RULES:
- All expressions must be inline - no helper functions or separate data structures
- DO NOT define dictionaries (like meta_data_dict) in expressions - attributes are in variable "attributes" field
- DO NOT assign variables in expressions (e.g., "dict = {...}") - expressions must be pure calculations
- Reference attributes: {variable_name}_attributes[{variable_name}]['attribute_name']
- Use dictionary lookups: {"key1": value1, "key2": value2}[variable] for simple inline lookups only
- When repeating the same pattern across 3+ variables, use list comprehensions: sum([expr for v in [var1, var2, ...]]) instead of chaining with +
- Available functions: sum, all, any, min, max, abs, round, sqrt, exp, log, sin, cos, tan

NAMING: snake_case or camelCase. No spaces or special characters.`;
};
