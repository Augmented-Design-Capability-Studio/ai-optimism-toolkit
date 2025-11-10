"""Service for validating AI provider connections"""
from typing import Dict
import logging

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
