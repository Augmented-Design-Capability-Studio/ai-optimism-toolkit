/**
 * Parse linear constraint expression: "ax + by <= c" or "ax + by >= c"
 */
export const parseLinearConstraint = (
    expression: string, 
    var1: string, 
    var2: string
): { a: number; b: number; c: number; op: string } | null => {
    try {
        // Remove spaces and normalize
        let expr = expression.replace(/\s+/g, '');
        
        // Find operator
        let op = '';
        if (expr.includes('<=')) {
            op = '<=';
        } else if (expr.includes('>=')) {
            op = '>=';
        } else if (expr.includes('<')) {
            op = '<';
        } else if (expr.includes('>')) {
            op = '>';
        } else if (expr.includes('=')) {
            op = '=';
        } else {
            return null;
        }
        
        const [left, right] = expr.split(op);
        
        // Parse coefficients for var1 and var2
        const getCoeff = (side: string, varName: string): number => {
            const regex = new RegExp(`([+-]?\\d*\\.?\\d*)\\s*\\*?\\s*${varName}`, 'g');
            const match = regex.exec(side);
            if (match) {
                const coeff = match[1];
                if (coeff === '' || coeff === '+') return 1;
                if (coeff === '-') return -1;
                return parseFloat(coeff);
            }
            return 0;
        };
        
        const a = getCoeff(left, var1);
        const b = getCoeff(left, var2);
        const c = parseFloat(right);
        
        return { a, b, c, op };
    } catch (e) {
        console.warn('Failed to parse constraint:', expression, e);
        return null;
    }
};

/**
 * Generate points for constraint line: ax + by = c
 */
export const generateConstraintLine = (
    a: number, 
    b: number, 
    c: number, 
    xMin: number, 
    xMax: number, 
    yMin: number, 
    yMax: number
): Array<{ x: number; y: number }> => {
    const points: Array<{ x: number; y: number }> = [];
    
    if (Math.abs(b) > 1e-10) {
        // y = (c - ax) / b
        for (let x = xMin; x <= xMax; x += (xMax - xMin) / 100) {
            const y = (c - a * x) / b;
            if (y >= yMin && y <= yMax) {
                points.push({ x, y });
            }
        }
    } else if (Math.abs(a) > 1e-10) {
        // x = c / a (vertical line)
        const x = c / a;
        if (x >= xMin && x <= xMax) {
            points.push({ x, y: yMin });
            points.push({ x, y: yMax });
        }
    }
    
    return points;
};

