import { Component, Types } from "ecsy";

export class EffectPosition extends Component {
  static schema = {
    x: { type: Types.Number, default: 0 }, // позиция X в пикселях
    y: { type: Types.Number, default: 0 }, // позиция Y в пикселях
    offsetX: { type: Types.Number, default: 0 }, // смещение по X
    offsetY: { type: Types.Number, default: 0 }, // смещение по Y
    depth: { type: Types.Number, default: 10 } // глубина отрисовки (выше обычных спрайтов)
  };
} 