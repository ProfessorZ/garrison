from pydantic import BaseModel


class ScheduledCommandCreate(BaseModel):
    server_id: int
    name: str
    command: str
    cron_expression: str
    is_active: bool = True


class ScheduledCommandUpdate(BaseModel):
    name: str | None = None
    command: str | None = None
    cron_expression: str | None = None
    is_active: bool | None = None


class ScheduledCommandOut(BaseModel):
    id: int
    server_id: int
    name: str
    command: str
    cron_expression: str
    is_active: bool

    model_config = {"from_attributes": True}
