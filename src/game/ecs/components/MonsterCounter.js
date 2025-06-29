import { Component } from 'ecsy';

export class ObjectCounter extends Component {
  constructor() {
    super();
    this.counts = new Map(); // Map<objectType, count>
  }

  reset() {
    this.counts.clear();
  }
} 