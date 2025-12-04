/**
 * Centralized AI prompts configuration
 * All prompts used in the application are defined here for easy tuning and maintenance
 */

/**
 * System prompt for the main chat assistant
 * Used in: /app/api/chat/route.ts
 */
export const CHAT_SYSTEM_PROMPT = `You are an expert optimization assistant helping users design optimization problems. 
      
Your role is to GUIDE users through understanding and defining their optimization problem, NOT to solve it. You help gather information about:
1. Defining variables (what can be changed)
2. Setting properties (calculated values based on variables)
3. Defining objectives (what to optimize for)
4. Adding constraints (limits and requirements)

When extracting information, be precise and structured. Ask clarifying questions when needed.

INCREMENTAL STRUCTURED DATA EXTRACTION:
- As you identify variables, objectives, constraints, or properties during the conversation, you can optionally include structured data in your response
- To include structured data, add a JSON block at the end of your response using this format:
  \`\`\`json
  {
    "variables": [...],  // Optional: array of variable objects
    "objectives": [...],  // Optional: array of objective objects
    "constraints": [...], // Optional: array of constraint objects
    "properties": [...]   // Optional: array of property objects
  }
  \`\`\`
- Only include the sections you've identified in the current response (partial data is fine)
- Variable format: { "name": "var_name", "type": "continuous|discrete|categorical", "min": 0, "max": 100, "default": 50, "description": "...", "categories": [...] (for categorical), "attributes": {...} (for categorical - maps each category to its attributes) }
- Objective format: { "name": "obj_name", "expression": "python expression", "goal": "minimize|maximize", "description": "..." }
- Constraint format: { "expression": "python expression", "description": "...", "title": "..." (REQUIRED short title, 3-5 words max) }
- Property format: { "name": "prop_name", "expression": "python expression", "description": "..." (optional, omit for dictionary properties mapping categorical choices to their attributes) }
  - Note: "Attributes" are properties of categorical choices (e.g., cost, prep_time for each dish option)
  - "Properties" are derived/computed values from variables (e.g., total_cost calculated from variables)
- Use snake_case or camelCase for all names (no spaces or special characters)
- Expressions must be inline only - no helper functions or separate data structures allowed
- This allows the control panel to show progress incrementally as we discuss the problem

CRITICAL RULES:
- Do NOT attempt to solve the optimization problem or provide solutions
- Do NOT calculate optimal values or perform optimization
- Your job is to UNDERSTAND and STRUCTURE the problem, not solve it
- Once you have gathered enough information about the user's optimization problem (objectives, variables, and constraints), summarize the problem clearly and explicitly tell the user: "I have enough information to formalize your optimization problem. Would you like me to create a structured problem definition?"
- Don't worry about stopping criteria (max iterations, convergence) - these will be set automatically with reasonable defaults
- If the user wants to change or refine a previously formalized problem, acknowledge their changes and ask: "Would you like me to re-formalize the problem with these updates?"
- Always be ready to iterate and refine the problem definition based on user feedback.`;

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
    // AI Mode: Reference existing JSON structures
    modeSpecificInstructions = `MODE: AI-GENERATED STRUCTURES DETECTED
You are formalizing a problem where structured data (variables, objectives, constraints, properties) has already been extracted during the conversation. 

Your task:
1. Review the existing structured data provided below
2. Cross-reference it with the conversation to ensure completeness and accuracy
3. Refine and complete the formalization based on the full conversation context
4. If the conversation reveals additional information not captured in the structures, incorporate it
5. If the structures contain information not mentioned in the conversation, preserve it but verify it makes sense

The existing structures serve as a starting point, but you should produce a complete, refined formalization that incorporates all information from the conversation.`;

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
    // Experimental Mode: Extract purely from conversation
    modeSpecificInstructions = `MODE: CONVERSATION-ONLY EXTRACTION
You are formalizing a problem from a natural conversation that may not contain structured JSON data. The conversation may involve:
- Direct discussion between user, researcher, and AI
- Natural language descriptions of the problem
- Incremental problem refinement through dialogue

Your task:
1. Carefully analyze the entire conversation to identify the optimization problem
2. Extract variables, objectives, and constraints from the natural language discussion
3. Infer reasonable defaults, ranges, and types based on context
4. Structure the problem definition even if it wasn't explicitly formalized in the conversation
5. Pay attention to user preferences, considerations, and factors mentioned even if not quantified`;
  }

  return `Based on the following conversation, extract and formalize the optimization problem:

${conversationContext}
${jsonContextSection}

${modeSpecificInstructions}

Please provide a structured problem definition with the following required sections and formats.

1) Objectives (REQUIRED):
  - You MUST provide at least one objective. For each objective include:
    - name: a short identifier in snake_case or camelCase (e.g., "max_return", "min_cost")
    - expression: a Python expression that computes the objective (use the variable names exactly as defined below)
    - goal: either "minimize" or "maximize"
    - description: one-sentence human-readable explanation

  MULTI-OBJECTIVE OPTIMIZATION STRATEGY:
  - When there are 3 or more objectives, STRONGLY CONSIDER suggesting a single multi-factor cost function instead
  - A multi-factor cost function combines multiple objectives into one weighted objective, which is often more practical for optimization
  - This approach allows the optimizer to find solutions that balance multiple factors according to their relative importance
  - Example: Instead of separate objectives for "minimize_cost", "maximize_quality", "minimize_time", suggest:
    - A single objective: "minimize_weighted_cost" with expression: "w_cost * cost - w_quality * quality_score + w_time * time"
    - Where weights (w_cost, w_quality, w_time) represent relative importance and can be adjusted by the user
  - Benefits of multi-factor approach:
    * Faster convergence (single objective is easier to optimize)
    * Clearer trade-offs (weights make priorities explicit)
    * More intuitive for users (one number to optimize rather than balancing multiple)
  - If the user explicitly wants separate objectives for analysis, you can still provide multiple objectives, but suggest the multi-factor alternative

  PREFERENCE/SCORING-BASED OBJECTIVES:
  - Some problems involve optimizing based on user preferences or multiple subjective factors rather than measurable properties
  - In these cases, model the objective as a weighted sum of preference factors: weight1 * factor1_score + weight2 * factor2_score + ...
  - Each factor_score represents how well an option satisfies a particular consideration (e.g., cost, convenience, quality)
  - The weights represent the relative importance of each factor to the user
  - Example structure: "w_cost * cost_score + w_convenience * convenience_score + w_quality * quality_score"
  - Factor scores can be computed from variables (e.g., categorical selections mapped to scores)
  - This approach is particularly useful for metaheuristic optimization where exact properties may be subjective
  - Ensure weights sum to a reasonable total (e.g., 1.0 for normalized weights, or use meaningful scales like 0-100)

2) Variables (REQUIRED):
  - List each decision variable with: name (snake_case or camelCase), type (continuous|discrete|categorical), reasonable min/max/default (for continuous/discrete), or categories (for categorical), and a short description.
  - For categorical variables with attributes (properties of each choice), include an "attributes" field mapping each category to its attributes:
    Example:
    {
      "name": "lunch_1_dish",
      "type": "categorical",
      "categories": ["shrimp_fried_rice", "chicken_teriyaki_bowl", "vegetable_stir_fry_tofu"],
      "description": "Dish selection for lunch day 1",
      "attributes": {
        "shrimp_fried_rice": {"cost": 12, "prep_time": 30, "protein": 4},
        "chicken_teriyaki_bowl": {"cost": 10, "prep_time": 25, "protein": 5},
        "vegetable_stir_fry_tofu": {"cost": 8, "prep_time": 20, "protein": 3}
      }
    }
  - IMPORTANT DISTINCTION:
    * "Attributes" are properties of categorical choices (e.g., cost, prep_time for each dish option) - stored directly on the variable
    * "Properties" are derived/computed values from variables (e.g., total_cost calculated from variables) - stored in the properties section

3) Properties (OPTIONAL - only if needed):
  - Properties are calculated/derived values based on variables that are used in objectives or constraints
  - For each property include: name (snake_case or camelCase), expression (Python expression), and optionally description
  - Only include descriptions for derived/computed properties that need explanation (e.g., "total_effective_cost" might benefit from a description)
  - DO NOT create dictionary properties for categorical attributes - attributes belong directly on the variable

4) Constraints (REQUIRED - or explicitly state "no constraints"):
  - Provide each constraint as a Python expression (e.g., "x + y <= 100") and a one-line description.
  - You MUST include a short title (REQUIRED, 3-5 words max) for display in visualizations (e.g., "Total Budget Limit", "Staff Ratio").

IMPORTANT NAMING CONVENTIONS:
  - Use snake_case (e.g., "cookie_diameter") or camelCase (e.g., "cookieDiameter").
  - Variable, objective, and constraint names must be human-readable and descriptive; avoid spaces and special characters.

EXPRESSION RULES - CRITICAL:
  - DO NOT define helper functions (e.g., def get_property(...), get_meal_property(...))
  - DO NOT define data structures or lookup dictionaries separately (e.g., meal_properties = {...})
  - DO NOT include Python code blocks with function definitions or variable assignments
  - ALL calculations MUST be inline directly in the expression
  - For lookup tables or data mappings, STRONGLY PREFER dictionary lookups over ternary chains
  - Dictionary lookups are MUCH more readable and maintainable than nested ternary operators
  - When you have multiple categorical choices with attributes (properties of each choice), store attributes directly on the variable in the "attributes" field
  - Note: "Attributes" are properties of categorical choices (e.g., cost, prep_time for each dish), distinct from "Properties" which are derived/computed values
  - To reference attributes in expressions, use: {variable_name}_attributes[{variable_name}]['attribute_name']
  - Example: lunch_1_dish_attributes[lunch_1_dish]['cost']

  Examples:
  ❌ WRONG - Long ternary chain (hard to read, avoid this):
    Expression: (shrimp_fried_rice_cost if lunch_1_dish == 'shrimp_fried_rice' else chicken_teriyaki_bowl_cost if lunch_1_dish == 'chicken_teriyaki_bowl' else vegetable_stir_fry_tofu_cost if lunch_1_dish == 'vegetable_stir_fry_tofu' else ...)
  
  ❌ WRONG - Using helper function:
    Helper: def get_meal_property(meal, prop): return meal_properties[meal][prop]
    Expression: get_meal_property(lunch_day_1, 'protein')

  ❌ WRONG - Separate data structure or dictionary property:
    Property: dish_attributes = {"Meal1": {"protein": 35, ...}, ...}
    Expression: dish_attributes[lunch_day_1]['protein']
    (This is the OLD way - attributes should be on the variable, not in a property)

  ✅ CORRECT - Attributes stored on variable (STRONGLY PREFERRED):
    Variable: lunch_1_dish with attributes = {"shrimp_fried_rice": {"cost": 12, "prep_time": 30, ...}, ...}
    Expression: lunch_1_dish_attributes[lunch_1_dish]['cost']
    Note: The system automatically injects {variable_name}_attributes into the evaluation context
  
  ✅ CORRECT - Simple inline dictionary for single values:
    Expression: {"Steamed Fish Meal": 35, "Chicken Stir-fry Meal": 30, "Lean Pork/Beef Meal": 30}[lunch_day_1]

  ✅ CORRECT - Direct calculation:
    Expression: lunch_cost + dinner_cost + breakfast_cost

  ✅ CORRECT - Preference-based weighted sum:
    Expression: 0.4 * (100 - cost_score) + 0.3 * convenience_score + 0.3 * quality_score
    (where cost_score is lower-is-better, so inverted; convenience_score and quality_score are higher-is-better)

PRESERVATION RULES:
  - Preserve any mathematical expressions exactly as the user wrote them when possible.
  - If you reformat variable names, keep a mapping note showing original -> normalized names.
  ${hasJsonStructures ? '- When refining existing structures, preserve valid information and enhance it with conversation context.' : ''}

CRITICAL: Only provide a complete formalization if ALL three sections have concrete, actionable information. If any section lacks specific details (e.g., "not yet defined", "to be determined", "user needs to specify"), you must respond exactly with:

"INCOMPLETE FORMALIZATION

The conversation does not yet contain enough information to formalize the problem. Missing or unclear:
- [List specific missing information]

Please continue the conversation to clarify these details before formalizing."

RESPONSE FORMAT:
  - First, provide a human-readable summary of the formalized problem using clear headings (Objectives, Variables, Constraints, Properties if any) and bullet lists where each item shows the required fields (name, expression, goal, description, etc.).
  - Then, at the end of your response, you MUST include a complete JSON representation of the problem in a code block using this exact format:
  
\`\`\`json
{
  "variables": [...],
  "objectives": [...],
  "constraints": [...],
  "properties": [...]
}
\`\`\`

  - The JSON must match the structure described above with all required fields
  - For properties: description is optional - only include if the property needs explanation
  - Ensure the Objectives section appears first in both the text summary and JSON. If you cannot produce at least one valid objective, return the INCOMPLETE FORMALIZATION message above.
  - The JSON code block is REQUIRED - the system needs it to parse and use your formalization

Be precise and practical. Use clear variable names and valid Python expressions.`;
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
1. Variables that can be changed/optimized:
   - Use 'continuous' for real numbers (e.g., temperature, speed)
   - Use 'discrete' for integers (e.g., count, quantity)
   - Use 'categorical' for named options (e.g., color, material, method)
   - For categorical variables, provide a 'categories' array with option names and omit min/max/default
   - For categorical variables with attributes (properties of each choice), include an 'attributes' field mapping each category to its attributes:
     Example: {"shrimp_fried_rice": {"cost": 12, "prep_time": 30}, "chicken_teriyaki_bowl": {"cost": 10, "prep_time": 25}}
   - For continuous/discrete variables, provide reasonable min/max ranges and default values
   - IMPORTANT DISTINCTION:
     * "Attributes" are properties of categorical choices (e.g., cost, prep_time for each dish option) - stored directly on the variable
     * "Properties" are derived/computed values from variables (e.g., total_cost calculated from variables) - stored in the properties section
