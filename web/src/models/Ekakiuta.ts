export type Ekakiuta = {
    answer: string;
    lyrics: string[];
}

export type YoutubeEkakiutaEntry = {
    time: string;
    ekakiuta: Ekakiuta;
}

export type YoutubeEkakiutaLive = {
    title: string;
    id: string;
    date: string;
    desc?: string;
    entries: YoutubeEkakiutaEntry[];
}