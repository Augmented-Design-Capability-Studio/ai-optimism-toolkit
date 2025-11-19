/**
 * Centralized AI prompts configuration
 * All prompts used in the application are defined here for easy tuning and maintenance
 */

/**
 * System prompt for the main chat assistant
 * Used in: /app/api/chat/route.ts
 */
export const CHAT_SYSTEM_PROMPT = `You are an expert optimization assistant helping users design optimization problems. 
      
Guide users through:
1. Defining variables (what can be changed)
2. Setting properties (calculated values based on variables)
3. Defining objectives (what to optimize for)
4. Adding constraints (limits and requirements)

When extracting information, be precise and structured. Ask clarifying questions when needed.

IMPORTANT: 
- Once you have gathered enough information about the user's optimization problem (objectives, variables, constraints), summarize the problem clearly and explicitly tell the user: "I have enough information to formalize your optimization problem. Would you like me to create a structured problem definition?"
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

Please provide a structured problem definition with:
1. Objective: What is being optimized? (Must be specific and measurable)
2. Variables: What can be changed? (Must list concrete variables with ranges/types)
3. Constraints: What limitations exist? (Must specify actual constraints, not just "not defined")
4. Success Criteria: How will we measure success? (Must define specific metrics)

CRITICAL: Only provide a complete formalization if ALL four sections have concrete, actionable information. If any section lacks specific details (e.g., "not yet defined", "to be determined", "user needs to specify"), you must respond with:

"INCOMPLETE FORMALIZATION

The conversation does not yet contain enough information to formalize the problem. Missing or unclear:
- [List specific missing information]

Please continue the conversation to clarify these details before formalizing."

Format your response as a clear, structured problem statement only if all information is present.`;
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
    lowerText.includes('missing information')
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
4. Constraints that must be satisfied (as Python expressions)

CRITICAL NAMING RULES:
- All names (variables, properties, objectives, constraints) MUST be human-readable in either snake_case "baking_temperature" or camelCase "bakingTemperature"
- Avoid using Latex
- Descriptions should be clear and concise
- Examples of good names: "Cookie Diameter", "Baking Time", "Chocolate Chips Per Cookie"
- Examples of bad names: "cookie_diameter", "bakingTime", "choc_chips"

Be specific and practical. Use clear variable names and valid Python expressions.
For categorical variables in expressions, they will be treated as their string values.`;
};
