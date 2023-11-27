import { getServerApi, setAppState } from "./state";
import { ServerAPI } from "decky-frontend-lib";
import { FaGitAlt } from "react-icons/fa";

const toastInfo = (msg: string) => {
    getServerApi().toaster.toast({
        title: "Git Sync",
        body: msg,
        critical: true,
        duration: 5000,
        icon: <FaGitAlt />
      });
};

export async function syncNow(serverAPI: ServerAPI, appid: number, toast: boolean): Promise<string> {
    const start = new Date();
    let sAppId = String(appid);
    toastInfo(`Syncing app ${sAppId}`)
    setAppState("syncing", "true");
    let string = "nothing"
    await serverAPI.callPluginMethod("sync_now", { "appid": sAppId}).then((response) => {
        if (response.success) {
            string = `Sync success: ${response.result}`;
        } else {
            string = `Sync failure: ${response.result}`;
        }
    }).catch((reason) => {
        string = `Failed to call plugin: ${reason}`;
    });
    setAppState("syncing", "false");
    return string;
}