import { Component, Types } from "ecsy";

export class XP extends Component {
    static schema = {
        value: { type: Types.Number, default: 0 }
    };
}