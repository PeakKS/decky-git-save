import logging, os
import subprocess
import asyncio
from GitPython import git

# The decky plugin module is located at decky-loader/plugin
# For easy intellisense checkout the decky-loader code one directory up
# or add the `decky-loader/plugin` path to `python.analysis.extraPaths` in `.vscode/settings.json`
import decky_plugin

from settings import SettingsManager
settingsDir = os.environ["DECKY_PLUGIN_SETTINGS_DIR"]
logger = decky_plugin.logger

logger.setLevel(logging.DEBUG)
logger.info('Git Sync settings path: {}'.format(os.path.join(settingsDir, 'settings.json')))
settings = SettingsManager(name="settings", settings_directory=settingsDir)
settings.read()

git_bin = "/usr/bin/git"

class Plugin:
    current_sync = None

    async def sync_now(self, appid):
        logger.debug(f'Syncing appid {appid} now')

        local = self.get_setting(f'{appid}.local')
        origin = self.get_setting(f'{appid}.origin')
        user = self.get_setting(f'{appid}.user')
        password = self.get_setting(f'{appid}.password')

        (rc, out) = self.git_exec(appid, *["init"])
        if rc != 0:
            logger.error("Failed to init git repo:\n"+out)
            return -1
        
        (rc, out) = self.git_exec(appid, *["remote", "add", "origin", origin])
        if rc != 0:
            logger.error("Failed to init git repo:\n"+out)
            return -2

        (rc, out) = self.git_exec(appid, *["add", "-A"])
        if rc != 0:
            logger.error("Failed to add files to git repo:\n"+out)
            return -3
        
        (rc, out) = self.git_exec(appid, *["commit", "-m", "\"Steam Deck Sync\""])
        if rc != 0:
            logger.error("Failed to commit git changes:\n"+out)
            return -4
        
    async def sync_now_probe(self):
        logger.debug(f'Probing sync')
        if not self.current_sync:
            return 0
                
        logger.debug(f'Sync finished')
        return self.current_sync.returncode
    
    def git_exec(self, appid, command):
        app_local_dir = self.get_setting(f'{appid}.local')
        output = subprocess.run(*["-C", app_local_dir, command], stdout=subprocess.PIPE)
        return (output.returncode, output.stdout.decode('utf-8'))
    
    async def git_exec_async(self, appid, command):
        app_local_dir = self.get_setting(f'{appid}.local')
        self.current_sync = asyncio.subprocess.run(*["-C", app_local_dir, command], stdout=subprocess.PIPE)

    async def settings_read(self):
        return settings.read()
    
    async def settings_commit(self):
        return settings.commit()

    async def set_setting(self, key: str, value):
        return settings.setSetting(key, value)

    async def get_setting(self, key: str, defaults):
        return settings.getSetting(key, defaults)

    # Asyncio-compatible long-running code, executed in a task when the plugin is loaded
    async def _main(self):
        decky_plugin.logger.info("Hello World!")

    # Function called first during the unload process, utilize this to handle your plugin being removed
    async def _unload(self):
        decky_plugin.logger.info("Goodbye World!")
        pass

    # Migrations that should be performed before entering `_main()`.
    async def _migration(self):
        decky_plugin.logger.info("Migrating")
        # Here's a migration example for logs:
        # - `~/.config/decky-template/template.log` will be migrated to `decky_plugin.DECKY_PLUGIN_LOG_DIR/template.log`
        decky_plugin.migrate_logs(os.path.join(decky_plugin.DECKY_USER_HOME,
                                               ".config", "decky-template", "template.log"))
        # Here's a migration example for settings:
        # - `~/homebrew/settings/template.json` is migrated to `decky_plugin.DECKY_PLUGIN_SETTINGS_DIR/template.json`
        # - `~/.config/decky-template/` all files and directories under this root are migrated to `decky_plugin.DECKY_PLUGIN_SETTINGS_DIR/`
        decky_plugin.migrate_settings(
            os.path.join(decky_plugin.DECKY_HOME, "settings", "template.json"),
            os.path.join(decky_plugin.DECKY_USER_HOME, ".config", "decky-template"))
        # Here's a migration example for runtime data:
        # - `~/homebrew/template/` all files and directories under this root are migrated to `decky_plugin.DECKY_PLUGIN_RUNTIME_DIR/`
        # - `~/.local/share/decky-template/` all files and directories under this root are migrated to `decky_plugin.DECKY_PLUGIN_RUNTIME_DIR/`
        decky_plugin.migrate_runtime(
            os.path.join(decky_plugin.DECKY_HOME, "template"),
            os.path.join(decky_plugin.DECKY_USER_HOME, ".local", "share", "decky-template"))
