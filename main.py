import logging, os, sys
import subprocess
from datetime import datetime

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

class Plugin:
    current_sync = None

    async def sync_now(self, appid):
        logger.debug(f'[APP {appid}]: SYNCING')
        local    = self.get_app_setting(self, appid, 'local',    '')
        origin   = self.get_app_setting(self, appid, 'origin',   '')
        user     = self.get_app_setting(self, appid, 'user',     '')
        password = self.get_app_setting(self, appid, 'password', '')

        if local == '' or origin == '' or user == '' or password == '':
            logger.debug(f'[APP {appid}]: Sync skipped (missing value)')
            return "skipped"

        # Format username+password origin URL
        remote_protocol = origin.split("://", 1)[0]
        remote_url = origin.split("://", 1)[1]
        remote = f'{remote_protocol}://{user}:{password}@{remote_url}'

        logger.debug(
            f'''[APP {appid}]: SYNC
            \tlocal: {local} 
            \torigin: {origin} 
            \tuser: {user} 
            \tpassword: {password}'''
        )

        # Error if local path is not suitable
        if not (os.path.isdir(local) and os.access(local, os.R_OK) and os.access(local, os.W_OK)):
            logger.error(f'[APP {appid}]: SYNC FAILED: BAD LOCAL PATH')
            raise Exception(f'Bad local path "{local}"')

        # Init repo
        try:
            error = subprocess.check_output(["git", "-C", local, "init"])
        except Exception as e:
            logger.error(e)
            raise e

        # Add remote
        try:
            subprocess.check_output(["git", "-C", local, "remote", "add", "decky-git-sync", remote])       
        except subprocess.CalledProcessError as e:
            # Remote already exists, try removing first
            if e.returncode == 3:
                try:
                    subprocess.check_output(["git", "-C", local, "remote", "remove", "decky-git-sync"])
                except subprocess.CalledProcessError as e:
                    logger.error(e.output)
                    raise e
                except Exception as e:
                    logger.error(e)
                    raise e
                finally:
                    subprocess.check_output(["git", "-C", local, "remote", "add", "decky-git-sync", remote])
            else:
                logger.error(e)
                raise e
        except Exception as e:
            logger.error(e)
            raise e
            
        # Attempt pull
        try:
            subprocess.check_output(["git", "-C", local, "pull", "decky-git-sync", "master"])
        except subprocess.CalledProcessError as e:
            if "fatal: couldn't find remote ref master" in e.output.decode("utf-8"):
                logger.info("Remote missing master, ignoring and pushing")
        except Exception as e:
            logger.error(e)
            raise e
        
        # Add Everything
        try:
            subprocess.check_output(["git", "-C", local, "add", "-A"])
        except Exception as e:
            logger.error(e)
            raise e
        
        # Commit changes
        try:
            subprocess.check_output(["git", "-C", local,
                                     "-c", "user.name='deck'",
                                     "-c", "user.email='steamdeck@steampowered.com'",
                                     "commit", "-m", "Git Sync"])
        except subprocess.CalledProcessError as e:
            # No changes to commit, ignore
            if "nothing to commit" in e.output.decode("utf-8"):
                logger.debug(f'[APP {appid}]: Sync skipped (no commits)')
                pass
            else:
                raise e
        except Exception as e:
            logger.error(e)
            raise e
            
        # Push commits
        try:
            subprocess.check_output(["git", "-C", local, "push", "decky-git-sync", "master"])
        except Exception as e:
            logger.error(e)
            raise e

        logger.debug(f'[APP {appid}]: SYNC FINISHED')
        return "succeeded"

    def set_app_setting(self, appid: str, key: str, value):
        app_settings = settings.getSetting(appid, {})
        app_settings[key] = value
        settings.setSetting(appid, app_settings)
        logger.debug(f'[APP {appid}]: SET "{key}": "{value}"')

    def get_app_setting(self, appid: str, key: str, defaults):
        app_settings = settings.getSetting(appid)
        if app_settings == None:
            logger.debug(f'[APP {appid}]: GET "{key}": {defaults} (DEFAULT NO APP SETTINGS)"')
            return defaults
        
        ret = app_settings.get(key)
        if ret == None:
            logger.debug(f'[APP {appid}]: GET "{key}": {defaults} (DEFAULT NO APP KEY)"')
            return defaults
        
        logger.debug(f'[APP {appid}]: GET "{key}": {ret}"')
        return ret
    
    async def async_set_app_setting(self, appid, key, value):
        self.set_app_setting(self, appid, key, value)
    
    async def async_get_app_setting(self, appid, key, defaults):
        return self.get_app_setting(self, appid, key, defaults)

    # Asyncio-compatible long-running code, executed in a task when the plugin is loaded
    async def _main(self):
        logger.info("Initializing...")
        for appid in settings.settings:
            logger.debug(f'[APP {appid}]: READ {settings.settings[appid]}')
        logger.info("Initialization finished.")

    # Function called first during the unload process, utilize this to handle your plugin being removed
    async def _unload(self):
        logger.info("Goodbye World!")
        pass