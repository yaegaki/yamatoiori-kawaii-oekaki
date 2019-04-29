import React, { Component } from "react";
import { Link } from "react-router-dom";

import './Home.css';

export class Home extends Component {
    render() {
        return <div className="home-top">
            {this.renderAbout()}
            {this.renderContentDescription()}
            {this.renderHowToUse()}
            {this.renderTips()}
            {this.renderTermsOfService()}
        </div>;
    }

    private renderAbout() {
        return <section>
            <h2>このサイトについて</h2>
            <p>
                このサイトは.LIVE所属のVTuber、ヤマト&nbsp;イオリさん(<a href="https://www.youtube.com/channel/UCyb-cllCkMREr9de-hoiDrg" target="_blank">Youtube</a>,<a href="https://twitter.com/YamatoIori" target="_blank">Twitter</a>)の非公式ファンサイトです。
            </p>
            <p>
                絵描き歌用のお絵描きを投稿することができます。<br/>
                PC/スマートフォンから手軽に利用できます。<br/>
                利用する前にこのページ下部の利用規約に目を通してください。<br/>
            </p>
            <p>
                なにかあれば<a href="https://twitter.com/fi_n_o">@fi_n_o</a>か<a href="https://github.com/yaegaki/yamatoiori-kawaii-oekaki">github</a>に連絡ください。
            </p>
        </section>;
    }

    private renderContentDescription() {
        return <section>
            <h2>コンテンツ</h2>
            <h3><Link to="/paint">お絵描き</Link></h3>
            <p>
                絵を描くツールです。<br/>
                PC/スマートフォンのどちらでも利用可能です。<br/>
                描いた絵を投稿することもできます。<br/>
            </p>
            <h3><Link to="/list">リスト</Link></h3>
            <p>
                他の人の描いた絵を閲覧することができます。<br/>
                リストは(ほぼ)リアルタイムで更新されます。<br/>
            </p>
        </section>;
    }

    private renderHowToUse() {
        return <section>
            <h2>使い方</h2>
            <p>ここでは当サイトの使い方について簡単に説明します。</p>
            <h3>お絵描きをする(PC)</h3>
            <p>
                <Link to="/paint">お絵描きのページ</Link>を開くと以下のような画面になります。
            </p>
            <p>
                <img className="ss" src="/img/paint-pc.png"/>
            </p>
            <p>
                白い場所がキャンバスでここに絵を描いていきます。<br/>
                マウスやペンタブでキャンバスに線を引くことができます。<br/>
                マウスのホイールで拡大縮小、ホイールのドラッグで移動ができます。<br/>
            </p>
            <p>
                右側のツールボックスから消しゴムや一つ戻る、一つ進む機能にアクセスすることができます。<br/>
                描いた絵の投稿もこのツールボックスから行うことができます。<br/>
            </p>
            <h3>お絵描きをする(スマートフォン)</h3>
            <p>
                <Link to="/paint">お絵描きのページ</Link>を開くと以下のような画面になります。
            </p>
            <p>
                <img className="ss" src="/img/paint-sp.png"/>
            </p>
            <p>
                白い場所がキャンバスでここに絵を描いていきます。<br/>
                タッチでキャンバスに線を引くことができます。<br/>
                ピンチ操作で拡大縮小、2本指のドラッグで移動ができます。<br/>
            </p>
            <p>
                画面下部のボタンから消しゴムや一つ戻る、一つ進む機能にアクセスすることができます。<br/>
                描いた絵の投稿もこのボタンから行うことができます。<br/>
            </p>
            <h3>画像の投稿</h3>
            <p>
                投稿ボタン(スマートフォンは一番右側のボタン)を押すと以下のような画面が出てきます。
            </p>
            <p>
                <img className="ss" src="/img/post-modal.png"/>
            </p>
            <p>
                ここではタグと解答が入力できます。<br/>
                タグは描いた絵をタグ付けするために使用されます。<br/>
                通常は絵描き歌回の動画IDで問題ないですが自由に入力可能です。<br/>
                テストで投稿したい場合はタグを「<Link to="/list?t=テスト">テスト</Link>」にして下さい。<br/>
                解答は描いた絵が何なのかを記入する部分です。<br/>
                自由に入力してください。<br/>
                どちらも入力した後に投稿ボタンを押すと投稿ができます。<br/>
            </p>
            <h3>投稿された絵を見る</h3>
            <p>
                <Link to="/list">リストのページ</Link>で投稿された絵の一覧をみることができます。<br/>
                一覧は一定時間で自動でリロードされ、常に最新の状態が表示されます。<br/>
                タグで絵を絞り込むこともできます。<br/>
                投稿された絵は最新100件のみ閲覧可能です。<br/>
            </p>
            <h3>投稿した絵を削除する</h3>
            <p>
                自分が投稿した絵の投稿ページには削除ボタンが表示されます。<br/>
                このボタンから投稿した絵の削除を行うことができます。<br/>
            </p>
            <p>
                削除は投稿したときに使用したブラウザからのみ行うことができます。<br/>
                ただし、キャッシュを消すなどを行った場合削除できなくなる場合があります。<br/>
                削除できなくなって困るようなものは投稿しないでください。<br/>
            </p>
            <p>
                <img className="ss" src="/img/picture-detail-mine.png"/>
            </p>
        </section>;
    }

    private renderTips() {
        return <section>
            <h2>Tips</h2>
            <h3>推奨動作環境</h3>
            <p>
                PC: Chrome, Firefox<br/>
                スマートフォン(iPhone): Safari<br/>
                スマートフォン(Android): Chrome<br/>
                タブレット(iPad): Safari<br/>
                いずれも最新バージョンを推奨します。<br/>
                おそらくIEでは動きません。<br/>
            </p>
            <h3>ワコムのペンタブレットを使用する(Windows)</h3>
            <p>
                デジタルインク機能が有効になっているとうまく動作しない場合があります。<br/>
                ペンタブレットの設定画面を開きデジタルインク機能を無効にしてください。<br/>
            </p>
            <p>
                <img className="ss" src="/img/wacom-setting.png"/>
            </p>
            <h3>お絵描きの動作がおかしくなった場合</h3>
            <p>
                申し訳ありませんがページをリロードしてください。<br/>
            </p>
            <h3>ツイートするときに別のハッシュタグをつける場合</h3>
            <p>
                既存の内容を消すか追加で自分の好きなハッシュタグをつけてください。<br/>
            </p>
        </section>;
    }

    private renderTermsOfService() {
        return <section>
            <h2>利用規約</h2>
            <p>
                このサイトは主にイオリンの絵描き歌用として使ってください。<br/>
                節度を守っていただければ他の用途に使っていただいてもかまいません。<br/>
                ただし、ドットライブと全く関係ないものについてはご遠慮ください。<br/>
                (テストタグについては比較的なんでもいいですが常識の範囲内でお願いします。)<br/>
            </p>
            <p>
                投稿された絵について管理者の都合(サーバ負荷やその他事情)で削除する可能性があります。<br/>
                削除されて困るものについてはローカルに保存しておくかそもそも投稿しないでください。<br/>
            </p>
        </section>;
    }
}