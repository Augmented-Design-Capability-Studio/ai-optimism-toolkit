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
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    Chip,
    FormHelperText,
    RadioGroup,
    FormControlLabel,
    Radio,
    FormLabel,
} from '@mui/material';
import './styles.css';
import { Add as AddIcon, Remove as RemoveIcon } from '@mui/icons-material';
import type { OptimizationProblem, Variable } from '../services/api';

interface ProblemFormProps {
    onSubmit: (problem: OptimizationProblem) => void;
}

const defaultNumericalVariable: Variable = {
    name: '',
    type: 'numerical',
    min: 0,
    max: 100,
    unit: '',
};

const defaultCategoricalVariable: Variable = {
    name: '',
    type: 'categorical',
    categories: [],
};

export const ProblemForm: React.FC<ProblemFormProps> = ({ onSubmit }) => {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [variables, setVariables] = useState<Variable[]>([{ ...defaultNumericalVariable }]);
    const [objectiveFunction, setObjectiveFunction] = useState('');
    const [constraints, setConstraints] = useState<string[]>(['']);
    const [categoricalModifierStrategy, setCategoricalModifierStrategy] = useState<'cycle' | 'random'>('random');
    // Track raw category input strings for each variable
    const [categoryInputs, setCategoryInputs] = useState<{ [index: number]: string }>({});

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit({
            name,
            description,
            variables,
            objective_function: objectiveFunction,
            constraints: constraints.filter(c => c.trim() !== ''),
            categorical_modifier_strategy: categoricalModifierStrategy,
        });
    };

    const addVariable = () => {
        setVariables([...variables, { ...defaultNumericalVariable }]);
    };

    const removeVariable = (index: number) => {
        if (variables.length > 1) {
            setVariables(variables.filter((_, i) => i !== index));
        }
    };

    const updateVariable = (index: number, field: keyof Variable, value: any) => {
        const newVariables = [...variables];
        if (field === 'type') {
            // When changing type, reset to appropriate defaults
            if (value === 'numerical') {
                newVariables[index] = { ...defaultNumericalVariable, name: newVariables[index].name };
            } else {
                newVariables[index] = { ...defaultCategoricalVariable, name: newVariables[index].name };
            }
        } else if (field === 'categories') {
            // Handle categories as array directly
            newVariables[index] = { ...newVariables[index], categories: value };
        } else if (field === 'min' || field === 'max') {
            newVariables[index] = { ...newVariables[index], [field]: Number(value) };
        } else {
            newVariables[index] = { ...newVariables[index], [field]: value };
        }
        setVariables(newVariables);
    };

    const updateCategoriesString = (index: number, value: string) => {
        // Update local input state
        setCategoryInputs(prev => ({ ...prev, [index]: value }));
        // Parse and update categories from comma-separated string in real-time
        const categoriesArray = value.split(',').map(c => c.trim()).filter(c => c.length > 0);
        updateVariable(index, 'categories', categoriesArray);
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
                                <ListItem key={index} disablePadding sx={{ width: '100%', mb: 2 }}>
                                <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%', gap: 1, p: 2, border: '1px solid #e0e0e0', borderRadius: 1 }}>
                                    <Box className="variable-fields">
                                        <TextField
                                            className="variable-field"
                                            label="Name"
                                            value={variable.name}
                                            onChange={(e) => updateVariable(index, 'name', e.target.value)}
                                            required
                                            size="small"
                                        />
                                        <FormControl className="variable-field" size="small" required>
                                            <InputLabel>Type</InputLabel>
                                            <Select
                                                value={variable.type}
                                                label="Type"
                                                onChange={(e) => updateVariable(index, 'type', e.target.value)}
                                            >
                                                <MenuItem value="numerical">Numerical</MenuItem>
                                                <MenuItem value="categorical">Categorical</MenuItem>
                                            </Select>
                                        </FormControl>
                                        <IconButton 
                                            onClick={() => removeVariable(index)} 
                                            color="error"
                                            size="small"
                                            disabled={variables.length <= 1}
                                            sx={{ ml: 'auto' }}
                                        >
                                            <RemoveIcon />
                                        </IconButton>
                                    </Box>
                                    
                                    {variable.type === 'numerical' ? (
                                        <Box className="variable-fields">
                                            <TextField
                                                className="variable-field"
                                                type="number"
                                                label="Min"
                                                value={variable.min ?? ''}
                                                onChange={(e) => updateVariable(index, 'min', e.target.value)}
                                                required
                                                size="small"
                                            />
                                            <TextField
                                                className="variable-field"
                                                type="number"
                                                label="Max"
                                                value={variable.max ?? ''}
                                                onChange={(e) => updateVariable(index, 'max', e.target.value)}
                                                required
                                                size="small"
                                            />
                                            <TextField
                                                className="variable-field unit"
                                                label="Unit"
                                                value={variable.unit ?? ''}
                                                onChange={(e) => updateVariable(index, 'unit', e.target.value)}
                                                size="small"
                                            />
                                        </Box>
                                    ) : (
                                        <Box>
                                            <TextField
                                                fullWidth
                                                label="Categories"
                                                value={categoryInputs[index] ?? variable.categories?.join(', ') ?? ''}
                                                onChange={(e) => updateCategoriesString(index, e.target.value)}
                                                placeholder="Enter categories separated by commas (e.g., red, blue, green)"
                                                required
                                                size="small"
                                                helperText="Separate categories with commas. At least 2 required."
                                                InputLabelProps={{
                                                    shrink: true,
                                                }}
                                            />
                                            {variable.categories && variable.categories.length > 0 && (
                                                <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                                    {variable.categories.map((cat, catIndex) => (
                                                        <Chip 
                                                            key={catIndex} 
                                                            label={`${catIndex}: ${cat}`}
                                                            size="small"
                                                            color="primary"
                                                            variant="outlined"
                                                        />
                                                    ))}
                                                </Box>
                                            )}
                                        </Box>
                                    )}
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

                        {/* Categorical Modifier Strategy */}
                        {variables.some(v => v.type === 'categorical') && (
                            <Box sx={{ mb: 3, p: 2, border: '1px solid #e0e0e0', borderRadius: 1 }}>
                                <FormLabel component="legend">Categorical Variable Modification Strategy</FormLabel>
                                <RadioGroup
                                    row
                                    value={categoricalModifierStrategy}
                                    onChange={(e) => setCategoricalModifierStrategy(e.target.value as 'cycle' | 'random')}
                                >
                                    <FormControlLabel 
                                        value="cycle" 
                                        control={<Radio />} 
                                        label="Cycle through categories" 
                                    />
                                    <FormControlLabel 
                                        value="random" 
                                        control={<Radio />} 
                                        label="Random selection" 
                                    />
                                </RadioGroup>
                                <FormHelperText>
                                    Choose how the optimizer should modify categorical variables during optimization
                                </FormHelperText>
                            </Box>
                        )}

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