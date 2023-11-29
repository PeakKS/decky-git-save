import {
    useState,
    createContext,
    FC,
    VFC,
    useEffect,
    useContext,
    useMemo,
  } from 'react';
  import { 
    ServerAPI,
    PanelSection,
    PanelSectionRow,
    ButtonItem,
    TextField,
  } from 'decky-frontend-lib';
  import { debounce } from 'lodash';

  export const SettingsContext = createContext({});
  
  type SettingsContextType = {
    set: (key: any, value: any, immediate?: boolean) => void;
    get: (key: any, fallback: any) => Promise<any>;
    settings: any;
  };
  
  export const SettingsProvider: FC<{ serverApi: ServerAPI, appid: string }> = ({ serverApi, appid, children }) => {
    const [setting, setSetting] = useState<{key: any, value: any}>();
  
    const save = useMemo(() => async (setting: any) => {
      await serverApi.callPluginMethod('async_set_app_setting',
        { "appid": String(appid), "key": setting.key, "value": setting.value });
    }, [serverApi]);
  
    const saveDb = useMemo(() => debounce(async (key, value) => {
      setSetting({ key, value });
    }, 500), []);
  
    const set = useMemo(() => (key, value, immediate = false) => {
      if (immediate) {
        return setSetting({ key, value });
      }
      return saveDb(key, value);
    }, [saveDb]) as SettingsContextType['set'];
  
    const get: SettingsContextType['get'] = useMemo(() => async (key, fallback) => {
      return (await serverApi.callPluginMethod('async_get_app_setting', 
        { "appid": String(appid), "key": key, "defaults": fallback })).result;
    }, [serverApi]);
  
    useEffect(() => {
      if (setting) {
        save(setting);
      }
    }, [save, setting]);
  
    return (
      <SettingsContext.Provider value={{ set, get }}>
        {children}
      </SettingsContext.Provider>
    );
  };
  
  export const useSettings = () => useContext(SettingsContext) as SettingsContextType;
  
  export default useSettings;

  export const GameSettings: VFC<{ serverAPI: ServerAPI, setDisableSync: Function}> = ({ serverAPI, setDisableSync }) => {
    const { set, get } = useSettings();

    const [localDir, setLocalDir] = useState<string>("");
    const [origin, setOrigin] = useState<string>("");
    const [user, setUser] = useState<string>("");
    const [password, setPassword] = useState<string>("");

    useEffect(() => {
      if (localDir && origin && user && password) {
        setDisableSync(false);
      } else {
        setDisableSync(true);
      }
    }, [localDir, origin, user, password]);

    //Only read config on initial load
    useEffect(() => {
      (async () => {
        const localDirRead = await get("local", "");
        const originRead = await get("origin", "");
        const userRead = await get("user", "");
        const passRead = await get("password", "");
        setLocalDir(localDirRead);
        setOrigin(originRead);
        setUser(userRead);
        setPassword(passRead);
      })();
    }, [get]);

    return (
      <>
        <PanelSection>
          <PanelSectionRow>
            <ButtonItem 
              layout="below"
              label="Save file directory"
              onClick={() => {
                serverAPI.openFilePicker(localDir || "/home/deck").then((response) => {
                  setLocalDir(response.path);
                  set("local", response.path);
                });
              }
            }>
              {localDir}
            </ButtonItem>
          </PanelSectionRow>
          <PanelSectionRow>
            <TextField
              label="Remote git URL"
              mustBeURL={true}
              value={origin}
              onChange={(e) => {
                setOrigin(e.target.value);
                set("origin", e.target.value)
              }}
            />
          </PanelSectionRow>
          <PanelSectionRow>
            <TextField
              label="Git user"
              value={user}
              onChange={(e) => {
                setUser(e.target.value);
                set("user", e.target.value)
              }}
            />
          </PanelSectionRow>
          <PanelSectionRow>
            <TextField
              label="Git password/token"
              bIsPassword={true}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                set("password", e.target.value)
              }}
            />
          </PanelSectionRow>
        </PanelSection>
      </>
    );
  };