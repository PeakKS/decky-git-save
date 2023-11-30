import { getServerApi, setAppState } from "./state";
import { ServerAPI } from "decky-frontend-lib";
import { FaGitAlt } from "react-icons/fa";

const toastInfo = (msg: string) => {
    getServerApi().toaster.toast({
        title: "Git Sync",
        body: msg,
        duration: 5000,
        icon: <FaGitAlt />
      });
};

const toastError = (msg: string) => {
    getServerApi().toaster.toast({
        title: "Git Sync Error",
        body: msg,
        duration: 5000,
        critical: true,
        icon: <FaGitAlt />
      });
};

export async function syncNow(serverAPI: ServerAPI, appid: string, toast: boolean, toastSkips: boolean): Promise<string> {
    const start = new Date();
    setAppState("syncing", "true");
    let string = "nothing"

    //                                  appid is supposed to already be a string. It is not. Force it.
    await serverAPI.callPluginMethod<{appid: string}, string>("sync_now", { "appid": String(appid)}).then((response) => {
        if (response.success) {
            string = `Sync ${response.result}`;
            if (toast) {
                if (response.result == "succeeded") {
                    toastInfo(`Synced app ${appid} in ${((new Date().getTime()) - start.getTime())/1000}s`)
                } else if ((response.result == "skipped")) {
                    if (toastSkips) {
                        toastInfo(`Skipped sync app ${appid} ${response.result}`)
                    }
                } else {
                    toastInfo(`Sync app ${appid} error: ${response.result}`)
                }
            }
        } else {
            string = `Sync failure: ${response.result}`;
            toastError(`Sync failed for app ${appid}`);
        }
    }).catch((reason) => {
        string = `Sync failed to call plugin: ${reason}`;
        toastError(`Failed to call plugin: ${reason}`);
    });
    setAppState("syncing", "false");
    return string;
}