2. Objectives to optimize for (what to minimize or maximize, with Python expressions)
   - To reference attributes in expressions, use: {variable_name}_attributes[{variable_name}]['attribute_name']
   - Example: lunch_1_dish_attributes[lunch_1_dish]['cost']
3. Properties that can be calculated from variables (with Python expressions)
   - CRITICAL: ONLY create properties that will be referenced in objectives or constraints
   - Do NOT create intermediate calculations unless they are explicitly used
   - Each property MUST appear in at least one objective or constraint expression
   - If a calculation can be done directly in an objective/constraint, do it there instead of creating a property
   - DO NOT create dictionary properties for categorical attributes - attributes belong directly on the variable
   - Only include descriptions for derived/computed properties that need explanation
4. Constraints that must be satisfied (as Python expressions)
   - CRITICAL: Do NOT create simple bound constraints like "x >= 0" or "x <= 100" - these are already handled by variable min/max
   - ONLY create constraints that involve:
     * Relationships between multiple variables (e.g., "x + y <= 100")
     * Complex conditions (e.g., "x * y >= 50")
     * Conditional logic (e.g., "x > 0 if y == 'option1' else True")
   - If a constraint is just a simple bound on a single variable, adjust that variable's min/max instead
   - For each constraint, you MUST provide a short title (REQUIRED, 3-5 words max, e.g., "Total Budget Limit", "Staff Ratio") that will be used for display in visualizations
