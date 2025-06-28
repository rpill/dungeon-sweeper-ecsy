import { Component, Types } from "ecsy";

export class Attack extends Component {
  static schema = {
    value: { type: Types.Number, default: 0 }
  };
}