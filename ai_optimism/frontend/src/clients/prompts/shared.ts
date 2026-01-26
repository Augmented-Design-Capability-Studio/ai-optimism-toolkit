/**
 * Shared prompt components used across versions
 */

export const SHARED_CONCEPTUAL_FRAMEWORK = `Variables: The decision variables of your optimization problem
  - Continuous: Real numbers with min/max bounds (CRITICAL: MUST include ALL THREE: min, max, AND default - cannot omit any)
  - Discrete: Integers with min/max bounds (CRITICAL: MUST include ALL THREE: min, max, AND default - cannot omit any)
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

export const SHARED_EXPRESSION_RULES = `  - All calculations must be inline - no helper functions, no separate data structures
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

export const SHARED_NAMING_CONVENTIONS = `Use snake_case or camelCase. No spaces or special characters.`;

export const CRITICAL_REQUIREMENTS_CHECKLIST = `CRITICAL REQUIREMENTS - Verify ALL before submitting:

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
  - Constraints: "title" field REQUIRED (MEANINGFUL descriptive 3-5 words that describe what the constraint does, e.g., "Time Constraint", "Budget Limit" - NEVER use generic names like "Constraint 1", "Constraint 2", or numbered constraints)
  - Constraints: Simple bound constraints (e.g., "var_name >= value", "var_name <= value") should be merged into variable "min"/"max" bounds, not created as separate constraints
  - Variables: 
    * Continuous/Discrete: MUST include ALL THREE: "min", "max", AND "default" (cannot omit any - all are required)
    * Categorical: MUST include "categories" array AND "attributes" object (both required)
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
  - Every continuous/discrete variable MUST have ALL THREE: "min", "max", AND "default" (cannot omit any)
  - Every categorical variable has both "categories" array AND complete "attributes" object with ALL categories
  - All objectives have complete Python expressions (not descriptions)
  - All constraints have complete Python expressions that return booleans
  - DO NOT use placeholders like "scoring_weights" without defining the actual expression
  - DO NOT say "see attributes above" - include the full attributes object in each variable's JSON
  - The JSON block MUST contain COMPLETE data - not summaries or placeholders`;
