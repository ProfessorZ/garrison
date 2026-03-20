from fastapi import APIRouter, Depends, HTTPException, Request, UploadFile, File
from pydantic import BaseModel

from app.auth.permissions import require_role
from app.models.user import UserRole

router = APIRouter(prefix="/api/plugins", tags=["plugins"])

MAX_ZIP_SIZE = 50 * 1024 * 1024  # 50MB

RISK_WARNING = (
    "Garrison plugins run arbitrary Python code on your server with full access "
    "to your database, RCON connections, and filesystem. Only install plugins from "
    "sources you trust. You must acknowledge this risk before installing."
)


class InstallRequest(BaseModel):
    url: str
    acknowledged_risk: bool = False


def _get_loader(request: Request):
    return request.app.state.plugin_loader


def _get_installer(request: Request):
    return request.app.state.plugin_installer


@router.get("/")
async def list_plugins(request: Request):
    """List all installed plugins."""
    loader = _get_loader(request)
    return loader.list_plugins_full()


@router.post("/install")
async def install_plugin(
    req: InstallRequest,
    request: Request,
    _user=Depends(require_role(UserRole.OWNER)),
):
    """Install a plugin from a git URL. Owner only."""
    if not req.acknowledged_risk:
        raise HTTPException(400, RISK_WARNING)
    installer = _get_installer(request)
    loader = _get_loader(request)
    try:
        manifest = installer.install(req.url)
        loader.load_all()
        return {"status": "installed", "plugin": manifest}
    except Exception as e:
        raise HTTPException(400, str(e))


@router.post("/install/zip")
async def install_plugin_from_zip(
    request: Request,
    file: UploadFile = File(...),
    _user=Depends(require_role(UserRole.OWNER)),
):
    """Install a plugin from a ZIP file upload. Owner only."""
    if file.content_type and file.content_type not in (
        "application/zip",
        "application/x-zip-compressed",
        "application/octet-stream",
    ):
        raise HTTPException(400, "File must be a ZIP archive")

    content = await file.read()
    if len(content) > MAX_ZIP_SIZE:
        raise HTTPException(400, f"File exceeds maximum size of {MAX_ZIP_SIZE // (1024 * 1024)}MB")

    installer = _get_installer(request)
    loader = _get_loader(request)
    try:
        manifest = installer.install_from_zip(content)
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
