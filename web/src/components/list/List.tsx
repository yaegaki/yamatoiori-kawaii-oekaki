import React, { Component } from "react";
import { Picture } from "../../models/Picture";

import './List.css';
import { SearchBox } from "./SearchBox";
import { RouteComponentProps } from "react-router";
import { Link } from "react-router-dom";
import { Loading } from "../common/Loading";

type ListState = {
    entries: Entry[];
    firstFetch: boolean,
    tag: string;
    pollingTag: string;
    mine: boolean;
    pollingVersion: number;
}

type Entry = {
    picture: Picture,
    new: boolean,
}

export class List extends Component<RouteComponentProps, ListState> {
    private timer: number = 0;
    private unmounted: boolean = false;

    constructor(props: RouteComponentProps) {
        super(props);

        this.onAllClick = this.onAllClick.bind(this);
        this.onMineClick = this.onMineClick.bind(this);

        this.onTagChange = this.onTagChange.bind(this);
        this.onSubmit = this.onSubmit.bind(this);

        const query = this.parseQueryString(this.props.history.location.search);
        const tag = query.get('t') || '';
        const author = query.get('a') || '';

        this.state = {
            entries: [],
            firstFetch: true,
            tag: tag,
            pollingTag: tag,
            mine: author === 'mine',
            pollingVersion: 0,
        };

        this.polling(this.state.pollingTag, this.state.mine, 0);
    }

    componentWillUnmount() {
        clearTimeout(this.timer);
        this.unmounted = true;
    }

    private async polling(tag: string, mine: boolean, pollingVersion: number) {
        try {
            let url = '/api/list';
            const params = new URLSearchParams();
            if (mine) {
                const author = localStorage.getItem('author');
                if (author === null) {
                    this.setState((prevState) => {
                        return {
                            ...prevState,
                            firstFetch: false,
                            entries: [],
                        };
                    });
                    return;
                }
                params.set('a', author);
            }
            else {
                if (tag !== '') {
                    params.set('t', tag);
                }
                if (this.state.entries.length > 0) {
                    params.set('r', this.state.entries[0].picture.id);
                }
            }
            const paramsStr = params.toString();
            if (paramsStr !== '') {
                const search = '?' + paramsStr;
                url = url + search;
            }
            console.log(`fetch:${url}`);


            const res = await fetch(url);
            if (res.ok) {
                const pictures: Picture[] = await res.json();
                if (this.unmounted || this.state.pollingVersion !== pollingVersion) return;

                this.setState((prevState) => {
                    let entries = [...pictures.map(p => {
                        return {
                            picture: p,
                            new: !prevState.firstFetch,
                        };
                    }), ...prevState.entries];

                    const maxEntries = 100;
                    if (entries.length > maxEntries) {
                        entries = entries.slice(0, maxEntries);
                    }

                    return {
                        ...prevState,
                        firstFetch: false,
                        entries,
                    };
                });
            }
        }
        finally
        {
            if (this.unmounted || this.state.pollingVersion !== pollingVersion || mine) return;
            this.timer = window.setTimeout(() => this.polling(tag, false, pollingVersion), 10000);
        }
    }

    render() {
        const mineClass = this.state.mine ? ' mine' : '';
        return <div className={`piclist${mineClass}`}>
            <nav className="piclist-tab">
                <button className={'piclist-tab-button' + (this.state.mine ? '' : ' active')} onClick={this.onAllClick}>すべて</button>
                <button className={'piclist-tab-button' + (this.state.mine ? ' active' : '')} onClick={this.onMineClick}>自分の投稿</button>
            </nav>
            <div className="tag-search">
                <SearchBox value={this.state.tag} placeholder="タグで検索" onChange={this.onTagChange} onSubmit={this.onSubmit}/>
            </div>
            <div className="picgrid">
                {this.state.firstFetch ? <Loading/> : this.renderPictureList() }
            </div>
        </div>;
    }

    componentDidUpdate(prevProps: RouteComponentProps, prevState: ListState) {
        if (prevProps.location.search === this.props.location.search) return;

        const query = this.parseQueryString(this.props.history.location.search);
        const tag = query.get('t') || '';
        const author = query.get('a') || '';

        this.setState(prev => {
            return {
                ...prev,
                mine: author === 'mine',
                tag,
            };
        }, () => this.startPolling());
    }

    private renderPictureList() {
        return this.state.entries.map(e => {
            const picLink = `/p/${e.picture.id}`;
            const tagLink = e.picture.tag === '' ? '/list' :  `/list?t=${e.picture.tag}`;
            const url = this.nameToURL(e.picture.name);
            const className = `picgrid-item${e.new ? ' new' : ''}`;
            return <div key={url} className={className}>
                <Link to={picLink}>
                    <img className="pic" src={url}/>
                </Link>
                <div className="info">
                    <div className="answer"><Link to={picLink}>{e.picture.answer}</Link></div>
                    <div className="tag"><Link to={tagLink}>#{e.picture.tag}</Link></div>
                </div>
            </div>;
        });
    }

    private onTagChange(value: string) {
        this.setState(prev => {
            return {
                ...prev,
                tag: value,
            };
        });
    }

    private onSubmit() {
        if (this.state.pollingTag === this.state.tag) return;

        this.setState(prev => {
            return {
                ...prev,
                pollingTag: prev.tag,
            };
        }, () => this.pushHistory());
    }

    private pushHistory() {
        let url = '/list';
        if (this.state.mine) {
            url += '?a=mine';
        }
        else {
            const tag = this.state.pollingTag;
            if (tag !== '') {
                url += '?t=' + tag;
            }
        }

        this.props.history.push(url);
    }

    private startPolling() {
        clearTimeout(this.timer);
        this.setState(prev => {
            const version = prev.pollingVersion + 1;
            return {
                ...prev,
                pollingTag: prev.tag,
                entries: [],
                firstFetch: true,
                pollingVersion: version > 100 ? 0 : version,
            };
        }, () => this.polling(this.state.pollingTag, this.state.mine, this.state.pollingVersion));
    }

    private onAllClick() {
        if (!this.state.mine) return;

        this.setState(prev => {
            return {
                ...prev,
                mine: false,
            };
        }, () => this.pushHistory());
    }

    private onMineClick() {
        if (this.state.mine) return;

        this.setState(prev => {
            return {
                ...prev,
                mine: true,
            };
        }, () => this.pushHistory());

    }

    private nameToURL(name: string) {
        return `https://storage.googleapis.com/yamatoiori-kawaii-oekaki.appspot.com/${name}`;
    }

    private parseQueryString(search: string): Map<string, string> {
        const result = new Map<string, any>();

        if (search.length < 2) return result;

        decodeURIComponent(search.substr(1)).split('&').forEach(x => {
            const temp = x.split('=');
            if (temp.length != 2) return;
            result.set(temp[0], temp[1]);
        });

        return result;
    }
}