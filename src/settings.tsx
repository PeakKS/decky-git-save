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
    TextField
  } from 'decky-frontend-lib';
  import { debounce } from 'lodash';
    
  export const SettingsContext = createContext({});
  
  type SettingsContextType = {
    set: (appid: any, key: any, value: any, immediate?: boolean) => void;
    get: (appid: any, key: any, fallback: any) => Promise<any>;
    settings: any;
  };
  
  export const SettingsProvider: FC<{ serverApi: ServerAPI }> = ({ serverApi, children }) => {
    const [setting, setSetting] = useState<{appid: any, key: any, value: any}>();
  
    const save = useMemo(() => async (setting: any) => {
      await serverApi.callPluginMethod('async_set_app_setting', setting);
    }, [serverApi]);
  
    const saveDb = useMemo(() => debounce(async (appid, key, value) => {
      setSetting({ appid, key, value });
    }, 1500), []);
  
    const set = useMemo(() => (appid, key, value, immediate = false) => {
      if (immediate) {
        return setSetting({ appid, key, value });
      }
      return saveDb(appid, key, value);
    }, [saveDb]) as SettingsContextType['set'];
  
    const get: SettingsContextType['get'] = useMemo(() => async (appid, key, fallback) => {
      return (await serverApi.callPluginMethod('async_get_app_setting', 
        { "appid": appid, "key": key, "defaults": fallback })).result;
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

  export const GameSettings: VFC<{ serverAPI: ServerAPI, appid: string}> = ({serverAPI},{appid}) => {
    const { set, get } = useSettings();
    let localDef;
    get(appid, "local", undefined).then((response) => {
      localDef = response;
    });
    let originDef;
    get(appid, "origin", undefined).then((response) => {
      originDef = response;
    });
    let userDef;
    get(appid, "user", undefined).then((response) => {
      userDef = response;
    });
    let passwordDef;
    get(appid, "password", undefined).then((response) => {
      passwordDef = response;
    });
    const [localDir, setLocalDir] = useState<string | undefined>(localDef);
    const [origin, setOrigin] = useState<string | undefined>(originDef);
    const [user, setUser] = useState<string | undefined>(userDef);
    const [password, setPassword] = useState<string | undefined>(passwordDef);

    return (
      <>
        <PanelSection>
          <PanelSectionRow>
            <ButtonItem 
              layout="below"
              label="Save file directory"
              onClick={() => {
                serverAPI.openFilePicker("/home/deck").then((response) => {
                  set(appid, "local", response.path)
                  setLocalDir(response.path);
                });
              }
            }>
              {localDir ? localDir : localDef}
            </ButtonItem>
          </PanelSectionRow>
          <PanelSectionRow>
            <TextField
              label="Remote git URL"
              mustBeURL={true}
              value={origin ? origin : originDef}
              onChange={(e) => {
                set(appid, "origin", e.target.value)
                setOrigin(e.target.value);
              }}
            />
          </PanelSectionRow>
          <PanelSectionRow>
            <TextField
              label="Git user"
              value={user ? user : userDef}
              onChange={(e) => {
                set(appid, "user", e.target.value)
                setUser(e.target.value);
              }}
            />
          </PanelSectionRow>
          <PanelSectionRow>
            <TextField
              label="Git password/token"
              bIsPassword={true}
              value={password ? password : passwordDef}
              onChange={(e) => {
                set(appid, "password", e.target.value)
                setPassword(e.target.value);
              }}
            />
          </PanelSectionRow>
        </PanelSection>
      </>
    );
  };