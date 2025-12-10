/**
 * Parse modifier into action and variable name
 */
export const parseModifier = (label: string): { action: string; variable: string } => {
    if (!label) return { action: '', variable: '' };
    
    if (label.startsWith('inc_')) {
        return { action: 'Increase', variable: label.substring(4) };
    }
    if (label.startsWith('dec_')) {
        return { action: 'Decrease', variable: label.substring(4) };
    }
    if (label.startsWith('rand_')) {
        return { action: 'Randomize', variable: label.substring(5) };
    }
    if (label.startsWith('mod_')) {
        return { action: 'Modify', variable: label.substring(4) };
    }
    return { action: '', variable: label };
};

/**
 * Make names user-friendly
 */
export const formatLabel = (label: string, type: 'objective' | 'modifier'): string => {
    if (!label) return '';

    // Handle Modifiers
    if (type === 'modifier') {
        const { action, variable } = parseModifier(label);
        return action ? `${action} ${variable}` : variable;
    }

    // Handle Objectives/Violations
    if (type === 'objective') {
        // New format: "Violation: description"
        if (label.startsWith('Violation: ')) {
            return label; // Already in readable format
        }
        // Old format: "Violation(expression)"
        if (label.startsWith('Violation(')) {
            // Extract content inside Violation(...)
            const content = label.substring(10, label.length - 1);
            return `Avoid: ${content}`;
        }
        return label;
    }

    return label;
};

/**
 * Split text into multiple lines for display
 */
export const splitTextIntoLines = (text: string, maxCharsPerLine: number = 22, maxLines: number = 2): string[] => {
    const words = text.split(/\s+/);
    const lines: string[] = [];
    let currentLine = '';
    
    for (const word of words) {
        if (currentLine.length + word.length + 1 <= maxCharsPerLine) {
            currentLine = currentLine ? `${currentLine} ${word}` : word;
        } else {
            if (currentLine) lines.push(currentLine);
            // If single word is longer than max, truncate it
            if (word.length > maxCharsPerLine) {
                lines.push(word.substring(0, maxCharsPerLine - 3) + '..');
                currentLine = '';
            } else {
                currentLine = word;
            }
        }
    }
    if (currentLine) lines.push(currentLine);
    
    // Limit to maxLines
    const displayLines = lines.slice(0, maxLines);
    if (lines.length > maxLines) {
        displayLines[maxLines - 1] = displayLines[maxLines - 1].substring(0, Math.min(displayLines[maxLines - 1].length, maxCharsPerLine - 3)) + '..';
    }
    
    return displayLines;
};

