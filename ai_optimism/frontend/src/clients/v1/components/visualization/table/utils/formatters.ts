/**
 * Format value for display in table
 */
export const formatValue = (value: number | string | undefined): string => {
    if (value === undefined || value === null) return '-';
    if (typeof value === 'number') {
        return value.toFixed(4);
    }
    return String(value);
};

/**
 * Check if a constraint is satisfied (value close to 1.0)
 */
export const isConstraintSatisfied = (value: number | undefined): boolean => {
    if (value === undefined) return false;
    return value >= 0.99; // Constraint violations return 1.0 when satisfied
};

