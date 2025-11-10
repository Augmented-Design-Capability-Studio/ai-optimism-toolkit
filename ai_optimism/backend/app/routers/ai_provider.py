from fastapi import APIRouter, HTTPException
from ..models.ai_provider import (
    AIValidationRequest, 
    AIValidationResponse,
    GenerateVariablesRequest,
    GenerateVariablesResponse,
    GeneratePropertiesRequest,
    GeneratePropertiesResponse,
    GenerateObjectiveRequest,
    GenerateObjectiveResponse,
    GenerateConstraintsRequest,
    GenerateConstraintsResponse
)
from ..services.ai_provider_service import AIProviderService

router = APIRouter(prefix="/ai", tags=["ai-provider"])
ai_service = AIProviderService()

@router.post("/validate-connection/", response_model=AIValidationResponse)
async def validate_ai_connection(request: AIValidationRequest):
    """
    Validate AI provider connection by making a minimal test request.
    
    This endpoint does not store the API key - it only validates the connection.
    The API key is passed from the frontend and used temporarily for validation.
    """
    try:
        result = ai_service.validate_connection(
            provider=request.provider,
            api_key=request.api_key,
            model=request.model,
            endpoint=request.endpoint
        )
        
        return AIValidationResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/providers/")
async def list_providers():
    """List available AI providers and their common models"""
    return {
        "providers": {
            "openai": {
                "name": "OpenAI",
                "models": ["gpt-4", "gpt-4-turbo", "gpt-4o", "gpt-3.5-turbo"],
                "requires_api_key": True,
                "endpoint": None
            },
            "anthropic": {
                "name": "Anthropic Claude",
                "models": ["claude-3-5-sonnet-20241022", "claude-3-opus-20240229", "claude-3-sonnet-20240229", "claude-3-haiku-20240307"],
                "requires_api_key": True,
                "endpoint": None
            },
            "google": {
                "name": "Google Gemini",
                "models": ["gemini-2.5-flash"],
                "requires_api_key": True,
                "endpoint": None
            },
            "ollama": {
                "name": "Ollama (Local)",
                "models": ["codellama", "llama2", "mistral", "mixtral"],
                "requires_api_key": False,
                "endpoint": "http://localhost:11434"
            },
            "custom": {
                "name": "Custom Endpoint",
                "models": [],
                "requires_api_key": True,
                "endpoint": "https://your-endpoint.com"
            }
        }
    }

@router.post("/generate-variables/", response_model=GenerateVariablesResponse)
async def generate_variables(request: GenerateVariablesRequest):
    """
    Generate variable suggestions using AI based on problem name and description.
    
    The AI analyzes the problem and suggests appropriate variables (numerical or categorical)
    with reasonable defaults for min/max, units, or category options.
    """
    try:
        result = ai_service.generate_variables(
            problem_name=request.problem_name,
            description=request.description,
            provider=request.provider,
            api_key=request.api_key,
            model=request.model,
            endpoint=request.endpoint
        )
        
        return GenerateVariablesResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/generate-properties/", response_model=GeneratePropertiesResponse)
async def generate_properties(request: GeneratePropertiesRequest):
    """
    Generate computed properties based on variables.
    
    Properties are derived attributes calculated from variables.
    """
    try:
        result = ai_service.generate_properties(
            problem_name=request.problem_name,
            description=request.description,
            variables=[v.dict() for v in request.variables],
            provider=request.provider,
            api_key=request.api_key,
            model=request.model,
            endpoint=request.endpoint
        )
        return GeneratePropertiesResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/generate-objective/", response_model=GenerateObjectiveResponse)
async def generate_objective(request: GenerateObjectiveRequest):
    """
    Generate objective function code from natural language description.
    
    The AI converts the objective description into Python code.
    """
    try:
        result = ai_service.generate_objective(
            problem_name=request.problem_name,
            description=request.description,
            objective_description=request.objective_description,
            variables=[v.dict() for v in request.variables],
            properties=[p.dict() for p in request.properties] if request.properties else [],
            provider=request.provider,
            api_key=request.api_key,
            model=request.model,
            endpoint=request.endpoint
        )
        return GenerateObjectiveResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/generate-constraints/", response_model=GenerateConstraintsResponse)
async def generate_constraints(request: GenerateConstraintsRequest):
    """
    Generate constraint expressions based on variables and properties.
    
    The AI suggests reasonable constraint rules for the optimization problem.
    """
    try:
        result = ai_service.generate_constraints(
            problem_name=request.problem_name,
            description=request.description,
            variables=[v.dict() for v in request.variables],
            properties=[p.dict() for p in request.properties] if request.properties else [],
            provider=request.provider,
            api_key=request.api_key,
            model=request.model,
            endpoint=request.endpoint
        )
        return GenerateConstraintsResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
