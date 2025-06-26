import { Component, Types } from "ecsy";

export class Heal extends Component {
  static schema = {
    amount: { type: Types.String, default: 'full' } // 'full' или число как строка
  };
} 