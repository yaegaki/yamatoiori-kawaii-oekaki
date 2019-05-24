import React, { Component } from "react";
import { VivusView } from "../common/VivusView";

type OekakiResultViewProps = {
    file: string;
    duration: number;
}

type OekakiResultViewState = {
    progress: number;
    highlight: boolean;
}

export class OekakiResultView extends Component<OekakiResultViewProps, OekakiResultViewState> {
    private vivus?: Vivus;
    private unmount: boolean = false;

    constructor(props: OekakiResultViewProps) {
        super(props)

        this.update = this.update.bind(this);

        this.state = {
            progress: 0,
            highlight: true,
        };
    }

    render() {
        return <VivusView file={this.props.file} progress={this.state.progress} highlight={this.state.highlight}/>
    }

    componentDidMount() {
        this.update();
    }

    componentDidUpdate(prevProps: OekakiResultViewProps, prevState: OekakiResultViewState) {
        if (prevProps.duration !== this.props.duration || prevState.progress !== this.state.progress) {
            if (this.vivus !== undefined) {
                this.vivus.setFrameProgress(this.state.progress);
            }
        }
    }

    componentWillUnmount() {
        this.unmount = true;
    }

    private update() {
        let prev = Date.now();
        const f = () => {
            if (this.unmount) return;
            const current = Date.now();

            let nextProgress = this.state.progress + ((current - prev) / 1000) / this.props.duration;
            let delay = false;
            if (nextProgress > 1) {
                nextProgress = 1;
                delay = true;
            }

            this.setState(prevState => {
                return {
                    ...prevState,
                    progress: nextProgress,
                };
            });

            if (delay) {
                this.setState(prevState => {
                    return {
                        ...prevState,
                        highlight: false,
                    };
                });

                setTimeout(() => {
                    prev = Date.now();
                    this.setState(prevState => {
                        return {
                            ...prevState,
                            progress: 0,
                            highlight: true,
                        };
                    });

                    requestAnimationFrame(f);
                }, 3000);
            }
            else {
                prev = current;
                requestAnimationFrame(f);
            }
        };
        f();
    }
}
