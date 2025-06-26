import { Component, Types } from "ecsy";

export class SpriteObjects extends Component {
  static schema = {
    spriteObj: { type: Types.Ref, default: null },
    dmgText: { type: Types.Ref, default: null },
    coinIcon: { type: Types.Ref, default: null },
    xpText: { type: Types.Ref, default: null },
    hpText: { type: Types.Ref, default: null }
  };

  destroyAll() {
    const objects = [this.spriteObj, this.dmgText, this.coinIcon, this.xpText, this.hpText];
    objects.forEach(obj => {
      if (obj) {
        obj.destroy();
      }
    });
    // Очищаем ссылки
    this.spriteObj = null;
    this.dmgText = null;
    this.coinIcon = null;
    this.xpText = null;
    this.hpText = null;
  }
} 