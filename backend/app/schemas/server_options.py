from pydantic import BaseModel


class ServerOption(BaseModel):
    name: str
    value: str
    type: str  # "boolean", "number", "string"
    category: str
    description: str


class ServerOptionUpdate(BaseModel):
    value: str


class BulkOptionUpdate(BaseModel):
    options: dict[str, str]  # {option_name: new_value}
