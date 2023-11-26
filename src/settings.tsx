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
    set: (key: any, value: any, immediate?: boolean) => void;
    get: (key: any, fallback: any) => Promise<any>;
    settings: any;
  };
  
  export const SettingsProvider: FC<{ serverApi: ServerAPI }> = ({ serverApi, children }) => {
    const [setting, setSetting] = useState<{key: any, value: any}>();
  
    const save = useMemo(() => async (setting: any) => {
      await serverApi.callPluginMethod('set_setting', setting);
    }, [serverApi]);
  
    const saveDb = useMemo(() => debounce(async (key, value) => {
      setSetting({ key, value });
    }, 1500), []);
  
    const set = useMemo(() => (key, value, immediate = false) => {
      if (immediate) {
        return setSetting({ key, value });
      }
      return saveDb(key, value);
    }, [saveDb]) as SettingsContextType['set'];
  
    const get: SettingsContextType['get'] = useMemo(() => async (key, fallback) => {
      return (await serverApi.callPluginMethod('get_setting', { key, default: fallback })).result;
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
    get(appid+".local", undefined).then((response) => {
      localDef = response;
    });
    let originDef;
    get(appid+".origin", undefined).then((response) => {
      originDef = response;
    });
    let userDef;
    get(appid+".user", undefined).then((response) => {
      userDef = response;
    });
    let passwordDef;
    get(appid+".password", undefined).then((response) => {
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
                  set(appid+".local", response.path)
                  setLocalDir(response.path);
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
                set(appid+".origin", e.target.value)
                setOrigin(e.target.value);
              }}
            />
          </PanelSectionRow>
          <PanelSectionRow>
            <TextField
              label="Git user"
              value={user}
              onChange={(e) => {
                set(appid+".user", e.target.value)
                setUser(e.target.value);
              }}
            />
          </PanelSectionRow>
          <PanelSectionRow>
            <TextField
              label="Git password/token"
              bIsPassword={true}
              value={password}
              onChange={(e) => {
                set(appid+".password", e.target.value)
                setPassword(e.target.value);
              }}
            />
          </PanelSectionRow>
        </PanelSection>
      </>
    );
  };