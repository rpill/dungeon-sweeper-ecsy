import { Component, Types } from "ecsy";

export class EffectAnimation extends Component {
  static schema = {
    sprite: { type: Types.Ref, default: null }, // Phaser sprite
    animation: { type: Types.Ref, default: null }, // Phaser animation
    scale: { type: Types.Number, default: 1.0 }, // масштаб анимации
    alpha: { type: Types.Number, default: 1.0 } // прозрачность
  };
} 