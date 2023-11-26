import { sleep } from "decky-frontend-lib";
import { getServerApi, setAppState } from "./state";
import { FaGitAlt } from "react-icons/fa";

const toastInfo = (msg: string) => {
    getServerApi().toaster.toast({
        title: "Git Save",
        body: msg,
        critical: true,
        duration: 5000,
        icon: <FaGitAlt />
      });
};

export interface AppGitConfig {
  local: string,
  origin: string,
  user: string,
  password: string
}

export async function getGitConfig(appid: number): Promise<AppGitConfig> {
    let config: AppGitConfig = {
        local: String(appid),
        origin: String(appid),
        user: String(appid),
        password: String(appid)
    };
    return new Promise<AppGitConfig>((resolve, reject) => {
        resolve(config);
    });
}

export async function syncNow(appid: number, toast: boolean): Promise<void> {
    const start = new Date();
    toastInfo(`Starting sync for app ${appid}`);
    setAppState("syncing", "true");
    await getServerApi().callPluginMethod("sync_now", appid);
    let exitCode = 0;
    while (true) {
        const status = await getServerApi().callPluginMethod<{}, number | undefined>("sync_now_probe", {});
        if (status.success && status.result != null) {
            exitCode = status.result;
            break;
        }
        await sleep(360);
    }

    let pass;
    switch (exitCode) {
        case 0:
            pass = true;
            break;
        default:
            pass = false;
            break;
    }
    setAppState("syncing", "false");

    let body;
    if (pass) {
        body = `Git sync completed in ${(new Date().getTime() - start.getTime()) / 1000}s`
    } else {
        body = `Git sync failed (${exitCode}). Run journalctl -u plugin_loader.service to see the errors.`
    }

    toastInfo(body);
}