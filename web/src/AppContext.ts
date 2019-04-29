import React from "react";

export type AppContextValue = {
    topBarVisible: boolean;
    setTopBarVisibility: (visible: boolean) => void;
}

export const AppContext = React.createContext<AppContextValue>({
    topBarVisible: true,
    setTopBarVisibility(visible: boolean) {
    },
});