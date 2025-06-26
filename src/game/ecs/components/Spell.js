import { Component, Types } from "ecsy";
export class Spell extends Component {
  static schema = {
    type: { type: Types.String, default: '' },
    targets: { type: Types.Array, default: [] },
    radius: { type: Types.Number, default: 1.5 }
  };
} 