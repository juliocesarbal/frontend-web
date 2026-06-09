import { Component, Input, computed, signal } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';

export interface DatoChart {
  label: string;
  value: number;
}

// Paleta cálida (consistente con el tema editorial).
export const PALETA = ['#1c1917', '#a8682f', '#4d7c4a', '#b45309', '#a13b2f', '#837b70', '#c2a878', '#6b8e6a', '#8a5a2b', '#5f574e'];

// ---------- Barras horizontales ----------
@Component({
  selector: 'app-bar-chart',
  standalone: true,
  imports: [CommonModule, DecimalPipe],
  template: `
    @for (d of data; track d.label; let i = $index) {
      <div class="row">
        <span class="lbl" [title]="d.label">{{ d.label }}</span>
        <div class="track"><div class="fill" [style.width.%]="pct(d.value)" [style.background]="color(i)"></div></div>
        <span class="val">{{ d.value | number: fmt }}</span>
      </div>
    }
    @if (!data || data.length === 0) { <p class="vacio">Sin datos.</p> }
  `,
  styles: [`
    :host { display: block; }
    .row { display: grid; grid-template-columns: var(--lbl-w, 150px) 1fr var(--val-w, 70px); align-items: center; gap: 10px; margin: 7px 0; font-size: 13px; }
    .lbl { color: var(--ink-2); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .val { text-align: right; color: var(--muted); font-weight: 600; }
    .track { height: 10px; background: var(--surface-2); border-radius: 6px; overflow: hidden; }
    .fill { height: 100%; border-radius: 6px; transition: width .3s ease; min-width: 2px; }
    .vacio { color: var(--muted); font-size: 13px; }
  `],
})
export class BarChartComponent {
  @Input() data: DatoChart[] = [];
  @Input() fmt = '1.0-0';
  @Input() palette = PALETA;
  color(i: number) { return this.palette[i % this.palette.length]; }
  pct(v: number) { const m = Math.max(...this.data.map((d) => d.value), 1); return (v / m) * 100; }
}

// ---------- Dona (conic-gradient) ----------
@Component({
  selector: 'app-donut-chart',
  standalone: true,
  imports: [CommonModule, DecimalPipe],
  template: `
    <div class="wrap">
      <div class="donut" [style.background]="gradient()">
        <div class="hole">
          <span class="total">{{ total() | number: '1.0-0' }}</span>
          <span class="cap">{{ caption }}</span>
        </div>
      </div>
      <div class="legend">
        @for (d of data; track d.label; let i = $index) {
          <div class="li">
            <span class="sw" [style.background]="color(i)"></span>
            <span class="ln">{{ d.label }}</span>
            <span class="lv">{{ pct(d.value) | number: '1.0-0' }}%</span>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }
    .wrap { display: flex; align-items: center; gap: 22px; flex-wrap: wrap; }
    .donut { width: 150px; height: 150px; border-radius: 50%; position: relative; flex: none; }
    .hole { position: absolute; inset: 26px; background: var(--surface); border-radius: 50%; display: grid; place-items: center; text-align: center; }
    .total { font-family: 'Fraunces', Georgia, serif; font-size: 24px; font-weight: 700; color: var(--ink); line-height: 1; }
    .cap { font-size: 10px; color: var(--muted); text-transform: uppercase; letter-spacing: .06em; }
    .legend { display: flex; flex-direction: column; gap: 7px; min-width: 160px; }
    .li { display: grid; grid-template-columns: 14px 1fr auto; align-items: center; gap: 8px; font-size: 13px; }
    .sw { width: 12px; height: 12px; border-radius: 3px; }
    .ln { color: var(--ink-2); }
    .lv { color: var(--muted); font-weight: 600; }
  `],
})
export class DonutChartComponent {
  @Input() set data(v: DatoChart[]) { this._data.set(v ?? []); }
  get data() { return this._data(); }
  @Input() caption = '';
  @Input() palette = PALETA;
  private _data = signal<DatoChart[]>([]);

  total = computed(() => this._data().reduce((a, d) => a + d.value, 0));
  color(i: number) { return this.palette[i % this.palette.length]; }
  pct(v: number) { const t = this.total(); return t ? (v / t) * 100 : 0; }
  gradient = computed(() => {
    const t = this.total() || 1;
    let acc = 0;
    const segs = this._data().map((d, i) => {
      const from = (acc / t) * 360;
      acc += d.value;
      const to = (acc / t) * 360;
      return `${this.color(i)} ${from}deg ${to}deg`;
    });
    return `conic-gradient(${segs.join(', ') || '#eee 0deg 360deg'})`;
  });
}

// ---------- Línea / área (serie temporal) ----------
@Component({
  selector: 'app-line-chart',
  standalone: true,
  imports: [CommonModule, DecimalPipe],
  template: `
    <svg viewBox="0 0 100 42" preserveAspectRatio="none" class="svg">
      <polygon [attr.points]="area()" fill="var(--accent-soft)" />
      <polyline [attr.points]="line()" fill="none" stroke="var(--accent)" stroke-width="0.8" stroke-linejoin="round" />
    </svg>
    <div class="xax">
      @for (d of ticks(); track d.label) { <span>{{ d.label }}</span> }
    </div>
    @if (data.length) {
      <div class="meta"><span>máx {{ max() | number: '1.0-0' }}</span><span>{{ data.length }} puntos</span></div>
    } @else { <p class="vacio">Sin datos.</p> }
  `,
  styles: [`
    :host { display: block; }
    .svg { width: 100%; height: 150px; display: block; }
    .xax { display: flex; justify-content: space-between; color: var(--muted); font-size: 10.5px; margin-top: 2px; }
    .meta { display: flex; justify-content: space-between; color: var(--muted); font-size: 11px; margin-top: 6px; }
    .vacio { color: var(--muted); font-size: 13px; }
  `],
})
export class LineChartComponent {
  @Input() set data(v: DatoChart[]) { this._d.set(v ?? []); }
  get data() { return this._d(); }
  private _d = signal<DatoChart[]>([]);

  max = computed(() => Math.max(...this._d().map((d) => d.value), 1));
  private xy() {
    const d = this._d();
    const m = this.max();
    const n = d.length;
    return d.map((p, i) => {
      const x = n <= 1 ? 0 : (i / (n - 1)) * 100;
      const y = 40 - (p.value / m) * 38; // margen sup/inf
      return [x, y] as const;
    });
  }
  line = computed(() => this.xy().map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' '));
  area = computed(() => {
    const pts = this.xy();
    if (!pts.length) return '';
    return `0,42 ${pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ')} 100,42`;
  });
  ticks = computed(() => {
    const d = this._d();
    if (d.length <= 6) return d;
    const step = Math.ceil(d.length / 6);
    return d.filter((_, i) => i % step === 0);
  });
}
