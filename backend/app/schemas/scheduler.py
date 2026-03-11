from datetime import datetime
from pydantic import BaseModel


class ScheduledCommandCreate(BaseModel):
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
    last_run: datetime | None = None
    next_run: datetime | None = None
    run_count: int = 0
    last_result: str | None = None
    created_at: datetime | None = None

    model_config = {"from_attributes": True}


class SchedulePreset(BaseModel):
    name: str
    description: str
    commands: list["SchedulePresetCommand"]


class SchedulePresetCommand(BaseModel):
    name: str
    command: str
    cron_expression: str
