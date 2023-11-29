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

export async function syncNow(serverAPI: ServerAPI, appid: string, toast: boolean): Promise<string> {
    const start = new Date();
    setAppState("syncing", "true");
    let string = "nothing"

    //                                  appid is supposed to already be a string. It is not. Force it.
    await serverAPI.callPluginMethod("sync_now", { "appid": String(appid)}).then((response) => {
        if (response.success) {
            string = `Sync success: ${response.result}`;
        } else {
            string = `Sync failure: ${response.result}`;
        }
    }).catch((reason) => {
        string = `Failed to call plugin: ${reason}`;
    });
    setAppState("syncing", "false");
    if (toast) {
        const elapsed = (new Date().getTime()) - start.getTime();
        toastInfo(`Synced app ${appid} in ${elapsed}s`)
    }
    return string;
}