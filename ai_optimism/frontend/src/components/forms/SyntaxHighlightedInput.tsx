import React from 'react';
import { TextField, type TextFieldProps } from '@mui/material';

interface SyntaxHighlightedInputProps extends Omit<TextFieldProps, 'onChange'> {
    value: string;
    onChange: (value: string) => void;
}

// Enhanced TextField with expression-friendly styling
export const SyntaxHighlightedInput: React.FC<SyntaxHighlightedInputProps> = ({
    value,
    onChange,
    ...textFieldProps
}) => {
    return (
        <TextField
            {...textFieldProps}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            sx={{
                ...textFieldProps.sx,
                '& .MuiInputBase-input': {
                    fontFamily: 'monospace',
                    fontWeight: 600,
                    color: '#0066cc', // Blue color for code-like text
                    ...((textFieldProps.sx as any)?.['& .MuiInputBase-input'] || {}),
                }
            }}
        />
    );
};
