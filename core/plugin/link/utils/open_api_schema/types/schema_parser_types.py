"""Type definitions for OpenAPI schema parsing.

This module defines data classes and types used in OpenAPI schema parsing operations.
"""

from typing import Dict, List


class ParamsConfig:
    """Configuration class for API parameters.

    Represents the structure and validation rules for API parameters
    including type information, properties, and required fields.
    """

    def __init__(self, type: str, properties: Dict, required: List):
        self.type = type
        self.properties = properties
        self.required = required

    def to_dict(self) -> Dict:
        """Convert the parameter configuration to dictionary format.

        Returns:
            Dictionary representation of the parameter configuration
        """
        if self.required:
            return {
                "type": self.type,
                "properties": self.properties,
                "required": self.required,
            }
        else:
            return {"type": self.type, "properties": self.properties}


if __name__ == "__main__":
    params_inst = ParamsConfig(type="1", properties={}, required=[])
    print(params_inst.to_dict())
    a = params_inst.to_dict()
    a.pop("required")
    print(a)
