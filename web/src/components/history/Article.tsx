import React, { Component } from "react";
import { Link, RouteComponentProps } from "react-router-dom";
import { Entry } from "./History";
import { OekakiResultView } from "./OekakiResultView";
import { Loading } from "../common/Loading";
import { NotFound } from "../common/NotFound";
import { YoutubeEkakiutaLive } from "../../models/Ekakiuta";
import { EkakiutaView } from "./EkakiutaView";
import { getYoutubeVideoLink } from "../../helpers/youtube";
import { VideoItem } from "../common/VideoItem";

// import './Home.css';

type ArticleState = {
    loading: boolean;
    notFound: boolean;
    info?: YoutubeEkakiutaLive;
}



export class Article extends Component<RouteComponentProps, ArticleState> {
    private unmounted: boolean = false;
    private baseURL: string;

    constructor(props: RouteComponentProps) {
        super(props);

        const params: any = props.match.params;
        const id: string | undefined = params['id'];
        if (id === undefined) {
            this.baseURL = '';
            this.state = {
                loading: false,
                notFound: true,
            };
            return;
        }

        this.state = {
            loading: true,
            notFound: false,
        };

        this.baseURL = `/history/${id}/`;

        this.fetchInfo(id);
    }

    render() {
        if (this.state.loading) {
            return <Loading/>;
        }
        else if (this.state.notFound || this.state.info === undefined) {
            return <NotFound/>;
        }

        const info = this.state.info;

        return <div className="common-content-body">
            <h2>動画情報</h2>
            <VideoItem id={info.id} title={info.title}>
                {info.desc ? <p>{info.desc}</p> : ''}
            </VideoItem>
            {info.entries.map((entry, i) => {
                const file = `${this.baseURL}${i+1}.svg`;
                return <div key={i}>
                    <h2>第{i+1}問</h2>
                    <a href={getYoutubeVideoLink(info.id, this.timeStrToSec(entry.time) * 1000)} target="_blank">{entry.time}～</a>
                    <EkakiutaView ekakiuta={entry.ekakiuta} file={file}/>
                </div>
            })}
        </div>;
    }

    componentWillUnmount() {
        this.unmounted = true;
    }

    private async fetchInfo(id: string) {
        try {
            const res = await fetch(`${this.baseURL}info.json`);
            const info: YoutubeEkakiutaLive = await res.json();
            if (this.unmounted) return;
            this.setState(() => {
                return {
                    loading: false,
                    notFound: false,
                    info,
                }
            });
        }
        catch {
            this.setState(() => {
                return { loading: false, notFound: true };
            });
        }
    }

    private timeStrToSec(timeStr: string): number {
        const xs = timeStr.split(':');
        let base = 1;
        let result = 0;
        for (let i = xs.length - 1; i >= 0; i--) {
            result += Number(xs[i]) * base;
            base *= 60;
        }

        return result;
    }
}
