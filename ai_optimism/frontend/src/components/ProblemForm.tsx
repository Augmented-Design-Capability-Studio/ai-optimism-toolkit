import React, { useState, useEffect } from 'react';
import {
    Box,
    Button,
    Card,
    CardContent,
    TextField,
    Typography,
    Alert,
} from '@mui/material';
import './styles.css';
import { ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import { useAIProvider } from '../contexts/AIProviderContext';
import type { OptimizationProblem, Variable } from '../services/api';
import aiApi from '../services/ai';
import { VariablesSection } from './forms/VariablesSection';
import { PropertiesSection } from './forms/PropertiesSection';
import { ObjectiveSection } from './forms/ObjectiveSection';
import { ConstraintsSection } from './forms/ConstraintsSection';

interface ProblemFormProps {
    onSubmit: (problem: OptimizationProblem) => void;
    currentStep?: number;
    onNext?: (data: any) => void;
    onBack?: (() => void) | null;
    initialData?: any;
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
    modifier_strategy: 'cycle',
};

export const ProblemForm: React.FC<ProblemFormProps> = ({ 
    onSubmit, 
    currentStep = 1,
    onNext,
    onBack,
    initialData = {}
}) => {
    const { state: aiState, isConnected } = useAIProvider();
    const [name, setName] = useState(initialData.name || '');
    const [description, setDescription] = useState(initialData.description || '');
    const [variables, setVariables] = useState<Variable[]>(initialData.variables || [{ ...defaultNumericalVariable }]);
    const [properties, setProperties] = useState<Array<{name: string, expression: string, description: string}>>(initialData.properties || []);
    const [objectiveDescription, setObjectiveDescription] = useState(initialData.objectiveDescription || '');
    const [objectiveCode, setObjectiveCode] = useState(initialData.objectiveCode || '');
    const [objectiveExplanation, setObjectiveExplanation] = useState(initialData.objectiveExplanation || '');
    const [showObjectiveCode, setShowObjectiveCode] = useState(false);
    const [objectiveFunction] = useState('');
    const [constraints, setConstraints] = useState<string[]>(initialData.constraints || ['']);
    // Track raw category input strings for each variable
    const [categoryInputs, setCategoryInputs] = useState<{ [index: number]: string }>({});
    const [isGenerating, setIsGenerating] = useState(false);
    const [generationError, setGenerationError] = useState<string | null>(null);
    const [isGeneratingProperties, setIsGeneratingProperties] = useState(false);
    const [propertiesError, setPropertiesError] = useState<string | null>(null);
    const [isGeneratingObjective, setIsGeneratingObjective] = useState(false);
    const [objectiveError, setObjectiveError] = useState<string | null>(null);
    const [isGeneratingConstraints, setIsGeneratingConstraints] = useState(false);
    const [constraintsError, setConstraintsError] = useState<string | null>(null);

    // Sync state with initialData when it changes (for wizard step navigation)
    useEffect(() => {
        if (initialData.variables) {
            setVariables(initialData.variables);
        }
    }, [initialData.variables]);

    useEffect(() => {
        if (initialData.properties !== undefined) {
            setProperties(initialData.properties);
        }
    }, [initialData.properties]);

    useEffect(() => {
        if (initialData.objectiveDescription !== undefined) {
            setObjectiveDescription(initialData.objectiveDescription);
        }
    }, [initialData.objectiveDescription]);

    useEffect(() => {
        if (initialData.objectiveCode !== undefined) {
            setObjectiveCode(initialData.objectiveCode);
        }
    }, [initialData.objectiveCode]);

    useEffect(() => {
        if (initialData.objectiveExplanation !== undefined) {
            setObjectiveExplanation(initialData.objectiveExplanation);
        }
    }, [initialData.objectiveExplanation]);

    useEffect(() => {
        if (initialData.constraints) {
            setConstraints(initialData.constraints);
        }
    }, [initialData.constraints]);

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

    const handleNext = () => {
        if (onNext) {
            if (currentStep === 1) {
                onNext({ name, description, variables });
            } else if (currentStep === 2) {
                onNext(properties);
            } else if (currentStep === 3) {
                onNext({ objectiveDescription, objectiveCode, objectiveExplanation, constraints });
            }
        }
    };

    const addVariable = () => {
        setVariables([...variables, { ...defaultNumericalVariable }]);
    };

    const clearAllVariables = () => {
        setVariables([{ ...defaultNumericalVariable }]);
        setCategoryInputs({});
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

    // Alias for use in VariablesSection component
    const handleCategoryInputChange = updateCategoriesString;

    const addProperty = () => {
        setProperties([...properties, { name: '', expression: '', description: '' }]);
    };

    const removeProperty = (index: number) => {
        setProperties(properties.filter((_, i) => i !== index));
    };

    const updateProperty = (index: number, field: 'name' | 'expression' | 'description', value: string) => {
        const newProperties = [...properties];
        newProperties[index] = { ...newProperties[index], [field]: value };
        setProperties(newProperties);
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

    const handleGenerateVariables = async () => {
        if (!isConnected) {
            setGenerationError('Please connect to an AI provider first');
            return;
        }

        if (!name.trim()) {
            setGenerationError('Please enter a problem name first');
            return;
        }

        setIsGenerating(true);
        setGenerationError(null);

        try {
            if (!aiState.provider || !aiState.apiKey || !aiState.model) {
                setGenerationError('AI configuration not found');
                return;
            }

            const response = await aiApi.generateVariables({
                problem_name: name,
                description: description || undefined,
                provider: aiState.provider,
                api_key: aiState.apiKey,
                model: aiState.model,
                endpoint: aiState.endpoint || undefined
            });

            if (response.status === 'success' && response.variables) {
                // Map the generated variables to our form state
                const newVariables = response.variables.map(v => ({
                    name: v.name,
                    type: v.type,
                    min: v.min ?? 0,
                    max: v.max ?? 100,
                    unit: v.unit ?? '',
                    categories: v.categories ?? [],
                    modifier_strategy: v.modifier_strategy ?? 'cycle'
                }));

                // Update variables
                setVariables(newVariables);
                
                // Update category inputs for display
                const newCategoryInputs: { [key: number]: string } = {};
                newVariables.forEach((variable, index) => {
                    if (variable.type === 'categorical' && variable.categories.length > 0) {
                        newCategoryInputs[index] = variable.categories.join(', ');
                    }
                });
                setCategoryInputs(newCategoryInputs);

                // Clear any previous errors
                setGenerationError(null);
            } else {
                setGenerationError(response.message || 'Failed to generate variables');
            }
        } catch (error: any) {
            console.error('Error generating variables:', error);
            setGenerationError(error.response?.data?.detail || error.message || 'Failed to generate variables');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleGenerateProperties = async () => {
        if (!aiState.provider || !aiState.apiKey || !aiState.model) {
            setPropertiesError('AI configuration not found');
            return;
        }

        setIsGeneratingProperties(true);
        setPropertiesError(null);

        try {
            const response = await aiApi.generateProperties({
                problem_name: name,
                description: description || undefined,
                variables: variables.map(v => ({
                    name: v.name,
                    type: v.type,
                    min: v.min,
                    max: v.max,
                    unit: v.unit,
                    categories: v.categories,
                    modifier_strategy: v.modifier_strategy
                })),
                provider: aiState.provider,
                api_key: aiState.apiKey,
                model: aiState.model,
                endpoint: aiState.endpoint || undefined
            });

            if (response.status === 'success' && response.properties) {
                setProperties(response.properties);
                setPropertiesError(null);
            } else {
                setPropertiesError(response.message || 'Failed to generate properties');
            }
        } catch (error: any) {
            console.error('Error generating properties:', error);
            setPropertiesError(error.response?.data?.detail || error.message || 'Failed to generate properties');
        } finally {
            setIsGeneratingProperties(false);
        }
    };

    const handleGenerateObjective = async () => {
        if (!aiState.provider || !aiState.apiKey || !aiState.model) {
            setObjectiveError('AI configuration not found');
            return;
        }

        if (!objectiveDescription.trim()) {
            setObjectiveError('Please enter an objective description first');
            return;
        }

        setIsGeneratingObjective(true);
        setObjectiveError(null);

        try {
            const response = await aiApi.generateObjective({
                problem_name: name,
                description: description,
                objective_description: objectiveDescription,
                variables: variables.map(v => ({
                    name: v.name,
                    type: v.type,
                    min: v.min,
                    max: v.max,
                    unit: v.unit,
                    categories: v.categories,
                    modifier_strategy: v.modifier_strategy
                })),
                properties: properties.length > 0 ? properties : undefined,
                provider: aiState.provider,
                api_key: aiState.apiKey,
                model: aiState.model,
                endpoint: aiState.endpoint || undefined
            });

            if (response.status === 'success' && response.code) {
                console.log('Objective generation response:', response);
                console.log('Explanation received:', response.explanation);
                setObjectiveCode(response.code);
                setObjectiveExplanation(response.explanation || '');
                setShowObjectiveCode(true); // Automatically expand to show generated code
                setObjectiveError(null);
            } else {
                setObjectiveError(response.message || 'Failed to generate objective');
            }
        } catch (error: any) {
            console.error('Error generating objective:', error);
            setObjectiveError(error.response?.data?.detail || error.message || 'Failed to generate objective');
        } finally {
            setIsGeneratingObjective(false);
        }
    };

    const handleGenerateConstraints = async () => {
        if (!aiState.provider || !aiState.apiKey || !aiState.model) {
            setConstraintsError('AI configuration not found');
            return;
        }

        setIsGeneratingConstraints(true);
        setConstraintsError(null);

        try {
            const response = await aiApi.generateConstraints({
                problem_name: name,
                description: description || undefined,
                variables: variables.map(v => ({
                    name: v.name,
                    type: v.type,
                    min: v.min,
                    max: v.max,
                    unit: v.unit,
                    categories: v.categories,
                    modifier_strategy: v.modifier_strategy
                })),
                properties: properties.length > 0 ? properties : undefined,
                provider: aiState.provider,
                api_key: aiState.apiKey,
                model: aiState.model,
                endpoint: aiState.endpoint || undefined
            });

            if (response.status === 'success' && response.constraints) {
                // Replace existing constraints with generated ones
                setConstraints(response.constraints.map(c => c.expression));
                setConstraintsError(null);
            } else {
                setConstraintsError(response.message || 'Failed to generate constraints');
            }
        } catch (error: any) {
            console.error('Error generating constraints:', error);
            setConstraintsError(error.response?.data?.detail || error.message || 'Failed to generate constraints');
        } finally {
            setIsGeneratingConstraints(false);
        }
    };

    return (
        <Card className="form-container">
            <CardContent>
                <Box
                    component="form"
                    onSubmit={handleSubmit}
                    className="form-content"
                >
                    {/* Step 1: Problem Setup (Name, Description, Variables) */}
                    {currentStep === 1 && (
                        <>
                            {/* Problem Info */}
                            <Box sx={{ mb: 3 }}>
                                <Typography variant="h6" gutterBottom>Problem Information</Typography>
                                <TextField
                                    fullWidth
                                    label="Problem Name"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    required
                                    sx={{ mb: 2 }}
                                />

                                {generationError && (
                                    <Alert severity={generationError.includes('coming soon') ? 'info' : 'error'} sx={{ mb: 2 }}>
                                        {generationError}
                                    </Alert>
                                )}

                                <TextField
                                    fullWidth
                                    label="Description"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="e.g., Optimize cookie production to maximize profit while meeting customer demand"
                                    multiline
                                    rows={4}
                                    helperText="Describe your optimization problem. Mention key variables you'll need (e.g., quantity, price, time) to help AI generate relevant suggestions."
                                />
                            </Box>

                            <VariablesSection
                                variables={variables}
                                categoryInputs={categoryInputs}
                                isGenerating={isGenerating}
                                isConnected={isConnected}
                                problemName={name}
                                onVariablesChange={setVariables}
                                onCategoryInputChange={handleCategoryInputChange}
                                onGenerateVariables={handleGenerateVariables}
                                onAddVariable={addVariable}
                                onRemoveVariable={removeVariable}
                                onUpdateVariable={updateVariable}
                                onClearAll={clearAllVariables}
                            />

                            {/* Step 1 Navigation */}
                            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
                                <Button 
                                    variant="contained" 
                                    onClick={handleNext}
                                    disabled={!name.trim() || variables.length === 0}
                                >
                                    Next
                                </Button>
                            </Box>
                        </>
                    )}

                    {/* Step 2: Properties */}
                    {currentStep === 2 && (
                        <>
                            <PropertiesSection
                                properties={properties}
                                isGenerating={isGeneratingProperties}
                                isConnected={isConnected}
                                hasVariables={variables.some(v => v.name.trim().length > 0)}
                                error={propertiesError}
                                onGenerateProperties={handleGenerateProperties}
                                onAddProperty={addProperty}
                                onRemoveProperty={removeProperty}
                                onUpdateProperty={updateProperty}
                            />

                            {/* Step 2 Navigation */}
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
                                <Button 
                                    variant="outlined" 
                                    onClick={onBack || undefined}
                                    startIcon={<ArrowBackIcon />}
                                    disabled={!onBack}
                                >
                                    Back
                                </Button>
                                <Button 
                                    variant="contained" 
                                    onClick={handleNext}
                                >
                                    Next
                                </Button>
                            </Box>
                        </>
                    )}

                    {/* Step 3: Objective Function and Constraints */}
                    {currentStep === 3 && (
                        <>
                            <ObjectiveSection
                                objectiveDescription={objectiveDescription}
                                objectiveCode={objectiveCode}
                                objectiveExplanation={objectiveExplanation}
                                showCode={showObjectiveCode}
                                isGenerating={isGeneratingObjective}
                                isConnected={isConnected}
                                error={objectiveError}
                                onDescriptionChange={setObjectiveDescription}
                                onCodeChange={setObjectiveCode}
                                onShowCodeChange={setShowObjectiveCode}
                                onGenerate={handleGenerateObjective}
                            />

                            <ConstraintsSection
                                constraints={constraints}
                                isGenerating={isGeneratingConstraints}
                                isConnected={isConnected}
                                hasVariables={variables.some(v => v.name.trim().length > 0)}
                                error={constraintsError}
                                onConstraintsChange={setConstraints}
                                onGenerate={handleGenerateConstraints}
                                onAddConstraint={addConstraint}
                                onRemoveConstraint={removeConstraint}
                                onUpdateConstraint={updateConstraint}
                            />

                            {/* Step 3 Navigation */}
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
                                <Button 
                                    variant="outlined" 
                                    onClick={onBack || undefined}
                                    startIcon={<ArrowBackIcon />}
                                    disabled={!onBack}
                                >
                                    Back
                                </Button>
                                <Button 
                                    variant="contained" 
                                    onClick={handleNext}
                                >
                                    Next
                                </Button>
                            </Box>
                        </>
                    )}
                </Box>
            </CardContent>
        </Card>
    );
};
