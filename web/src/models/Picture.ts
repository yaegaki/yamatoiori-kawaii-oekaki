export type Picture = {
    id: string;
    name: string;
    answer: string;
    tag: string;
}

export type PictureResponse = {
    authorHash: string,
    id: string;
    picture?: Picture,
}
