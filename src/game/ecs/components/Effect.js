import { Component, Types } from "ecsy";

export class Effect extends Component {
  static schema = {
    type: { type: Types.String, default: '' }, // 'hit', 'explosion', 'disappear', 'open', 'spell'
    duration: { type: Types.Number, default: 1000 }, // длительность в миллисекундах
    startTime: { type: Types.Number, default: 0 } // время начала эффекта
  };
} 