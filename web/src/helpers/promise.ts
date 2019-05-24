export function sleep(time: number): Promise<{}> {
    return new Promise(resolve => {
        setTimeout(resolve, time);
    });
}

export function yieldFrame(): Promise<{}> {
    return new Promise(resolve => {
        requestAnimationFrame(resolve);
    });
}