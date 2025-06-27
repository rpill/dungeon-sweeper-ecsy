import { Component, Types } from "ecsy";

export class Mimic extends Component {
    static schema = {
        frame: { type: Types.Number, default: 0 }
    };
}