import { Component, Types } from "ecsy";

export class DefeatedSprite extends Component {
    static schema = {
        frame: { type: Types.Number, default: 0 }
    };
} 