import { ServerAPI } from "decky-frontend-lib";
import { useEffect, useState } from "react";

type State = {
  syncing: string;
  sync_on_game_entry: string;
  sync_on_game_exit: string;
  toast_auto_sync: string;
};

class AppState {
  private _subscribers: { id: number; callback: (e: State) => void }[] = [];

  private _currentState: State = {
    syncing: "false",
    sync_on_game_entry: "true",
    sync_on_game_exit: "true",
    toast_auto_sync: "true"
  };

  private _serverApi: ServerAPI = null!;

  public get currentState() {
    return this._currentState;
  }

  public get serverApi() {
    return this._serverApi;
  }

  public async initialize(serverApi: ServerAPI) {
    this._serverApi = serverApi;

    await serverApi.callPluginMethod<{ key: string, defaults: string}, string>('get_config', 
        { "key": "sync_on_game_entry", "defaults": "true" }).then((response) => {
          if (response.success) {
            this.setState("sync_on_game_entry", response.result);
          }
        });
    
    await serverApi.callPluginMethod<{ key: string, defaults: string}, string>('get_config', 
        { "key": "sync_on_game_exit", "defaults": "true" }).then((response) => {
          if (response.success) {
            this.setState("sync_on_game_exit", response.result);
          }
        });

    await serverApi.callPluginMethod<{ key: string, defaults: string}, string>('get_config', 
        { "key": "toast_auto_sync", "defaults": "true" }).then((response) => {
          if (response.success) {
            this.setState("toast_auto_sync", response.result);
          }
        });
  }

  public setState = (key: keyof State, value: string, persist = false) => {
    this._currentState = { ...this.currentState, [key]: value };
    console.log(key, value, persist);

    if (persist) {
      this.serverApi.callPluginMethod<{ key: string; value: string }, null>("set_config",
          { key, value }).then(e => console.log(e));
    }

    this._subscribers.forEach((e) => e.callback(this.currentState));
  };

  public subscribe = (callback: (e: State) => void) => {
    const id = new Date().getTime();
    this._subscribers.push({ id, callback });

    return id;
  };

  public unsubscribe = (id: number) => {
    const index = this._subscribers.findIndex((f) => f.id === id);
    if (index > -1) {
      this._subscribers.splice(index, 1);
    }
  };

}

const appState = new AppState();
export default appState;

export const useAppState = () => {
  const [state, setState] = useState<State>(appState.currentState);

  useEffect(() => {
    const id = appState.subscribe((e) => {
      console.log("Rendering:", e);
      setState(e);
    });
    return () => {
      appState.unsubscribe(id);
    };
  }, []);

  return state;
};

export const setAppState = appState.setState;
export const getServerApi = () => appState.serverApi;