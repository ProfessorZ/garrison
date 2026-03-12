import json
import shutil
import subprocess
import tempfile
from pathlib import Path


class PluginInstaller:
    def __init__(self, plugins_dir: str):
        self.plugins_dir = Path(plugins_dir)

    def install(self, git_url: str) -> dict:
        """Install a plugin from a git URL."""
        with tempfile.TemporaryDirectory() as tmpdir:
            subprocess.run(
                ["git", "clone", "--depth", "1", git_url, tmpdir],
                check=True,
                capture_output=True,
                text=True,
            )

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
