import {
  ButtonItem,
  definePlugin,
  LifetimeNotification,
  AppOverview,
  Marquee,
  showModal,
  ModalRoot,
  PanelSection,
  PanelSectionRow,
  Router,
  ServerAPI,
  staticClasses,
  ToggleField,
  DialogHeader,
} from "decky-frontend-lib";
import { VFC, useState, useEffect } from "react";
import { FaGitAlt } from "react-icons/fa";
import { debounce, throttle, wrap } from "lodash";
import logo from "../assets/logo.svg";

import * as config from "./config";
import appState, { setAppState, useAppState } from "./state";
import { syncNow } from "./git";
import { SettingsProvider, GameSettings } from "./settings";

interface FocusChangeEventObject {
  focusedApp: {
    appid: number,
    pid: number,
    strExeName: string,
    windowid: number
  };
}

const Content: VFC<{ serverAPI: ServerAPI }> = ({serverAPI}) => {
  const appState = useAppState();

  const [runningApp, setRunningApp] = useState<AppOverview | undefined>(Router.MainRunningApp);
  const [disableSync, setDisableSync] = useState<boolean>(false);

  const refresh = debounce(
    wrap(
      async () => {
        setRunningApp(Router.MainRunningApp);
      },
      (f) => {
        setDisableSync(true);
        return f().finally(() => setDisableSync(false));
      }
    ),
    config.RefreshWait,
    {leading: true, trailing: false}
  );

  useEffect(() => {
    let runningAppPid: number = 0;
    const { unregister } = SteamClient.System.UI.RegisterForFocusChangeEvents(
      throttle(async (fce: FocusChangeEventObject) => {
        if (
          runningAppPid === fce.focusedApp?.pid ||
          fce.focusedApp?.appid === Number(runningApp?.appid || 0)
        ) {
          return;
        }
        runningAppPid = fce.focusedApp?.pid;
        await refresh();
      }, config.FocusChangeEventWait)
    );
    refresh();
    return () => {
      unregister();
    };
  }, []);

  let bAppIsSteam = true;
  if (Router.MainRunningApp?.appid) {
    //Appid for steam client is undefined
    bAppIsSteam = false
  }

  let appid = Router.MainRunningApp?.appid || "0";

  const [syncDebug, setSyncDebug] = useState("Sync Now");

  return (
    <>
      <PanelSection title={"Sync" + (bAppIsSteam ? " (Unavailable)" : " (Available)")}>
        <Marquee>{(runningApp?.display_name || "Steam") + ` (${appid})`}</Marquee>
        <PanelSectionRow>
          <ToggleField
            label="Sync after closing a game"
            checked={appState.sync_on_game_exit === "true"}
            onChange={(e) => setAppState("sync_on_game_exit", e ? "true" : "false", true)}
          />
        </PanelSectionRow>
        <PanelSectionRow>
          <ToggleField
            disabled={appState.sync_on_game_exit != "true"}
            label="Toast after auto sync"
            checked={appState.toast_auto_sync === "true"}
            onChange={(e) => setAppState("toast_auto_sync", e ? "true" : "false", true)}
          />
        </PanelSectionRow>
        <PanelSectionRow>
          <ButtonItem
            layout="below"
            disabled={bAppIsSteam}
            onClick={() => {
              showModal((
                <ModalRoot>
                  <SettingsProvider serverApi={serverAPI} appid={appid}>
                    <DialogHeader>Git Sync Settings ({runningApp?.display_name})</DialogHeader>
                    <GameSettings serverAPI={serverAPI} setDisableSync={setDisableSync}/>
                  </SettingsProvider>
                </ModalRoot>
              ));
            }}>
              Configure Game
          </ButtonItem>
        </PanelSectionRow>
        <PanelSectionRow>
          <ButtonItem 
            layout="below"
            disabled={disableSync || bAppIsSteam || appState.syncing === "true"}
            onClick={() => {
              syncNow(serverAPI, appid, true).then((result) => {
                setSyncDebug(result);
              });
            }}>
              {syncDebug}
          </ButtonItem>
        </PanelSectionRow>
        <PanelSectionRow>
          <div style={{ display: "flex", justifyContent: "center" }}>
            <img src={logo} />
          </div>
        </PanelSectionRow>
      </PanelSection>
    </>
  );
};

export default definePlugin((serverApi: ServerAPI) => {
  appState.initialize(serverApi);

  const { unregister: removeGameExitListener } = 
  SteamClient.GameSessions.RegisterForAppLifetimeNotifications((e: LifetimeNotification) => {
    if (!e.bRunning && appState.currentState.sync_on_game_exit === "true") {
      syncNow(serverApi, String(e.unAppID), appState.currentState.toast_auto_sync === "true");
    }
  });

  return {
    title: <div className={staticClasses.Title}>Git Save</div>,
    content: <Content serverAPI={serverApi} />,
    icon: <FaGitAlt />,
    onDismount() {
      removeGameExitListener();
    },
  };
});
