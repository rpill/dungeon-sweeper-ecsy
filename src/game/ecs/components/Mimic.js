import { Component, Types } from "ecsy";

export class Mimic extends Component {
    static schema = {
        isMimicking: { type: Types.Boolean, default: true },
        trueSpriteSheet: { type: Types.String, default: '' },
        trueFrame: { type: Types.Number, default: 0 }
    };
}