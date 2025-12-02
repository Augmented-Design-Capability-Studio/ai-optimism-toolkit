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
- Variable format: { "name": "var_name", "type": "continuous|discrete|categorical", "min": 0, "max": 100, "default": 50, "description": "...", "categories": [...] (for categorical) }
- Objective format: { "name": "obj_name", "expression": "python expression", "goal": "minimize|maximize", "description": "..." }
- Constraint format: { "expression": "python expression", "description": "...", "title": "..." (REQUIRED short title, 3-5 words max) }
- Property format: { "name": "prop_name", "expression": "python expression", "description": "..." }
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
 * @returns Formatted formalization prompt
 */
export const getFormalizationPrompt = (conversationContext: string): string => {
  return `Based on the following conversation, extract and formalize the optimization problem:

${conversationContext}

Please provide a structured problem definition with the following required sections and formats.

1) Objectives (REQUIRED):
  - You MUST provide at least one objective. For each objective include:
    - name: a short identifier in snake_case or camelCase (e.g., "max_return", "min_cost")
    - expression: a Python expression that computes the objective (use the variable names exactly as defined below)
    - goal: either "minimize" or "maximize"
    - description: one-sentence human-readable explanation

2) Variables (REQUIRED):
  - List each decision variable with: name (snake_case or camelCase), type (continuous|discrete|categorical), reasonable min/max/default (for continuous/discrete), or categories (for categorical), and a short description.

3) Constraints (REQUIRED - or explicitly state "no constraints"):
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
  - For lookup tables or data mappings, use inline dictionary lookups or conditional expressions

  Examples:
  ❌ WRONG - Using helper function:
    Helper: def get_meal_property(meal, prop): return meal_properties[meal][prop]
    Expression: get_meal_property(lunch_day_1, 'protein')

  ❌ WRONG - Separate data structure:
    Data: meal_properties = {"Meal1": {"protein": 35, ...}, ...}
    Expression: get_meal_property(lunch_day_1, 'protein')

  ✅ CORRECT - Inline dictionary lookup:
    Expression: {"Steamed Fish Meal": 35, "Chicken Stir-fry Meal": 30, "Lean Pork/Beef Meal": 30}[lunch_day_1]

  ✅ CORRECT - Using ternary operator for simple lookups:
    Expression: 35 if lunch_day_1 == "Steamed Fish Meal" else (30 if lunch_day_1 == "Chicken Stir-fry Meal" else 30)

  ✅ CORRECT - Direct calculation:
    Expression: lunch_cost + dinner_cost + breakfast_cost

PRESERVATION RULES:
  - Preserve any mathematical expressions exactly as the user wrote them when possible.
  - If you reformat variable names, keep a mapping note showing original -> normalized names.

CRITICAL: Only provide a complete formalization if ALL three sections have concrete, actionable information. If any section lacks specific details (e.g., "not yet defined", "to be determined", "user needs to specify"), you must respond exactly with:

"INCOMPLETE FORMALIZATION

The conversation does not yet contain enough information to formalize the problem. Missing or unclear:
- [List specific missing information]

Please continue the conversation to clarify these details before formalizing."

RESPONSE FORMAT:
  - Provide the structured problem using clear headings (Objectives, Variables, Constraints) and bullet lists where each item shows the required fields (name, expression, goal, description, etc.).
  - Ensure the Objectives section appears first and contains at least one objective. If you cannot produce at least one valid objective, return the INCOMPLETE FORMALIZATION message above.

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
   - For continuous/discrete variables, provide reasonable min/max ranges and default values
2. Objectives to optimize for (what to minimize or maximize, with Python expressions)
3. Properties that can be calculated from variables (with Python expressions)
   - CRITICAL: ONLY create properties that will be referenced in objectives or constraints
   - Do NOT create intermediate calculations unless they are explicitly used
   - Each property MUST appear in at least one objective or constraint expression
   - If a calculation can be done directly in an objective/constraint, do it there instead of creating a property
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
