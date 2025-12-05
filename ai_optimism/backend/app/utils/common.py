import time
import random

def generate_id() -> str:
    """Generate a unique ID for sessions/messages"""
    return f"{int(time.time() * 1000)}-{random.randint(1000, 9999)}"

def detect_formalization_readiness(text: str) -> bool:
    """Check if message text indicates readiness to formalize"""
    lower_text = text.lower()
    
    # Check for explicit readiness signals - must be more specific
    # Require mention of key components (variables, objectives, constraints) to avoid premature triggering
    is_ready = (
        ('enough information' in lower_text or 
         'ready to formalize' in lower_text or
         'can now formalize' in lower_text or 
         'sufficient information' in lower_text) and
        ('formalize' in lower_text or 'formalise' in lower_text) and
        # Require mention of key components to ensure problem is well-defined
        ('variable' in lower_text or 'objective' in lower_text or 'constraint' in lower_text)
    ) or (
        ('would you like' in lower_text or 
         'shall i' in lower_text or 
         'should i' in lower_text or 
         'want me to' in lower_text) and
        ('formalize' in lower_text or 
         'formalise' in lower_text or 
         'structured' in lower_text or 
         'problem definition' in lower_text) and
        # Require mention of key components to ensure problem is well-defined
        ('variable' in lower_text or 'objective' in lower_text or 'constraint' in lower_text)
    )
    
    return is_ready
