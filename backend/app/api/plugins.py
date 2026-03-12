from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel

from app.auth.permissions import require_role
from app.models.user import UserRole

router = APIRouter(prefix="/api/plugins", tags=["plugins"])


class InstallRequest(BaseModel):
    url: str


def _get_loader(request: Request):
    return request.app.state.plugin_loader


def _get_installer(request: Request):
    return request.app.state.plugin_installer


@router.get("/")
async def list_plugins(request: Request):
    """List all installed plugins."""
    loader = _get_loader(request)
    return loader.list_plugins()


@router.post("/install")
async def install_plugin(
    req: InstallRequest,
    request: Request,
    _user=Depends(require_role(UserRole.OWNER)),
):
    """Install a plugin from a git URL. Owner only."""
    installer = _get_installer(request)
    loader = _get_loader(request)
    try:
        manifest = installer.install(req.url)
        loader.load_all()
        return {"status": "installed", "plugin": manifest}
    except Exception as e:
        raise HTTPException(400, str(e))


@router.delete("/{plugin_id}")
async def uninstall_plugin(
    plugin_id: str,
    request: Request,
    _user=Depends(require_role(UserRole.OWNER)),
):
    """Uninstall a plugin. Owner only."""
    installer = _get_installer(request)
    loader = _get_loader(request)
    if installer.uninstall(plugin_id):
        loader.load_all()
        return {"status": "uninstalled"}
    raise HTTPException(404, "Plugin not found")


@router.post("/{plugin_id}/update")
async def update_plugin(
    plugin_id: str,
    request: Request,
    _user=Depends(require_role(UserRole.OWNER)),
):
    """Update a plugin from its repo. Owner only."""
    installer = _get_installer(request)
    loader = _get_loader(request)
    try:
        manifest = installer.update(plugin_id)
        loader.load_all()
        return {"status": "updated", "plugin": manifest}
    except Exception as e:
        raise HTTPException(400, str(e))
