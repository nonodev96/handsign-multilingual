import { GestureDescription } from "fingerpose";

export default class CGestureDescription extends GestureDescription {
    addCurl(finger: number, curl: number, contrib?: number | undefined): void {
        super.addCurl(finger, curl, contrib);
    }

    addDirection(finger: number, position: number, contrib?: number | undefined): void {
        super.addCurl(finger, position, contrib);
    }

    matchAgainst(detectedCurls: number[], detectedDirections: number[]): number {
        return super.matchAgainst(detectedCurls, detectedDirections);
    }

    // TODO
}