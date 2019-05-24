import React, { Component } from 'react';
import { Switch, BrowserRouter, Route } from 'react-router-dom';
import './App.css';
import { TopBar } from './components/topbar/TopBar';
import { library } from '@fortawesome/fontawesome-svg-core';
import { faHome, faPen, faBars, faEraser, faImage, faRedo, faUndo, faSearch, faBomb, faCircleNotch, faCalendarAlt } from "@fortawesome/free-solid-svg-icons";
import { Paint } from './components/paint/Paint';
import { List } from './components/list/List';
import { AppContext, AppContextValue } from './AppContext';
import ReactModal from 'react-modal';
import { Picture } from './components/picture/Picture';
import { Home } from './components/home/Home';
import { History } from './components/history/History';
import { Article } from './components/history/Article';

library.add(faHome, faImage, faSearch, faPen, faEraser, faBars, faRedo, faUndo, faBomb, faCircleNotch, faCalendarAlt);
ReactModal.setAppElement('#root');

type AppState = {
    appContextValue: AppContextValue;
}

class App extends Component<{}, AppState> {
    constructor(props: {}) {
        super(props);
        this.state = {
            appContextValue: {
                topBarVisible: true,
                setTopBarVisibility: this.setTopBarVisibility.bind(this),
            }
        };
    }

    render() {
        const appClassName = `App expand-height ${this.state.appContextValue.topBarVisible ? 'topbar-visible' : 'topbar-hidden'}`;
        return (
            <AppContext.Provider value={this.state.appContextValue}>
                <div className={appClassName}>
                    <BrowserRouter>
                        <Route path="/" component={TopBar} />
                        <section className="content-container expand-height">
                            <Switch>
                                <Route path="/" exact={true} component={Home} />
                                <Route path="/paint" exact={true} component={Paint} />
                                <Route path="/list" exact={true} component={List} />
                                <Route path="/history" exact={true} component={History} />
                                <Route path="/history/:id" exact={true} component={Article} />
                                <Route path="/p/:id" exact={true} component={Picture} />
                                <Route path="/" render={() => {
                                    return <div>not found.</div>;
                                }}></Route>
                            </Switch>
                        </section>
                    </BrowserRouter>
                </div>
            </AppContext.Provider>
        );
    }

    private setTopBarVisibility(visibility: boolean) {
        this.setState(prev => {
            return {
                ...prev,
                appContextValue: {
                    ...prev.appContextValue,
                    topBarVisible: visibility,
                },
            };
        }, () => window.dispatchEvent(new Event('resize')));
    }
}

export default App;
