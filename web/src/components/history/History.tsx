import React, { Component } from "react";
import { Link } from "react-router-dom";
import { getYoutubeVideoLink, getThumbnailLink } from "../../helpers/youtube";
import { VideoItem } from "../common/VideoItem";
import { Ekakiuta } from "../../models/Ekakiuta";
import { EkakiutaView } from "./EkakiutaView";

// import './Home.css';

export type Entry = {
    id: string,
    title: string,
    date: string,
    desc?: string,
}

const youtubeEntries: Entry[] = [{
    id: 'GO4_NJLVNfk',
    title: '【絵描き歌】一緒に描いてあてってね！【アイドル部】',
    date: '2018/11/28',
    desc: '記念すべき第1回配信。',
}, {
    id: 'yh7CLv2IEh4',
    title: '【絵描き歌】イオリが歌うから当ててね！',
    date: '2018/12/24',
    desc: '第2回配信。前回に比べて難易度低め、結構簡単(イオリン比)',
}, {
    id: 'MM0QIjqHeiY',
    title: '【絵描き歌】イオリがうたうから書いてね！！',
    date: '2019/01/31',
    desc: '第3回配信。当たるかどうかは想像力の問題。イオリンが言ったとおりに描けば絶対に当たるからあきらめないで自信を持つ。',
}, {
    id: 'k7C_dRsdwVQ',
    title: '【絵描き歌】新曲仕入れました！！！イオリが歌うから書いてね！！',
    date: '2018/04/03',
    desc: '第4回配信。絵描き歌を事前に録音しておくことで一回目と二回目で差がなくなった。ハッピーターンと三角チョコパイが来ると動物だとわかるようになってしまった。',
}];

const virtualsan: Ekakiuta = {
    answer: '寝床を襲ってくるお化け',
    lyrics: [
        'ぶんぶんぶん、絵を描くよ\nそこには大きな四角い石があるんだよ、石がある\nそしたらその石の中にもう一個中くらいの石がある\nそしたらその石の上から何か棒が二本、生えてきた\nその棒の上にまあるいボールが乗っかった、ボールが乗る\nそしたらその中の石の下からハッピーターンの半分こ\n二個ついたら次は石の上からハッピーターンの半分こが二個つくよー\n(もうすぐ終わるよ)\nそしたら中の石の右下から雫垂れてきた\nその雫の中にUが二つ付いたらね、顔を付ける',
    ],
};

export class History extends Component {
    render() {
        return <div className="common-content-body">
            {this.renderAbout()}
            {this.renderYoutubeEntries()}
            {this.renderOtherEntries()}
        </div>;
    }

    private renderAbout() {
        return <section>
            <h2>過去の絵描き歌</h2>
            <p>
                このページでは過去の絵描き歌をまとめています。各ページから絵描き歌と答えの確認ができます。
            </p>
        </section>;
    }

    private renderYoutubeEntries() {
        return youtubeEntries.map(e => this.renderYoutubeEntry(e));
    }

    private renderYoutubeEntry(entry: Entry) {
        return <section key={entry.id}>
            <VideoItem id={entry.id} title={entry.title} linkTo={`/history/${entry.id}`}>
                {entry.desc ? <p>{entry.desc}</p> : ''}
            </VideoItem>
        </section>;
    }

    private renderOtherEntries() {
        return <section>
            <h2>Youtube以外</h2>
            <p>
                Youtube以外で行われた絵描き歌。
            </p>
            <h3>アニメ「バーチャルさんはみている」＃８【実験放送】</h3>
            <EkakiutaView ekakiuta={virtualsan} file="/history/nico-virtualsan/1.svg"/>
        </section>;
    }
}