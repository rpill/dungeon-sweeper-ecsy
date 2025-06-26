import { Component, Types } from "ecsy";

export class Sprite extends Component {
    static schema = {
        spriteSheet: { type: Types.String, default: '' },
        frame: { type: Types.Number, default: 0 },
        offsetY: { type: Types.Number, default: 0 }
    };
}