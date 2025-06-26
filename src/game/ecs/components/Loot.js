import { Component, Types } from "ecsy";

export class Loot extends Component {
    static schema = {
        type: { type: Types.String, default: '' }
    };
}