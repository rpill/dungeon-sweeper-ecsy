import { Component, Types } from "ecsy";

export class Health extends Component {
  static schema = {
    current: { type: Types.Number, default: 0 },
    max: { type: Types.Number, default: 0 }
  };
}