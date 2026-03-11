from pydantic import BaseModel


class ServerCreate(BaseModel):
    name: str
    host: str
    port: int
    rcon_port: int
    rcon_password: str
    game_type: str = "zomboid"


class ServerUpdate(BaseModel):
    name: str | None = None
    host: str | None = None
    port: int | None = None
    rcon_port: int | None = None
    rcon_password: str | None = None
    game_type: str | None = None


class ServerOut(BaseModel):
    id: int
    name: str
    host: str
    port: int
    rcon_port: int
    game_type: str

    model_config = {"from_attributes": True}


class ServerStatus(BaseModel):
    server_id: int
    name: str
    online: bool
    player_count: int | None = None


class CommandRequest(BaseModel):
    command: str


class CommandResponse(BaseModel):
    output: str
