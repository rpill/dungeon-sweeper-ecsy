import { Component, Types } from "ecsy";

export class Tile extends Component {
    static schema = {
        baseType: { type: Types.Number, default: 0 }
    };
}