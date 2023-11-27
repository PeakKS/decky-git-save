import logging, os, sys
import subprocess
import asyncio

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
        try:
            logger.debug(f'Syncing appid {appid} ({type(appid)}) now in {self} ({type(self)})')
            local    = self.get_app_setting(self, appid, 'local',    'undefined')
            origin   = self.get_app_setting(self, appid, 'origin',   'undefined')
            user     = self.get_app_setting(self, appid, 'user',     'undefined')
            password = self.get_app_setting(self, appid, 'password', 'undefined')

            logger.debug(f'local: {local} origin: {origin} user: {user} password: {password}')
            return f'local: {local} origin: {origin} user: {user} password: {password}'
        except Exception as e:
            return f'Uh oh: {e}'

    def set_app_setting(self, appid: str, key: str, value):
        logger.debug(f'SET App: {appid} setting {value} for key {key}')
        settings.settings[appid][key] = value
        settings.setSetting("balls", "suck")

    def get_app_setting(self, appid: str, key: str, defaults):
        logger.debug(f'GET App: {appid} getting key {key}')
        app_settings = settings.settings.get(appid)
        if app_settings == None:
            logger.debug(f'GET App: {appid} no value for key {key}. Returning default {defaults}')
            return defaults
        
        setting = app_settings.get(key, defaults)
        logger.debug(f'GET App: {appid} got {setting} for key {key}')
        return setting
    
    async def async_set_app_setting(self, appid: str, key: str, value):
        self.set_app_setting(self, appid, key, value)
    
    async def async_get_app_setting(self, appid: str, key: str, defaults):
        return self.get_app_setting(self, appid, key, defaults)

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
