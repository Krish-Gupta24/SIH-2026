"""Pydantic schemas and canonical domain data contracts."""

from pydantic import BaseModel, ConfigDict


class CoreSchema(BaseModel):
    """Base schema enforcing strict validation and frozen/safe configurations."""

    model_config = ConfigDict(
        from_attributes=True,
        validate_assignment=True,
        str_strip_whitespace=True,
    )
