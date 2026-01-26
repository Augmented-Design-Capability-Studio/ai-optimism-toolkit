"""
Wrapper classes for safe expression evaluation
Provides attribute access for categorical variables and datetime strings
"""
from typing import Dict, Any


class CategoricalVariable:
    """
    Wrapper that makes categorical variables accessible with direct attribute access.
    Allows expressions like variable.attribute_name instead of variable_attributes[variable]['attribute_name']
    """
    def __init__(self, category_name: str, attributes: Dict[str, Any]):
        self._category = category_name
        self._attributes = attributes
    
    def __str__(self):
        return self._category
    
    def __repr__(self):
        return f"CategoricalVariable('{self._category}')"
    
    def __getattr__(self, name):
        # When accessing .price, .arrival_time, etc.
        if self._category in self._attributes:
            if name in self._attributes[self._category]:
                value = self._attributes[self._category][name]
                # If it's an ISO datetime string, return a datetime-like object
                if isinstance(value, str) and 'T' in value and value.count('-') >= 2:
                    return ISODateTimeWrapper(value)
                return value
        raise AttributeError(f"Attribute '{name}' not found for category '{self._category}'")
    
    # Make it work in comparisons and arithmetic (if needed)
    def __eq__(self, other):
        return str(self) == str(other)
    
    def __ne__(self, other):
        return str(self) != str(other)
    
    def __hash__(self):
        return hash(self._category)


class ISODateTimeWrapper:
    """
    Wrapper for ISO datetime strings that allows .hour, .minute access
    without requiring datetime.fromisoformat() which isn't available in safe_eval
    """
    def __init__(self, iso_string: str):
        self._iso_string = iso_string
        # Parse ISO string manually: "2023-12-18T14:30:00"
        try:
            date_part, time_part = iso_string.split('T')
            year, month, day = map(int, date_part.split('-'))
            time_parts = time_part.split(':')
            self._hour = int(time_parts[0])
            self._minute = int(time_parts[1].split('.')[0]) if len(time_parts) > 1 else 0
            self._second = int(time_parts[2].split('.')[0]) if len(time_parts) > 2 else 0
        except (ValueError, IndexError):
            # If parsing fails, default to 0
            self._hour = 0
            self._minute = 0
            self._second = 0
    
    @property
    def hour(self):
        return self._hour
    
    @property
    def minute(self):
        return self._minute
    
    @property
    def second(self):
        return self._second
    
    def __str__(self):
        return self._iso_string
    
    def __repr__(self):
        return f"ISODateTimeWrapper('{self._iso_string}')"



