import React, { Component } from "react";

import './VivusView.css';

type VivusViewProps = {
    file: string;
    progress: number;
    highlight: boolean;
}

export class VivusView extends Component<VivusViewProps> {
    private vivus?: Vivus;

    constructor(props: VivusViewProps) {
        super(props)
        this.prepareVivus = this.prepareVivus.bind(this);
    }

    render() {
        return <div className="vivus-view" ref={this.prepareVivus}/>;
    }

    componentDidUpdate(prevProps: VivusViewProps  ) {
        if (prevProps.progress !== this.props.progress || prevProps.highlight !== this.props.highlight) {
            if (this.vivus !== undefined) {
                this.setFrameProgress(this.vivus);
            }
        }
    }

    private prepareVivus(elem: HTMLDivElement | null) {
        if (this.vivus !== undefined || elem === null) return;

        this.vivus = new Vivus(elem, {
            type: 'oneByOne',
            duration: 1000,
            start: 'manual',
            file: this.props.file,
            onReady: v => this.setFrameProgress(v),
        });
    }

    private setFrameProgress(v: Vivus) {
        v.setFrameProgress(this.props.progress);

        if (this.props.highlight) {
            const currentFrame = this.props.progress * v.duration;
            let frame = 0;
            v.map.forEach(p => {
                const nextFrame = Math.min(frame + p.duration, v.duration);
                if (currentFrame > frame && currentFrame <= nextFrame) {
                    if (!p.el.classList.contains('hightlight')) {
                        p.el.classList.add('highlight');
                    }
                }
                else {
                    p.el.classList.remove('highlight');
                }

                frame = nextFrame;
            });
        }
        else {
            v.map.forEach(p => {
                p.el.classList.remove('highlight');
            });
        }
    }
}
