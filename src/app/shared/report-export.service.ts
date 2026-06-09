import { Injectable } from '@angular/core';

export interface SeccionExport {
  titulo: string;
  tipo: 'kpis' | 'tabla' | 'barras';
  kpis?: { label: string; valor: string }[];
  columnas?: string[];
  filas?: (string | number)[][];
  barras?: { label: string; value: number }[];
}

export interface ReporteExport {
  titulo: string;
  subtitulo?: string;
  secciones: SeccionExport[];
}

// Exporta reportes a PDF (imprimir), Excel (.xls) y HTML — sin librerías externas.
// Se basa en datos estructurados para que el export se vea consistente.
@Injectable({ providedIn: 'root' })
export class ReportExportService {
  // ---------- HTML ----------
  html(rep: ReporteExport) {
    this.descargar(`${this.slug(rep.titulo)}.html`, this.documento(rep), 'text/html;charset=utf-8');
  }

  // ---------- PDF (vía diálogo de impresión del navegador → Guardar como PDF) ----------
  pdf(rep: ReporteExport) {
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(this.documento(rep, true));
    w.document.close();
  }

  // ---------- Excel (.xls = tabla HTML con MIME de Excel) ----------
  excel(rep: ReporteExport) {
    const tablas = rep.secciones
      .filter((s) => s.tipo !== 'kpis')
      .map((s) => this.tablaHtml(s))
      .join('<br/>');
    const kpis = rep.secciones.find((s) => s.tipo === 'kpis');
    const kpiTabla = kpis
      ? `<table border="1"><tr><th colspan="2">${kpis.titulo}</th></tr>` +
        (kpis.kpis ?? []).map((k) => `<tr><td>${k.label}</td><td>${k.valor}</td></tr>`).join('') +
        `</table><br/>`
      : '';
    const html = `<html><head><meta charset="utf-8"></head><body><h1>${rep.titulo}</h1>${kpiTabla}${tablas}</body></html>`;
    this.descargar(`${this.slug(rep.titulo)}.xls`, html, 'application/vnd.ms-excel');
  }

  // ---------- Helpers ----------
  private descargar(nombre: string, contenido: string, mime: string) {
    const blob = new Blob([contenido], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nombre;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

  private slug(s: string) {
    return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  }

  private tablaHtml(s: SeccionExport): string {
    if (s.tipo === 'barras') {
      const filas = (s.barras ?? []).map((b) => `<tr><td>${b.label}</td><td>${b.value}</td></tr>`).join('');
      return `<table border="1" cellspacing="0"><tr><th colspan="2">${s.titulo}</th></tr><tr><th>Categoría</th><th>Valor</th></tr>${filas}</table>`;
    }
    const head = (s.columnas ?? []).map((c) => `<th>${c}</th>`).join('');
    const body = (s.filas ?? []).map((f) => `<tr>${f.map((c) => `<td>${c}</td>`).join('')}</tr>`).join('');
    return `<table border="1" cellspacing="0"><tr><th colspan="${(s.columnas ?? []).length}">${s.titulo}</th></tr><tr>${head}</tr>${body}</table>`;
  }

  // Documento HTML completo y estilizado (para HTML y PDF).
  private documento(rep: ReporteExport, paraImprimir = false): string {
    const cuerpo = rep.secciones.map((s) => this.seccionHtml(s)).join('');
    const printScript = paraImprimir
      ? '<script>window.onload=function(){setTimeout(function(){window.print();},250);};<' + '/script>'
      : '';
    return `<!doctype html><html lang="es"><head><meta charset="utf-8">
<title>${rep.titulo}</title>
<style>
  :root{--ink:#1c1917;--ink2:#44403c;--muted:#837b70;--paper:#f4f1ea;--surface:#fffdf9;--surface2:#faf6ee;--line:#e7e1d5;--accent:#a8682f;--ok:#4d7c4a;--warn:#b45309;--bad:#a13b2f}
  *{box-sizing:border-box}
  body{font-family:'Segoe UI',system-ui,sans-serif;color:var(--ink);background:#fff;margin:0;padding:32px;max-width:1000px;margin:0 auto}
  h1{font-size:26px;margin:0 0 2px}
  .sub{color:var(--muted);margin:0 0 22px;font-size:14px}
  h2{font-size:16px;margin:26px 0 10px;border-bottom:2px solid var(--line);padding-bottom:6px}
  .kpis{display:flex;flex-wrap:wrap;gap:14px}
  .kpi{border:1px solid var(--line);border-radius:12px;padding:16px 20px;min-width:150px;background:var(--surface2)}
  .kpi .v{font-size:26px;font-weight:700;color:var(--ink)}
  .kpi .l{font-size:12px;color:var(--muted);margin-top:3px}
  table{border-collapse:collapse;width:100%;font-size:13px;margin-top:4px}
  th,td{border:1px solid var(--line);padding:7px 10px;text-align:left}
  th{background:var(--surface2);color:var(--ink2);font-weight:700}
  .bar{display:grid;grid-template-columns:180px 1fr 70px;align-items:center;gap:10px;margin:6px 0;font-size:13px}
  .bar .tk{height:11px;background:var(--surface2);border-radius:6px;overflow:hidden}
  .bar .fl{height:100%;background:var(--accent);border-radius:6px}
  .bar .vv{text-align:right;color:var(--muted);font-weight:600}
  .foot{margin-top:34px;color:var(--muted);font-size:11px;border-top:1px solid var(--line);padding-top:10px}
  @media print{body{padding:0}}
</style></head>
<body>
  <h1>${rep.titulo}</h1>
  ${rep.subtitulo ? `<p class="sub">${rep.subtitulo}</p>` : ''}
  ${cuerpo}
  <div class="foot">Sistema de Courier Inteligente · Grupo #11 · generado ${new Date().toLocaleString('es')}</div>
  ${printScript}
</body></html>`;
  }

  private seccionHtml(s: SeccionExport): string {
    if (s.tipo === 'kpis') {
      const cards = (s.kpis ?? []).map((k) => `<div class="kpi"><div class="v">${k.valor}</div><div class="l">${k.label}</div></div>`).join('');
      return `<h2>${s.titulo}</h2><div class="kpis">${cards}</div>`;
    }
    if (s.tipo === 'barras') {
      const max = Math.max(...(s.barras ?? []).map((b) => b.value), 1);
      const rows = (s.barras ?? []).map((b) =>
        `<div class="bar"><span>${b.label}</span><div class="tk"><div class="fl" style="width:${(b.value / max) * 100}%"></div></div><span class="vv">${b.value}</span></div>`,
      ).join('');
      return `<h2>${s.titulo}</h2>${rows}`;
    }
    const head = (s.columnas ?? []).map((c) => `<th>${c}</th>`).join('');
    const body = (s.filas ?? []).map((f) => `<tr>${f.map((c) => `<td>${c}</td>`).join('')}</tr>`).join('');
    return `<h2>${s.titulo}</h2><table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
  }
}
