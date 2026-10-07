import { angleDiff } from './util.js';

// Wind that wanders: slow big swings (full change of heading over a few minutes)
// plus gusts. dir = direction the wind blows TOWARD (radians clockwise from north).
const NAMES = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];

export class Wind {
  constructor(t = 0) {
    this.t = t;
    this.dir = 0.8;
    this.strength = 1;
    this.announced = null;
    this.update(0);
    this.announced = this.dir;
  }
  update(dt) {
    this.t += dt;
    const t = this.t;
    // slow prevailing swing + a few degrees of gusty wobble at several time-scales
    this.dir = 0.8 + 2.2 * Math.sin(t * 0.0075 + 0.5) + 0.5 * Math.sin(t * 0.031)
      + 0.07 * Math.sin(t * 0.43 + 1.3) + 0.05 * Math.sin(t * 0.91 + 0.2) + 0.06 * Math.sin(t * 0.21 + 4.1) * Math.sin(t * 0.057);
    const gust = Math.pow(Math.max(0, Math.sin(t * 0.37) * Math.sin(t * 0.113 + 2)), 2) * 0.22;   // short punchy gusts
    this.gust = gust;
    this.strength = Math.min(1.3, Math.max(0.45, 0.85 + 0.25 * Math.sin(t * 0.013 + 1) + 0.12 * Math.sin(t * 0.11) + 0.05 * Math.sin(t * 0.53) + gust));
  }
  // true when the wind has swung far enough since the last announcement
  shifted() {
    if (Math.abs(angleDiff(this.announced, this.dir)) > 0.95) { this.announced = this.dir; return true; }
    return false;
  }
  get knots() { return Math.round(6 + this.strength * 9); }
  /** old-fashioned description instead of a number */
  get feel() {
    const k = this.strength;
    return k < 0.6 ? 'Light air' : k < 0.85 ? 'Gentle breeze' : k < 1.05 ? 'Fresh breeze' : k < 1.2 ? 'Strong breeze' : 'Gusting hard';
  }
  get fromName() {
    const from = (this.dir + Math.PI) % (Math.PI * 2);
    return NAMES[Math.round(((from + Math.PI * 2) % (Math.PI * 2)) / (Math.PI / 4)) % 8];
  }
}
