import io
import json
import shutil
import subprocess
import tempfile
import zipfile
from pathlib import Path

MAX_ZIP_SIZE = 50 * 1024 * 1024  # 50MB


class PluginInstaller:
    def __init__(self, plugins_dir: str):
        self.plugins_dir = Path(plugins_dir)

    def install(self, git_url: str) -> dict:
        """Install a plugin from a git URL."""
        with tempfile.TemporaryDirectory() as tmpdir:
            result = subprocess.run(
                ["git", "clone", "--depth", "1", git_url, tmpdir],
                capture_output=True,
                text=True,
            )
            if result.returncode != 0:
                raise ValueError(f"git clone failed: {result.stderr}")

            manifest_path = Path(tmpdir) / "manifest.json"
            if not manifest_path.exists():
                raise ValueError("No manifest.json found in repository")

            manifest = json.loads(manifest_path.read_text())
            plugin_id = manifest["id"]

            if not (Path(tmpdir) / "plugin.py").exists():
                raise ValueError("No plugin.py found in repository")

            dest = self.plugins_dir / f"garrison-plugin-{plugin_id}"
            if dest.exists():
                shutil.rmtree(dest)

            dest.mkdir(parents=True)
            for item in Path(tmpdir).iterdir():
                if item.name == ".git":
                    continue
                if item.is_file():
                    shutil.copy2(item, dest)
                elif item.is_dir():
                    shutil.copytree(item, dest / item.name)

            return manifest

    def install_from_zip(self, zip_content: bytes) -> dict:
        """Install a plugin from a ZIP file upload."""
        if len(zip_content) > MAX_ZIP_SIZE:
            raise ValueError(
                f"ZIP file exceeds maximum size of "
                f"{MAX_ZIP_SIZE // (1024 * 1024)}MB"
            )

        try:
            zf = zipfile.ZipFile(io.BytesIO(zip_content))
        except zipfile.BadZipFile:
            raise ValueError("Uploaded file is not a valid ZIP archive")

        with zf:
            names = zf.namelist()

            # Check if files are nested in a single subdirectory
            prefix = ""
            if names and all(
                n.startswith(names[0].split("/")[0] + "/")
                for n in names
                if n
            ):
                prefix = names[0].split("/")[0] + "/"

            manifest_name = prefix + "manifest.json"
            plugin_name = prefix + "plugin.py"

            if manifest_name not in names:
                raise ValueError(
                    "ZIP must contain manifest.json at the root level"
                )
            if plugin_name not in names:
                raise ValueError(
                    "ZIP must contain plugin.py at the root level"
                )

            manifest = json.loads(zf.read(manifest_name))
            plugin_id = manifest.get("id")
            if not plugin_id:
                raise ValueError(
                    "manifest.json must contain an 'id' field"
                )

            with tempfile.TemporaryDirectory() as tmpdir:
                zf.extractall(tmpdir)

                source = (
                    Path(tmpdir) / prefix if prefix else Path(tmpdir)
                )
                dest = self.plugins_dir / f"garrison-plugin-{plugin_id}"
                if dest.exists():
                    shutil.rmtree(dest)

                dest.mkdir(parents=True)
                for item in source.iterdir():
                    if item.name.startswith("."):
                        continue
                    if item.is_file():
                        shutil.copy2(item, dest)
                    elif item.is_dir():
                        shutil.copytree(item, dest / item.name)

        return manifest

    def uninstall(self, plugin_id: str) -> bool:
        """Remove an installed plugin."""
        dest = self.plugins_dir / f"garrison-plugin-{plugin_id}"
        if dest.exists():
            shutil.rmtree(dest)
            return True
        return False

    def update(self, plugin_id: str) -> dict:
        """Update a plugin by re-cloning from its repo URL."""
        dest = self.plugins_dir / f"garrison-plugin-{plugin_id}"
        if not dest.exists():
            raise ValueError(f"Plugin '{plugin_id}' is not installed")
        manifest = json.loads((dest / "manifest.json").read_text())
        repo_url = manifest.get("repo")
        if not repo_url:
            raise ValueError("Plugin manifest has no repo URL")
        return self.install(repo_url)
