import { Component, Types } from "ecsy";
export class Type extends Component {
  static schema = {
    value: { type: Types.String, default: '' }
  };
} 