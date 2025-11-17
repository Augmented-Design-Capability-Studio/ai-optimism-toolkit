"""Service for validating AI provider connections"""
from typing import Dict
import logging
import json
import re

logger = logging.getLogger(__name__)

class AIProviderService:
    """Service to validate API connections for different AI providers"""
    
    def __init__(self):
        pass
    
    def validate_connection(self, provider: str, api_key: str, model: str, endpoint: str = None) -> Dict:
        """
        Validate connection to AI provider by making a minimal test request
        
        Args:
            provider: AI provider name (openai, anthropic, google, ollama, custom)
            api_key: API key for authentication
            model: Model name to test
            endpoint: Optional custom endpoint URL
            
        Returns:
            Dict with status, message, provider, model, and optional details
        """
        try:
            if provider == "openai":
                return self._validate_openai(api_key, model)
            elif provider == "anthropic":
                return self._validate_anthropic(api_key, model)
            elif provider == "google":
                return self._validate_google(api_key, model)
            elif provider == "ollama":
                return self._validate_ollama(endpoint or "http://localhost:11434", model)
            elif provider == "custom":
                return self._validate_custom(endpoint, api_key, model)
            else:
                return {
                    "status": "error",
                    "message": f"Unknown provider: {provider}",
                    "provider": provider,
                    "model": model
                }
        except Exception as e:
            logger.error(f"Error validating {provider}: {str(e)}")
            return {
                "status": "error",
                "message": str(e),
                "provider": provider,
                "model": model
            }
    
    def _validate_openai(self, api_key: str, model: str) -> Dict:
        """Validate OpenAI API connection"""
        return {
            "status": "error",
            "message": "OpenAI provider not installed. Please install: pip install openai",
            "provider": "openai",
            "model": model
        }
    
    def _validate_anthropic(self, api_key: str, model: str) -> Dict:
        """Validate Anthropic Claude API connection"""
        return {
            "status": "error",
            "message": "Anthropic provider not installed. Please install: pip install anthropic",
            "provider": "anthropic",
            "model": model
        }
    
    def _validate_google(self, api_key: str, model: str) -> Dict:
        """Validate Google Gemini API connection"""
        try:
            from google import genai
            from google.genai import types
            
            client = genai.Client(api_key=api_key)
            
            # Make a minimal test request
            response = client.models.generate_content(
                model=model,
                contents="test"
            )
            
            return {
                "status": "success",
                "message": f"Successfully connected to Google {model}",
                "provider": "google",
                "model": model,
                "details": {
                    "model_used": model
                }
            }
        except ImportError:
            return {
                "status": "error",
                "message": "Google Generative AI library not installed. Run: pip install google-genai",
                "provider": "google",
                "model": model
            }
        except Exception as e:
            error_msg = str(e)
            if "API_KEY_INVALID" in error_msg or "invalid api key" in error_msg.lower() or "401" in error_msg:
                error_msg = "Invalid API key"
            elif "not found" in error_msg.lower() or "404" in error_msg:
                error_msg = f"Model '{model}' not found"
            
            return {
                "status": "error",
                "message": error_msg,
                "provider": "google",
                "model": model
            }
    
    def _validate_ollama(self, endpoint: str, model: str) -> Dict:
        """Validate Ollama local API connection"""
        try:
            import requests
            
            # Check if Ollama is running
            response = requests.get(f"{endpoint}/api/tags", timeout=5)
            response.raise_for_status()
            
            # Check if model exists
            models = response.json().get("models", [])
            model_names = [m.get("name", "").split(":")[0] for m in models]
            
            if model not in model_names and model.split(":")[0] not in model_names:
                return {
                    "status": "error",
                    "message": f"Model '{model}' not found. Available models: {', '.join(model_names)}",
                    "provider": "ollama",
                    "model": model,
                    "details": {"available_models": model_names}
                }
            
            # Test generation
            gen_response = requests.post(
                f"{endpoint}/api/generate",
                json={"model": model, "prompt": "test", "stream": False},
                timeout=30
            )
            gen_response.raise_for_status()
            
            return {
                "status": "success",
                "message": f"Successfully connected to Ollama {model}",
                "provider": "ollama",
                "model": model,
                "details": {
                    "endpoint": endpoint,
                    "available_models": model_names
                }
            }
        except ImportError:
            return {
                "status": "error",
                "message": "Requests library not installed. Run: pip install requests",
                "provider": "ollama",
                "model": model
            }
        except requests.exceptions.ConnectionError:
            return {
                "status": "error",
                "message": f"Cannot connect to Ollama at {endpoint}. Is Ollama running?",
                "provider": "ollama",
                "model": model
            }
        except requests.exceptions.Timeout:
            return {
                "status": "error",
                "message": "Request timed out. Ollama may be slow or unresponsive.",
                "provider": "ollama",
                "model": model
            }
        except Exception as e:
            return {
                "status": "error",
                "message": str(e),
                "provider": "ollama",
                "model": model
            }
    
    def _validate_custom(self, endpoint: str, api_key: str, model: str) -> Dict:
        """Validate custom endpoint connection"""
        try:
            import requests
            
            if not endpoint:
                return {
                    "status": "error",
                    "message": "Custom endpoint URL is required",
                    "provider": "custom",
                    "model": model
                }
            
            # Try OpenAI-compatible endpoint format
            headers = {"Authorization": f"Bearer {api_key}"} if api_key else {}
            response = requests.post(
                f"{endpoint}/chat/completions",
                headers=headers,
                json={
                    "model": model,
                    "messages": [{"role": "user", "content": "test"}],
                    "max_tokens": 5
                },
                timeout=30
            )
            response.raise_for_status()
            
            return {
                "status": "success",
                "message": f"Successfully connected to custom endpoint",
                "provider": "custom",
                "model": model,
                "details": {"endpoint": endpoint}
            }
        except Exception as e:
            return {
                "status": "error",
                "message": f"Failed to connect to custom endpoint: {str(e)}",
                "provider": "custom",
                "model": model
            }
    
    def generate_variables(
        self,
        problem_name: str,
        description: str,
        provider: str,
        api_key: str,
        model: str,
        endpoint: str = None
    ) -> Dict:
        """
        Use AI to generate variable suggestions based on problem name and description.
        
        Args:
            problem_name: Name of the optimization problem
            description: Optional description providing more context
            provider: AI provider to use
            api_key: API key for authentication
            model: Model name to use
            endpoint: Optional custom endpoint
            
        Returns:
            Dict with status, message, and variables list
        """
        try:
            if provider == "google":
                return self._generate_variables_google(problem_name, description, api_key, model)
            else:
                return {
                    "status": "error",
                    "message": f"Variable generation not implemented for provider: {provider}. Only Google is supported.",
                    "variables": []
                }
        except Exception as e:
            logger.error(f"Error generating variables with {provider}: {str(e)}")
            return {
                "status": "error",
                "message": str(e),
                "variables": []
            }
    
    def _generate_variables_google(self, problem_name: str, description: str, api_key: str, model: str) -> Dict:
        """Generate variables using Google Gemini"""
        try:
            from google import genai
            
            client = genai.Client(api_key=api_key)
            
            # Construct the prompt
            desc_text = description if description and description.strip() else "Not provided"
            prompt = f"""You are an expert in optimization problems. Given the following problem, suggest appropriate variables for optimization.

Problem Name: {problem_name}
Description: {desc_text}

Please try to identify how many variables are requested in the description and suggest variables that would be relevant for this optimization problem. 
If unspecified, suggest 2-8 variables. 

For each variable:
1. Determine if it should be NUMERICAL (continuous values with min/max) or CATEGORICAL (discrete choices)
2. Provide a clear, descriptive name (lowercase_with_underscores)
3. For numerical variables: suggest reasonable min/max bounds and a unit
4. For categorical variables: suggest 2-5 meaningful categories; the category names should be in snake_case format like the variable names
5. Explain briefly why this variable is relevant

Return your response as a valid JSON object with this exact structure:
{{
  "variables": [
    {{
      "name": "variable_name",
      "type": "numerical",
      "min": 0,
      "max": 100,
      "unit": "units",
      "reasoning": "Why this variable matters"
    }},
    {{
      "name": "another_variable",
      "type": "categorical",
      "categories": ["option1", "option2", "option3"],
      "modifier_strategy": "cycle",
      "reasoning": "Why this variable matters"
    }}
  ]
}}

IMPORTANT: Return ONLY valid JSON, no markdown formatting, no code blocks, no explanatory text before or after."""

            # Make the API call
            response = client.models.generate_content(
                model=model,
                contents=prompt
            )
            
            # Extract the response text
            response_text = response.text.strip()
            
            # Clean up the response - remove markdown code blocks if present
            response_text = re.sub(r'^```json\s*', '', response_text)
            response_text = re.sub(r'^```\s*', '', response_text)
            response_text = re.sub(r'\s*```$', '', response_text)
            response_text = response_text.strip()
            
            # Parse the JSON response
            try:
                result = json.loads(response_text)
                variables = result.get("variables", [])
                
                # Validate and clean up the variables
                cleaned_variables = []
                for var in variables:
                    if var.get("type") == "numerical":
                        cleaned_variables.append({
                            "name": var.get("name", ""),
                            "type": "numerical",
                            "min": var.get("min"),
                            "max": var.get("max"),
                            "unit": var.get("unit", ""),
                            "reasoning": var.get("reasoning", "")
                        })
                    elif var.get("type") == "categorical":
                        cleaned_variables.append({
                            "name": var.get("name", ""),
                            "type": "categorical",
                            "categories": var.get("categories", []),
                            "modifier_strategy": var.get("modifier_strategy", "cycle"),
                            "reasoning": var.get("reasoning", "")
                        })
                
                return {
                    "status": "success",
                    "message": f"Successfully generated {len(cleaned_variables)} variable suggestions",
                    "variables": cleaned_variables
                }
            except json.JSONDecodeError as e:
                logger.error(f"Failed to parse AI response as JSON: {response_text[:500]}")
                return {
                    "status": "error",
                    "message": f"Failed to parse AI response as JSON: {str(e)}",
                    "variables": []
                }
                
        except ImportError:
            return {
                "status": "error",
                "message": "Google Generative AI library not installed. Run: pip install google-genai",
                "variables": []
            }
        except Exception as e:
            logger.error(f"Error generating variables with Google: {str(e)}")
            return {
                "status": "error",
                "message": f"Failed to generate variables: {str(e)}",
                "variables": []
            }
    
    def generate_properties(
        self,
        problem_name: str,
        description: str,
        variables: list,
        provider: str,
        api_key: str,
        model: str,
        endpoint: str = None
    ) -> Dict:
        """Generate computed properties based on variables"""
        try:
            if provider == "google":
                return self._generate_properties_google(problem_name, description, variables, api_key, model)
            else:
                return {
                    "status": "error",
                    "message": f"Property generation not implemented for provider: {provider}",
                    "properties": []
                }
        except Exception as e:
            logger.error(f"Error generating properties: {str(e)}")
            return {"status": "error", "message": str(e), "properties": []}
    
    def _generate_properties_google(self, problem_name: str, description: str, variables: list, api_key: str, model: str) -> Dict:
        """Generate properties using Google Gemini"""
        try:
            from google import genai
            
            client = genai.Client(api_key=api_key)
            
            # Format variables for prompt
            vars_text = "\n".join([
                f"- {v['name']} ({v['type']}): " + 
                (f"{v.get('min')}-{v.get('max')} {v.get('unit', '')}" if v['type'] == 'numerical' else f"categories: {', '.join(v.get('categories', []))}")
                for v in variables
            ])
            
            prompt = f"""You are an expert in optimization problems. Given the problem and its variables, suggest computed properties (derived attributes).

Problem: {problem_name}
Description: {description or "Not provided"}

Variables:
{vars_text}

Suggest 2-5 computed properties that would be useful for this optimization problem. Properties should be:
1. Derived from the existing variables
2. Meaningful for optimization objectives or constraints
3. Simple mathematical expressions

If the description specifies how many variables to suggest, follow that.

Return your response as valid JSON with this structure:
{{
  "properties": [
    {{
      "name": "property_name",
      "expression": "mathematical_expression",
      "description": "Brief explanation"
    }}
  ]
}}

Examples:
- name: "total_cost", expression: "price * quantity", description: "Total cost of items"
- name: "efficiency_ratio", expression: "output / input", description: "Efficiency measure"

IMPORTANT: Return ONLY valid JSON, no markdown formatting."""

            response = client.models.generate_content(model=model, contents=prompt)
            response_text = response.text.strip()
            
            # Clean markdown
            response_text = re.sub(r'^```json\s*', '', response_text)
            response_text = re.sub(r'^```\s*', '', response_text)
            response_text = re.sub(r'\s*```$', '', response_text)
            response_text = response_text.strip()
            
            result = json.loads(response_text)
            properties = result.get("properties", [])
            
            return {
                "status": "success",
                "message": f"Generated {len(properties)} properties",
                "properties": properties
            }
        except json.JSONDecodeError as e:
            logger.error(f"JSON parse error: {response_text[:500]}")
            return {"status": "error", "message": f"Failed to parse response: {str(e)}", "properties": []}
        except Exception as e:
            logger.error(f"Error: {str(e)}")
            return {"status": "error", "message": str(e), "properties": []}
    
    def generate_objective(
        self,
        problem_name: str,
        description: str,
        objective_description: str,
        variables: list,
        properties: list,
        provider: str,
        api_key: str,
        model: str,
        endpoint: str = None
    ) -> Dict:
        """Generate objective function code"""
        try:
            if provider == "google":
                return self._generate_objective_google(
                    problem_name, description, objective_description, variables, properties, api_key, model
                )
            else:
                return {"status": "error", "message": f"Objective generation not implemented for provider: {provider}", "code": None}
        except Exception as e:
            logger.error(f"Error generating objective: {str(e)}")
            return {"status": "error", "message": str(e), "code": None}
    
    def _generate_objective_google(
        self, problem_name: str, description: str, objective_description: str,
        variables: list, properties: list, api_key: str, model: str
    ) -> Dict:
        """Generate objective function using Google Gemini"""
        try:
            from google import genai
            
            client = genai.Client(api_key=api_key)
            
            vars_text = "\n".join([f"- {v['name']} ({v['type']})" for v in variables])
            props_text = "\n".join([f"- {p['name']}: {p['expression']}" for p in (properties or [])])
            
            prompt = f"""You are an expert Python developer specializing in optimization problems using the optimism_toolkit library.

Problem: {problem_name}
Description: {description or "Not provided"}
Objective: {objective_description}

Variables:
{vars_text}

Properties:
{props_text if props_text else "None"}

Generate a Python objective function that:
1. Uses the @cookie_heuristic decorator pattern from optimism_toolkit
2. Returns a numerical score to maximize
3. Accesses variables and properties from self (the design object)
4. Includes docstring

IMPORTANT: You MUST respond with ONLY a valid JSON object in this exact format (no markdown, no extra text):
{{
  "code": "your python code here",
  "explanation": "A brief 2-3 sentence explanation of how the code works and what it optimizes"
}}

Example format for the code field:
@problem_heuristic(Heuristic_Type.Objective)
def objective_name(self) -> float:
    \"\"\"
    Brief description of what is being optimized
    \"\"\"
    # Your calculation here
    return score
"""

            response = client.models.generate_content(model=model, contents=prompt)
            text = response.text.strip()
            
            logger.info(f"Raw AI response: {text[:200]}...")  # Log first 200 chars
            
            # Try to parse as JSON first
            try:
                import json
                # Remove markdown code blocks if present
                text = re.sub(r'^```json\s*', '', text)
                text = re.sub(r'^```\s*', '', text)
                text = re.sub(r'\s*```$', '', text)
                text = text.strip()
                
                result = json.loads(text)
                code = result.get('code', '').strip()
                explanation = result.get('explanation', '').strip()
                
                logger.info(f"Successfully parsed JSON. Code length: {len(code)}, Explanation length: {len(explanation)}")
                
                # Clean up code if it has markdown
                code = re.sub(r'^```python\s*', '', code)
                code = re.sub(r'^```\s*', '', code)
                code = re.sub(r'\s*```$', '', code)
                code = code.strip()
                
                return {
                    "status": "success",
                    "message": "Successfully generated objective function",
                    "code": code,
                    "explanation": explanation if explanation else "AI-generated objective function."
                }
            except json.JSONDecodeError as e:
                logger.warning(f"Failed to parse JSON response: {e}. Falling back to code-only mode.")
                # Fallback: treat entire response as code, generate a simple explanation
                code = text
                code = re.sub(r'^```python\s*', '', code)
                code = re.sub(r'^```\s*', '', code)
                code = re.sub(r'\s*```$', '', code)
                code = code.strip()
                
                return {
                    "status": "success",
                    "message": "Successfully generated objective function",
                    "code": code,
                    "explanation": "This objective function was generated to optimize the specified goal based on the problem variables and properties."
                }
        except Exception as e:
            logger.error(f"Error: {str(e)}")
            return {"status": "error", "message": str(e), "code": None}
    
    def generate_constraints(
        self,
        problem_name: str,
        description: str,
        variables: list,
        properties: list,
        provider: str,
        api_key: str,
        model: str,
        endpoint: str = None
    ) -> Dict:
        """Generate constraint expressions"""
        try:
            if provider == "google":
                return self._generate_constraints_google(problem_name, description, variables, properties, api_key, model)
            else:
                return {"status": "error", "message": f"Constraint generation not implemented for provider: {provider}", "constraints": []}
        except Exception as e:
            logger.error(f"Error generating constraints: {str(e)}")
            return {"status": "error", "message": str(e), "constraints": []}
    
    def _generate_constraints_google(
        self, problem_name: str, description: str, variables: list, properties: list, api_key: str, model: str
    ) -> Dict:
        """Generate constraints using Google Gemini"""
        try:
            from google import genai
            
            client = genai.Client(api_key=api_key)
            
            vars_text = "\n".join([
                f"- {v['name']} ({v['type']}): " +
                (f"{v.get('min')}-{v.get('max')}" if v['type'] == 'numerical' else f"{', '.join(v.get('categories', []))}")
                for v in variables
            ])
            props_text = "\n".join([f"- {p['name']}: {p['expression']}" for p in (properties or [])])
            
            prompt = f"""You are an expert in optimization constraints. Given this problem, suggest 2-5 constraint expressions.

Problem: {problem_name}
Description: {description or "Not provided"}

Variables:
{vars_text}

Properties:
{props_text if props_text else "None"}

Suggest meaningful constraints as simple expressions (e.g., "x + y <= 100", "total_cost <= budget").

Return valid JSON:
{{
  "constraints": [
    {{
      "expression": "constraint_expression",
      "description": "Why this constraint matters"
    }}
  ]
}}

IMPORTANT: Return ONLY valid JSON, no markdown."""

            response = client.models.generate_content(model=model, contents=prompt)
            response_text = response.text.strip()
            
            # Clean markdown
            response_text = re.sub(r'^```json\s*', '', response_text)
            response_text = re.sub(r'^```\s*', '', response_text)
            response_text = re.sub(r'\s*```$', '', response_text)
            response_text = response_text.strip()
            
            result = json.loads(response_text)
            constraints = result.get("constraints", [])
            
            return {
                "status": "success",
                "message": f"Generated {len(constraints)} constraints",
                "constraints": constraints
            }
        except json.JSONDecodeError as e:
            logger.error(f"JSON parse error: {response_text[:500]}")
            return {"status": "error", "message": f"Failed to parse response: {str(e)}", "constraints": []}
        except Exception as e:
            logger.error(f"Error: {str(e)}")
            return {"status": "error", "message": str(e), "constraints": []}
