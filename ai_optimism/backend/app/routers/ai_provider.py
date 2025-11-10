from fastapi import APIRouter, HTTPException
from ..models.ai_provider import AIValidationRequest, AIValidationResponse
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
