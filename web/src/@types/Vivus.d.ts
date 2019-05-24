declare type VivusOptions = {
    type?: VivusType,
    duration?: number,
    delay?: number,
    file?: string,
    start?: VivusStartTiming;
    onReady?: (v: Vivus) => void;
}

declare type VivusType = 'delayed'|'sync'|'oneByOne'|'script'
declare type VivusStartTiming = 'manual';

declare type VivusPath = {
    el: SVGPathElement,
    length: number,
    duration: number;
}

declare class Vivus {
    map: VivusPath[];
    duration: number;

    constructor(element: HTMLElement | string, options: VivusOptions);

    setFrameProgress(progress: number): void;
}