import React, { useState } from 'react';
import {
    Box,
    Button,
    Card,
    CardContent,
    IconButton,
    TextField,
    Typography,
    List,
    ListItem,
} from '@mui/material';
import './styles.css';
import { Add as AddIcon, Remove as RemoveIcon } from '@mui/icons-material';
import type { OptimizationProblem, Variable } from '../services/api';

interface ProblemFormProps {
    onSubmit: (problem: OptimizationProblem) => void;
}

const defaultVariable: Variable = {
    name: '',
    min: 0,
    max: 100,
    unit: '',
};

export const ProblemForm: React.FC<ProblemFormProps> = ({ onSubmit }) => {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [variables, setVariables] = useState<Variable[]>([{ ...defaultVariable }]);
    const [objectiveFunction, setObjectiveFunction] = useState('');
    const [constraints, setConstraints] = useState<string[]>(['']);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit({
            name,
            description,
            variables,
            objective_function: objectiveFunction,
            constraints: constraints.filter(c => c.trim() !== ''),
        });
    };

    const addVariable = () => {
        setVariables([...variables, { ...defaultVariable }]);
    };

    const removeVariable = (index: number) => {
        if (variables.length > 1) {
            setVariables(variables.filter((_, i) => i !== index));
        }
    };

    const updateVariable = (index: number, field: keyof Variable, value: string | number) => {
        const newVariables = [...variables];
        newVariables[index] = {
            ...newVariables[index],
            [field]: field === 'name' || field === 'unit' ? value : Number(value),
        };
        setVariables(newVariables);
    };

    const addConstraint = () => {
        setConstraints([...constraints, '']);
    };

    const removeConstraint = (index: number) => {
        setConstraints(constraints.filter((_, i) => i !== index));
    };

    const updateConstraint = (index: number, value: string) => {
        const newConstraints = [...constraints];
        newConstraints[index] = value;
        setConstraints(newConstraints);
    };

    return (
        <Card className="form-container">
            <CardContent>
                <Box
                    component="form"
                    onSubmit={handleSubmit}
                    className="form-content"
                >
                    <Typography variant="h5" align="center" gutterBottom>
                        Create Optimization Problem
                    </Typography>

                    <Box className="form-field">
                        <TextField
                            fullWidth
                            label="Problem Name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                            sx={{ mb: 2 }}
                        />

                        <TextField
                            fullWidth
                            label="Description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            multiline
                            rows={2}
                            sx={{ mb: 3 }}
                        />                    </Box>

                    <Box className="form-field">
                        <Typography variant="h6" align="center" sx={{ mb: 2 }}>Variables</Typography>
                        <List disablePadding sx={{ width: '100%' }}>
                            {variables.map((variable, index) => (
                                <ListItem key={index} disablePadding sx={{ width: '100%' }}>
                                <Box className="variable-fields">
                                    <TextField
                                        className="variable-field"
                                        label="Name"
                                        value={variable.name}
                                        onChange={(e) => updateVariable(index, 'name', e.target.value)}
                                        required
                                        size="small"
                                    />
                                    <TextField
                                        className="variable-field"
                                        type="number"
                                        label="Min"
                                        value={variable.min}
                                        onChange={(e) => updateVariable(index, 'min', e.target.value)}
                                        required
                                        size="small"
                                    />
                                    <TextField
                                        className="variable-field"
                                        type="number"
                                        label="Max"
                                        value={variable.max}
                                        onChange={(e) => updateVariable(index, 'max', e.target.value)}
                                        required
                                        size="small"
                                    />
                                    <TextField
                                        className="variable-field unit"
                                        label="Unit"
                                        value={variable.unit}
                                        onChange={(e) => updateVariable(index, 'unit', e.target.value)}
                                        size="small"
                                    />
                                    <IconButton 
                                        onClick={() => removeVariable(index)} 
                                        color="error"
                                        size="small"
                                        disabled={variables.length <= 1}
                                    >
                                        <RemoveIcon />
                                    </IconButton>
                                </Box>
                                </ListItem>
                            ))}
                        </List>
                        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
                            <Button startIcon={<AddIcon />} onClick={addVariable}>
                                Add Variable
                            </Button>
                        </Box>

                        <TextField
                            fullWidth
                            className="form-field"
                            label="Objective Function"
                            value={objectiveFunction}
                            onChange={(e) => setObjectiveFunction(e.target.value)}
                            multiline
                            rows={2}
                            required
                            sx={{ mb: 3 }}
                        />

                        <Typography variant="h6" align="center" sx={{ mb: 2 }}>Constraints</Typography>
                        <List disablePadding sx={{ width: '100%' }}>
                            {constraints.map((constraint, index) => (
                                <ListItem key={index} disablePadding sx={{ width: '100%', mb: 1 }}>
                                    <TextField
                                        fullWidth
                                        className="constraint-field"
                                        label={`Constraint ${index + 1}`}
                                        value={constraint}
                                        onChange={(e) => updateConstraint(index, e.target.value)}
                                    />
                                    <IconButton onClick={() => removeConstraint(index)} color="error">
                                        <RemoveIcon />
                                    </IconButton>
                                </ListItem>
                            ))}
                        </List>
                        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
                            <Button startIcon={<AddIcon />} onClick={addConstraint}>
                                Add Constraint
                            </Button>
                        </Box>

                        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                            <Button type="submit" variant="contained" color="primary">
                                Create Problem
                            </Button>
                        </Box>
                    </Box>
                </Box>
            </CardContent>
        </Card>
    );
};