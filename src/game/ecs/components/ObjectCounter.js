import { Component } from 'ecsy';

export class ObjectCounter extends Component {
  constructor() {
    super();
    this.counts = new Map(); // Map<objectType, count>
    this.lastEntityCount = 0; // Количество сущностей при последнем подсчёте
    this.lastUpdateTime = 0; // Время последнего обновления
  }

  reset() {
    this.counts.clear();
    this.lastEntityCount = 0;
    this.lastUpdateTime = 0;
  }
} 