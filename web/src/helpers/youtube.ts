/**
 * idと時間を指定してyoutubeのリンクを取得する。
 * 渡された時間の10秒前から始まる動画のリンクになる。
 */
export function getYoutubeVideoLink(id: string, timeMsec ?: number): string {
    let url = `https://www.youtube.com/watch?v=${id}`;
    if (timeMsec !== undefined) {
        // チャットの10秒前をターゲットにする
        const targetTimeSec = Math.floor(timeMsec / 1000 - 10);
        if (timeMsec > 0) {
            url += `&t=${targetTimeSec}`;
        }
    }
    return url;
}

export function getThumbnailLink(id: string) {
    return `https://img.youtube.com/vi/${id}/0.jpg`;
}
