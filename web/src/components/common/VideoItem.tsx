import React from 'react';
import { getYoutubeVideoLink, getThumbnailLink } from '../../helpers/youtube';
import { Link } from 'react-router-dom';

import './VideoItem.css';

type VideoItemProps = {
    id: string;
    title: string;
    linkTo?: string;
}

export class VideoItem extends React.Component<VideoItemProps> {
    constructor(props: VideoItemProps) {
        super(props);
        this.state = {
        };
    }

    public render() {
        const { id, title, linkTo } = this.props;

        return <section className="video-item">
            <div>
                <div className="thumbnail">
                    {this.getThumbnailBody(id)}
                </div>
                <div className="video-link">
                </div>
                <div className="info-link">
                </div>
            </div>
            <div className="summary">
                <div className="title">
                    {linkTo === undefined ? title : <Link to={linkTo}>{title}</Link>}
                </div>
                <div>
                    {this.props.children}
                </div>
            </div>
        </section>;
    }


    getThumbnailBody(id: string) {
        const youtubeLink = getYoutubeVideoLink(id);
        const thumbnailLink = getThumbnailLink(id);

        return <a href={youtubeLink} target="_blank" rel="noopener">
            <img src={thumbnailLink} width={150}/>
        </a>;
    }
}