import { createContext, useReducer, FC, ReactNode } from 'react';

interface IState {
  status: number;
  flag: boolean;
  sideBarShow: boolean;
  infoId: number;
}

type Action = {
  type: string;
  [key: string]: any;
};

const initialState: IState = {
  flag: false,
  sideBarShow: false,
  infoId: -1,
  status: -1,
};

const PluginContext = createContext<{
  data: IState;
  dispatch: any;
}>({
  data: initialState,
  dispatch: () => {},
});

const pluginReducer = (state: IState, action: Action): IState => {
  switch (action.type) {
    case 'setFlag': {
      return {
        ...state,
        flag: action?.flag,
      };
    }
    case 'setSideBarShow': {
      return {
        ...state,
        sideBarShow: action?.sideBarShow,
      };
    }
    case 'setStatus': {
      return {
        ...state,
        status: action?.status,
      };
    }
    case 'setInfoId': {
      return {
        ...state,
        infoId: action?.infoId,
      };
    }
    default: {
      throw Error('Unknown action: ' + action.type);
    }
  }
};

const PluginProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [data, dispatch] = useReducer(pluginReducer, initialState);
  return (
    <PluginContext.Provider value={{ data, dispatch }}>
      {children}
    </PluginContext.Provider>
  );
};

export { PluginProvider, PluginContext };