5. Stopping criteria:
   - max_iterations: Maximum number of optimization iterations (default: 100, range: 10-10000)
   - convergence_threshold: Threshold for convergence detection (default: 0.001, range: 0.00001-0.1)

EXPRESSION RULES - CRITICAL:
- DO NOT define helper functions or separate data structures
- ALL expressions must be self-contained Python expressions
- For lookup tables, use inline dictionary lookups: {"key1": value1, "key2": value2}[variable]
- Inline all calculations directly in objective/constraint/property expressions
- Example: Use {"Meal1": 35, "Meal2": 30}[meal_var] instead of defining a helper function

CRITICAL NAMING RULES:
- All names (variables, properties, objectives, constraints) MUST be in snake_case (e.g., "cookie_diameter", "baking_time") or camelCase (e.g., "cookieDiameter", "bakingTime")
- Names must be human-readable and descriptive
- Do NOT use Title Case with spaces (e.g., "Cookie Diameter" is WRONG)
- Do NOT use special characters or spaces in names
- Descriptions can use natural language with spaces
- Examples of CORRECT names: "cookie_diameter", "baking_time", "chocolate_chips_count" OR "cookieDiameter", "bakingTime", "chocolateChipsCount"
- Examples of INCORRECT names: "Cookie Diameter", "Baking Time", "Chocolate Chips Count"

Be specific and practical. Use clear variable names and valid Python expressions.
For categorical variables in expressions, they will be treated as their string values.`;
};
