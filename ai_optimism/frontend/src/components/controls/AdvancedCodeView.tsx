import { Box, Paper, Typography, IconButton, Tooltip } from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { Controls } from './types';

interface AdvancedCodeViewProps {
    controls: Controls;
}

export function AdvancedCodeView({ controls }: AdvancedCodeViewProps) {
    const generatePythonCode = (c: Controls) => {
        let code = `# Optimization Problem Configuration\n\n`;

        // Variables
        code += `# Variables\n`;
        c.variables.forEach(v => {
            if (v.type === 'categorical') {
                code += `${v.name} = Variable(type='categorical', categories=${JSON.stringify(v.categories)})\n`;
            } else {
                code += `${v.name} = Variable(type='${v.type}', min=${v.min}, max=${v.max}, default=${v.default})\n`;
            }
            if (v.modifierStrategy) {
                code += `# Modifier: ${v.modifierStrategy.type} (sigma=${v.modifierStrategy.sigma || 'default'}, step=${v.modifierStrategy.stepSize || 'default'})\n`;
            }
        });
        code += '\n';

        // Objectives
        if (c.objectives && c.objectives.length > 0) {
            code += `# Objectives\n`;
            c.objectives.forEach(obj => {
                code += `@objective(goal='${obj.goal}')\n`;
                code += `def ${obj.name}(${c.variables.map(v => v.name).join(', ')}):\n`;
                code += `    return ${obj.expression}\n\n`;
            });
        }

        // Constraints
        if (c.constraints && c.constraints.length > 0) {
            code += `# Constraints\n`;
            c.constraints.forEach((con, idx) => {
                code += `@constraint\n`;
                code += `def constraint_${idx + 1}(${c.variables.map(v => v.name).join(', ')}):\n`;
                code += `    return ${con.expression}\n\n`;
            });
        }

        return code;
    };

    const pythonCode = generatePythonCode(controls);

    const handleCopy = () => {
        navigator.clipboard.writeText(pythonCode);
    };

    return (
        <Paper
            variant="outlined"
            sx={{
                p: 2,
                bgcolor: '#1e1e1e',
                color: '#d4d4d4',
                fontFamily: 'monospace',
                overflow: 'auto',
                flex: 1,
                position: 'relative'
            }}
        >
            <Tooltip title="Copy Code">
                <IconButton
                    onClick={handleCopy}
                    sx={{
                        position: 'absolute',
                        top: 8,
                        right: 8,
                        color: 'rgba(255,255,255,0.7)'
                    }}
                >
                    <ContentCopyIcon fontSize="small" />
                </IconButton>
            </Tooltip>
            <pre style={{ margin: 0, fontSize: '0.875rem' }}>
                <code>{pythonCode}</code>
            </pre>
        </Paper>
    );
}
