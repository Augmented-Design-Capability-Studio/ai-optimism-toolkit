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

IMPORTANT NAMING CONVENTIONS:
  - Use snake_case (e.g., "cookie_diameter") or camelCase (e.g., "cookieDiameter").
  - Variable, objective, and constraint names must be human-readable and descriptive; avoid spaces and special characters.

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
5. Stopping criteria:
   - max_iterations: Maximum number of optimization iterations (default: 100, range: 10-10000)
   - convergence_threshold: Threshold for convergence detection (default: 0.001, range: 0.00001-0.1)

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
