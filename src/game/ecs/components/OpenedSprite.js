import { Component, Types } from "ecsy";

export class OpenedSprite extends Component {
  static schema = {
    frame: { type: Types.Number, default: 15 }
  };
} 