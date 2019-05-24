import React, { Component } from "react";
import { VivusView } from "./VivusView";
import { yieldFrame, sleep } from "../../helpers/promise";

type VivusAnimationViewProps = {
    file: string;
}

type VivusAnimationViewState = {
    progress: number;
    highlight: boolean;
}

export class VivusAnimationView extends Component<VivusAnimationViewProps, VivusAnimationViewState> {
    private unmounted: boolean = false;
    private prevDate: number = 0;

    constructor(props: VivusAnimationViewProps) {
        super(props);

        this.animation();

        this.state = {
            progress: 0,
            highlight: false,
        };
    }

    componentWillUnmount() {
        this.unmounted = true;
    }

    render() {
        const { file } = this.props;
        const { progress, highlight } = this.state;

        return <VivusView file={file} highlight={highlight} progress={progress}/>;
    }

    private async animation() {
        while (!this.unmounted) {
            let progress = 0;
            await sleep(500);
            this.prevDate = Date.now();
            while (progress < 1) {
                await yieldFrame();
                if (this.unmounted) return;
                const current = Date.now();
                const d = (current - this.prevDate) / 1000 / 5;
                this.prevDate = current;
                progress += d;
                this.setState({ ...this.state, progress, highlight: true, });
            }

            await yieldFrame();
            if (this.unmounted) return;
            this.setState({ ...this.state, progress: 1, highlight: false });

            await sleep(3000);
            if (this.unmounted) return;
            this.setState({ ...this.state, progress: 0, highlight: false });
        }
    }
}