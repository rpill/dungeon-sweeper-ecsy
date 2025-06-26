import { Component, Types } from "ecsy";
export class Orb extends Component {
  static schema = {
    radius: { type: Types.Number, default: 2 }
  };
} 