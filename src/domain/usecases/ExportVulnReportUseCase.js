import PptxGenJS from 'pptxgenjs';

/**
 * ExportVulnReportUseCase genera un reporte ejecutivo de vulnerabilidades y TTPs
 * en formato PowerPoint (.pptx) con gráficas de distribución por severidad,
 * métricas de inteligencia de amenazas y tablas top-10.
 *
 * Diapositivas generadas:
 *  1. Portada
 *  2. Índice
 *  3. Resumen KPI + Gráfica de barras de vulnerabilidades
 *  4. Donut de proporción por severidad
 *  5. Tabla Top-10 CVEs más severos
 *  6. Cobertura de inteligencia TTP (KPIs)
 *  7. Top TTPs por frecuencia (barras)
 */
export class ExportVulnReportUseCase {
  constructor(infrastructureRepository) {
    this.infrastructureRepository = infrastructureRepository;
  }

  async execute(selectedProjectId, projectName = 'Proyecto') {
    if (!selectedProjectId) {
      throw new Error('No se ha seleccionado ningún proyecto para generar el reporte.');
    }

    // ── 1. Obtener datos del backend ──
    const exportData = await this.infrastructureRepository.exportProject(selectedProjectId);
    if (!exportData || !exportData.nodes) {
      throw new Error('El backend devolvió un formato inválido o vacío.');
    }

    // Obtener stats de TTPs
    let ttpStats = null;
    try {
      const resp = await fetch(`/api/infrastructure/ttp-stats?project_id=${selectedProjectId}`);
      if (resp.ok) {
        ttpStats = await resp.json();
      }
    } catch (e) {
      console.warn('No se pudieron obtener las estadísticas de TTPs:', e);
    }

    // Obtener matriz TTP completa (para la matriz MITRE y heatmap)
    let ttpMatrix = [];
    try {
      const resp2 = await fetch(`/api/infrastructure/ttps?project_id=${selectedProjectId}`);
      if (resp2.ok) {
        const raw = await resp2.json();
        const data = Array.isArray(raw) ? raw : (raw?.data || raw?.ttps || []);
        ttpMatrix = data.map(t => ({
          id: t.id || t.ID || '',
          name: t.name || t.Name || '',
          tactic: this._normalizeTactic(t.tactic || t.Tactic || ''),
          cves: t.cves || t.CVEs || [],
        })).filter(t => t.id !== '');
      }
    } catch (e) {
      console.warn('No se pudo obtener la matriz TTP:', e);
    }

    // ── 2. Clasificar vulnerabilidades ──
    const vulnNodes = exportData.nodes.filter(n =>
      n.labels?.includes('Vulnerability') || n.primaryLabel === 'Vulnerability'
    );
    const findingNodes = exportData.nodes.filter(n =>
      n.labels?.includes('Finding') || n.primaryLabel === 'Finding'
    );
    const ttpNodes = exportData.nodes.filter(n =>
      n.labels?.includes('TTP') || n.primaryLabel === 'TTP'
    );

    const severityCounts = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
    vulnNodes.forEach(n => {
      const sev = (n.properties?.severity || '').toUpperCase();
      if (sev in severityCounts) {
        severityCounts[sev]++;
      } else if (n.properties?.base_score != null) {
        const score = parseFloat(n.properties.base_score);
        if (score >= 9.0) severityCounts.CRITICAL++;
        else if (score >= 7.0) severityCounts.HIGH++;
        else if (score >= 4.0) severityCounts.MEDIUM++;
        else if (score > 0.0) severityCounts.LOW++;
      }
    });

    const totalVulns = Object.values(severityCounts).reduce((a, b) => a + b, 0);
    const totalFindings = findingNodes.length;
    const totalTTPs = ttpMatrix.length;
    const now = new Date();
    const dateStr = now.toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });

    // ── Paleta oscura (HUD style) ──
    const C = {
      BG:         '0A0A0F',
      BG_CARD:    '111118',
      TEXT:       'E0E0E0',
      TEXT_SEC:   '888888',
      ACCENT:     '7973FF',
      ACCENT_L:   '1A1A2E',
      BORDER:     '2A2A35',
      CRITICAL:   'DC2626',
      HIGH:       'F97316',
      MEDIUM:     'EAB308',
      LOW:        '22C55E',
      CYAN:       '00FFFF',
      MAGENTA:    'FF00FF',
    };

    // ── 3. Crear presentación ──
    const pres = new PptxGenJS();
    pres.author = 'Orquestador TFM';
    pres.company = 'UCM Ciberseguridad';
    pres.subject = `Reporte de Vulnerabilidades — ${projectName}`;
    pres.title = `Reporte Ejecutivo — ${projectName}`;
    pres.layout = 'LAYOUT_WIDE';

    // ═══════════════════════════════════════
    // SLIDE 1: PORTADA
    // ═══════════════════════════════════════
    const s1 = pres.addSlide();
    s1.background = { color: C.BG };

    // Barra superior de acento
    s1.addShape(pres.ShapeType.rect, {
      x: 0, y: 0, w: '100%', h: 0.08,
      fill: { color: C.ACCENT },
    });

    // Título
    s1.addText('REPORTE EJECUTIVO\nDE VULNERABILIDADES', {
      x: 0.9, y: 1.6, w: 11.5, h: 2.2,
      fontSize: 38, fontFace: 'Arial', bold: true,
      color: C.TEXT, align: 'left', lineSpacingMultiple: 1.15,
    });

    // Nombre del proyecto
    s1.addText(projectName, {
      x: 0.9, y: 3.9, w: 11.5, h: 0.6,
      fontSize: 24, fontFace: 'Arial', color: C.ACCENT, align: 'left',
    });

    // Línea separadora
    s1.addShape(pres.ShapeType.rect, {
      x: 0.9, y: 4.7, w: 3.5, h: 0.04,
      fill: { color: C.ACCENT },
    });

    // Metadatos
    s1.addText(
      `Fecha: ${dateStr}\nVulnerabilidades detectadas: ${totalVulns}\nHallazgos asociados: ${totalFindings}\nTTPs mapeadas: ${totalTTPs}`,
      {
        x: 0.9, y: 5.0, w: 11.5, h: 1.4,
        fontSize: 13, fontFace: 'Arial', color: C.TEXT_SEC,
        align: 'left', lineSpacingMultiple: 1.5,
      }
    );

    // Barra inferior
    s1.addShape(pres.ShapeType.rect, {
      x: 0, y: 7.42, w: '100%', h: 0.08,
      fill: { color: C.ACCENT },
    });

    // ═══════════════════════════════════════
    // SLIDE 2: ÍNDICE
    // ═══════════════════════════════════════
    const s2 = pres.addSlide();
    s2.background = { color: C.BG };
    this._addHeader(pres, s2, C, 'Índice del Reporte');

    const tocItems = [
      { num: '01', title: 'Distribución de Vulnerabilidades por Severidad', desc: 'KPIs y gráfica de barras con el volumen de vulnerabilidades clasificadas por criticidad.' },
      { num: '02', title: 'Proporción por Severidad', desc: 'Gráfica de proporción porcentual (donut) de la distribución de severidades.' },
      { num: '03', title: 'Top Vulnerabilidades por Puntuación CVSS', desc: 'Tabla con las 10 vulnerabilidades más críticas ordenadas por puntuación base.' },
      { num: '04', title: 'Cobertura de Inteligencia de Amenazas (TTPs)', desc: 'KPIs de mapeo de CVEs a técnicas MITRE ATT&CK y fuentes de inteligencia.' },
      { num: '05', title: 'Top Técnicas Adversarias (TTPs)', desc: 'Tabla y gráfica de barras con las TTPs más frecuentemente asociadas.' },
      { num: '06', title: 'Matriz MITRE ATT&CK', desc: 'Vista tabular de las 14 tácticas con las técnicas detectadas en cada columna.' },
      { num: '07', title: 'Heatmap de Frecuencia ATT&CK', desc: 'Mapa de calor con la intensidad de impacto de cada técnica por táctica.' },
      { num: '08', title: 'Antigüedad de las Vulnerabilidades (Aging)', desc: 'Tabla con las vulnerabilidades más antiguas sin mitigar.' },
    ];

    tocItems.forEach((item, i) => {
      const y = 1.3 + i * 0.75;

      // Número
      s2.addText(item.num, {
        x: 0.9, y, w: 0.7, h: 0.6,
        fontSize: 18, fontFace: 'Arial', bold: true,
        color: C.ACCENT, align: 'left', valign: 'top',
      });

      // Título
      s2.addText(item.title, {
        x: 1.7, y, w: 10.7, h: 0.35,
        fontSize: 12, fontFace: 'Arial', bold: true,
        color: C.TEXT, align: 'left',
      });

      // Descripción
      s2.addText(item.desc, {
        x: 1.7, y: y + 0.32, w: 10.7, h: 0.35,
        fontSize: 10, fontFace: 'Arial',
        color: C.TEXT_SEC, align: 'left',
      });

      // Línea separadora
      if (i < tocItems.length - 1) {
        s2.addShape(pres.ShapeType.rect, {
          x: 0.9, y: y + 0.68, w: 11.5, h: 0.01,
          fill: { color: C.BORDER },
        });
      }
    });

    // ═══════════════════════════════════════
    // SLIDE 3: KPIs + Barras de vulnerabilidades
    // ═══════════════════════════════════════
    const s3 = pres.addSlide();
    s3.background = { color: C.BG };
    this._addHeader(pres, s3, C, '01 — Distribución de Vulnerabilidades por Severidad');

    // KPI Cards
    const kpis = [
      { label: 'CRÍTICA', value: severityCounts.CRITICAL, color: C.CRITICAL },
      { label: 'ALTA', value: severityCounts.HIGH, color: C.HIGH },
      { label: 'MEDIA', value: severityCounts.MEDIUM, color: C.MEDIUM },
      { label: 'BAJA', value: severityCounts.LOW, color: C.LOW },
    ];

    const kpiW = 2.8, kpiGap = 0.23, kpiX0 = 0.5;
    kpis.forEach((kpi, i) => {
      const x = kpiX0 + i * (kpiW + kpiGap);

      s3.addShape(pres.ShapeType.roundRect, {
        x, y: 1.3, w: kpiW, h: 1.3,
        fill: { color: C.BG_CARD },
        line: { color: C.BORDER, width: 1 },
        rectRadius: 0.1,
      });

      // Barra de color
      s3.addShape(pres.ShapeType.rect, {
        x: x + 0.05, y: 1.35, w: kpiW - 0.1, h: 0.06,
        fill: { color: kpi.color },
      });

      // Número
      s3.addText(String(kpi.value), {
        x, y: 1.5, w: kpiW, h: 0.7,
        fontSize: 34, fontFace: 'Arial', bold: true,
        color: kpi.color, align: 'center',
      });

      // Etiqueta
      s3.addText(kpi.label, {
        x, y: 2.15, w: kpiW, h: 0.35,
        fontSize: 11, fontFace: 'Arial',
        color: C.TEXT_SEC, align: 'center',
      });
    });

    // Gráfica de barras
    const barData = [{
      name: 'Vulnerabilidades',
      labels: ['Crítica', 'Alta', 'Media', 'Baja'],
      values: [severityCounts.CRITICAL, severityCounts.HIGH, severityCounts.MEDIUM, severityCounts.LOW],
    }];

    s3.addChart(pres.charts.BAR, barData, {
      x: 0.5, y: 3.0, w: 12.3, h: 4.2,
      showTitle: false,
      showValue: true,
      valueFontSize: 11, valueFontColor: C.TEXT,
      catAxisLabelColor: C.TEXT, catAxisLabelFontSize: 12, catAxisLineShow: false,
      valAxisLabelColor: C.TEXT_SEC, valAxisLabelFontSize: 10, valAxisLineShow: false,
      valAxisMajorGridColor: C.BORDER,
      plotAreaFill: { color: C.BG },
      chartColors: [C.CRITICAL, C.HIGH, C.MEDIUM, C.LOW],
      barDir: 'bar', barGapWidthPct: 80,
      dataLabelPosition: 'outEnd',
      shadow: { type: 'none' },
    });

    // ═══════════════════════════════════════
    // SLIDE 4: Donut de proporción
    // ═══════════════════════════════════════
    const s4 = pres.addSlide();
    s4.background = { color: C.BG };
    this._addHeader(pres, s4, C, '02 — Proporción por Severidad');

    if (totalVulns > 0) {
      const doughnutData = [{
        name: 'Severidad',
        labels: ['Crítica', 'Alta', 'Media', 'Baja'],
        values: [severityCounts.CRITICAL, severityCounts.HIGH, severityCounts.MEDIUM, severityCounts.LOW],
      }];

      s4.addChart(pres.charts.DOUGHNUT, doughnutData, {
        x: 1.5, y: 1.3, w: 5.5, h: 5.5,
        showTitle: false, showPercent: true, showValue: false, showLegend: false,
        dataLabelColor: C.TEXT, dataLabelFontSize: 12,
        chartColors: [C.CRITICAL, C.HIGH, C.MEDIUM, C.LOW],
        holeSize: 55,
      });

      // Leyenda manual a la derecha
      const legend = [
        { label: 'Crítica', color: C.CRITICAL, count: severityCounts.CRITICAL },
        { label: 'Alta', color: C.HIGH, count: severityCounts.HIGH },
        { label: 'Media', color: C.MEDIUM, count: severityCounts.MEDIUM },
        { label: 'Baja', color: C.LOW, count: severityCounts.LOW },
      ];

      legend.forEach((item, i) => {
        const ly = 2.4 + i * 0.8;
        s4.addShape(pres.ShapeType.roundRect, {
          x: 8.0, y: ly, w: 0.32, h: 0.32,
          fill: { color: item.color }, rectRadius: 0.05,
        });
        const pct = ((item.count / totalVulns) * 100).toFixed(1);
        s4.addText(`${item.label}  —  ${item.count} (${pct}%)`, {
          x: 8.5, y: ly - 0.02, w: 4.3, h: 0.35,
          fontSize: 14, fontFace: 'Arial', color: C.TEXT,
        });
      });
    } else {
      this._addEmptyMessage(s4, C, 'No se encontraron vulnerabilidades en este proyecto.');
    }

    // ═══════════════════════════════════════
    // SLIDE 5: Tabla Top-10 CVEs
    // ═══════════════════════════════════════
    const s5 = pres.addSlide();
    s5.background = { color: C.BG };
    this._addHeader(pres, s5, C, '03 — Top Vulnerabilidades por Puntuación CVSS');

    const sortedVulns = [...vulnNodes]
      .map(n => ({
        cve: n.properties?.cve_id || n.properties?.cve || String(n.id),
        score: parseFloat(n.properties?.base_score || n.properties?.cvss_score || n.properties?.cvss || 0),
        severity: n.properties?.severity || 'N/A',
        description: (n.properties?.description || '').substring(0, 80),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);

    if (sortedVulns.length > 0) {
      const headerRow = [
        { text: '#', options: { bold: true, color: C.ACCENT, fill: { color: C.ACCENT_L }, fontSize: 10, align: 'center' } },
        { text: 'CVE ID', options: { bold: true, color: C.ACCENT, fill: { color: C.ACCENT_L }, fontSize: 10, align: 'left' } },
        { text: 'CVSS', options: { bold: true, color: C.ACCENT, fill: { color: C.ACCENT_L }, fontSize: 10, align: 'center' } },
        { text: 'Severidad', options: { bold: true, color: C.ACCENT, fill: { color: C.ACCENT_L }, fontSize: 10, align: 'center' } },
        { text: 'Descripción', options: { bold: true, color: C.ACCENT, fill: { color: C.ACCENT_L }, fontSize: 10, align: 'left' } },
      ];

      const dataRows = sortedVulns.map((v, i) => {
        const sevColor = this._sevColor(v.severity, C);
        const rowFill = i % 2 === 0 ? C.BG : C.BG_CARD;
        return [
          { text: String(i + 1), options: { color: C.TEXT_SEC, fontSize: 9, align: 'center', fill: { color: rowFill } } },
          { text: v.cve, options: { color: C.TEXT, fontSize: 9, align: 'left', bold: true, fill: { color: rowFill } } },
          { text: v.score.toFixed(1), options: { color: sevColor, fontSize: 10, align: 'center', bold: true, fill: { color: rowFill } } },
          { text: v.severity.toUpperCase(), options: { color: sevColor, fontSize: 9, align: 'center', fill: { color: rowFill } } },
          { text: v.description || '—', options: { color: C.TEXT_SEC, fontSize: 8, align: 'left', fill: { color: rowFill } } },
        ];
      });

      s5.addTable([headerRow, ...dataRows], {
        x: 0.5, y: 1.3, w: 12.3,
        colW: [0.5, 2.5, 1.0, 1.5, 6.8],
        border: { type: 'solid', pt: 0.5, color: C.BORDER },
        rowH: 0.45,
        autoPage: false,
      });
    } else {
      this._addEmptyMessage(s5, C, 'No hay datos de vulnerabilidades disponibles.');
    }

    // ═══════════════════════════════════════
    // SLIDE 6: Cobertura de Inteligencia TTP (KPIs)
    // ═══════════════════════════════════════
    const s6 = pres.addSlide();
    s6.background = { color: C.BG };
    this._addHeader(pres, s6, C, '04 — Cobertura de Inteligencia de Amenazas (TTPs)');

    if (ttpStats) {
      const mappedPct = ttpStats.total_cves > 0
        ? Math.round((ttpStats.mapped_cves / ttpStats.total_cves) * 100)
        : 0;
      const totalRel = ttpStats.capec_static + ttpStats.llm_enriched;
      const capecPct = totalRel > 0 ? Math.round((ttpStats.capec_static / totalRel) * 100) : 0;
      const llmPct = totalRel > 0 ? Math.round((ttpStats.llm_enriched / totalRel) * 100) : 0;

      // Fila 1: KPI Cards grandes
      const ttpKpis = [
        { label: 'CVEs Totales', value: ttpStats.total_cves, color: C.ACCENT },
        { label: 'CVEs Mapeados a TTPs', value: `${ttpStats.mapped_cves} (${mappedPct}%)`, color: C.CYAN },
        { label: 'CVEs Sin Mapear', value: ttpStats.unmapped_cves, color: C.TEXT_SEC },
      ];

      ttpKpis.forEach((kpi, i) => {
        const x = 0.5 + i * 4.2;
        s6.addShape(pres.ShapeType.roundRect, {
          x, y: 1.3, w: 3.9, h: 1.5,
          fill: { color: C.BG_CARD },
          line: { color: C.BORDER, width: 1 },
          rectRadius: 0.1,
        });

        s6.addText(String(kpi.value), {
          x, y: 1.4, w: 3.9, h: 0.8,
          fontSize: 30, fontFace: 'Arial', bold: true,
          color: kpi.color, align: 'center',
        });

        s6.addText(kpi.label, {
          x, y: 2.2, w: 3.9, h: 0.4,
          fontSize: 11, fontFace: 'Arial',
          color: C.TEXT_SEC, align: 'center',
        });
      });

      // Fila 2: Confianza y Fuentes
      const srcKpis = [
        { label: 'Alta Confianza (CAPEC/CWE)', value: ttpStats.high_confidence, pct: `${capecPct}%`, color: C.CYAN },
        { label: 'Confianza Media (LLM)', value: ttpStats.medium_confidence, pct: `${llmPct}%`, color: C.MAGENTA },
        { label: 'Fuente: CAPEC Estático', value: ttpStats.capec_static, pct: `${capecPct}%`, color: C.ACCENT },
        { label: 'Fuente: LLM Enriquecido', value: ttpStats.llm_enriched, pct: `${llmPct}%`, color: C.MAGENTA },
      ];

      srcKpis.forEach((kpi, i) => {
        const x = 0.5 + i * 3.15;
        s6.addShape(pres.ShapeType.roundRect, {
          x, y: 3.2, w: 2.9, h: 1.4,
          fill: { color: C.BG_CARD },
          line: { color: C.BORDER, width: 1 },
          rectRadius: 0.1,
        });

        s6.addText(String(kpi.value), {
          x, y: 3.3, w: 2.9, h: 0.7,
          fontSize: 26, fontFace: 'Arial', bold: true,
          color: kpi.color, align: 'center',
        });

        s6.addText(kpi.label, {
          x, y: 4.0, w: 2.9, h: 0.5,
          fontSize: 9, fontFace: 'Arial',
          color: C.TEXT_SEC, align: 'center',
        });
      });

      // Gráfica donut de confianza
      if (ttpStats.high_confidence > 0 || ttpStats.medium_confidence > 0) {
        const confData = [{
          name: 'Confianza',
          labels: ['Alta (CAPEC/CWE)', 'Media (LLM)'],
          values: [ttpStats.high_confidence, ttpStats.medium_confidence],
        }];

        s6.addChart(pres.charts.DOUGHNUT, confData, {
          x: 1.5, y: 5.0, w: 3.5, h: 2.3,
          showTitle: false, showPercent: true, showLegend: true,
          legendPos: 'r', legendFontSize: 9, legendColor: C.TEXT,
          dataLabelColor: C.TEXT, dataLabelFontSize: 10,
          chartColors: [C.CYAN, C.MAGENTA],
          holeSize: 50,
        });

        // Donut de fuentes
        const srcData = [{
          name: 'Fuente',
          labels: ['CAPEC Estático', 'LLM Enriquecido'],
          values: [ttpStats.capec_static, ttpStats.llm_enriched],
        }];

        s6.addChart(pres.charts.DOUGHNUT, srcData, {
          x: 7.5, y: 5.0, w: 3.5, h: 2.3,
          showTitle: false, showPercent: true, showLegend: true,
          legendPos: 'r', legendFontSize: 9, legendColor: C.TEXT,
          dataLabelColor: C.TEXT, dataLabelFontSize: 10,
          chartColors: [C.ACCENT, C.MAGENTA],
          holeSize: 50,
        });
      }
    } else {
      this._addEmptyMessage(s6, C, 'No se pudieron obtener las estadísticas de TTPs para este proyecto.');
    }

    // ═══════════════════════════════════════
    // SLIDE 7: Top TTPs por frecuencia
    // ═══════════════════════════════════════
    const s7 = pres.addSlide();
    s7.background = { color: C.BG };
    this._addHeader(pres, s7, C, '05 — Top Técnicas Adversarias (TTPs)');

    if (ttpStats?.top_ttps && ttpStats.top_ttps.length > 0) {
      const topTTPs = ttpStats.top_ttps.slice(0, 10);

      // Tabla de TTPs
      const ttpHeader = [
        { text: '#', options: { bold: true, color: C.ACCENT, fill: { color: C.ACCENT_L }, fontSize: 10, align: 'center' } },
        { text: 'TTP ID', options: { bold: true, color: C.ACCENT, fill: { color: C.ACCENT_L }, fontSize: 10, align: 'left' } },
        { text: 'Nombre', options: { bold: true, color: C.ACCENT, fill: { color: C.ACCENT_L }, fontSize: 10, align: 'left' } },
        { text: 'Táctica', options: { bold: true, color: C.ACCENT, fill: { color: C.ACCENT_L }, fontSize: 10, align: 'left' } },
        { text: 'CVEs Impactados', options: { bold: true, color: C.ACCENT, fill: { color: C.ACCENT_L }, fontSize: 10, align: 'center' } },
      ];

      const ttpRows = topTTPs.map((t, i) => {
        const rowFill = i % 2 === 0 ? C.BG : C.BG_CARD;
        return [
          { text: String(i + 1), options: { color: C.TEXT_SEC, fontSize: 9, align: 'center', fill: { color: rowFill } } },
          { text: t.id, options: { color: C.ACCENT, fontSize: 9, align: 'left', bold: true, fill: { color: rowFill } } },
          { text: (t.name || '').substring(0, 45), options: { color: C.TEXT, fontSize: 9, align: 'left', fill: { color: rowFill } } },
          { text: t.tactic || '—', options: { color: C.TEXT_SEC, fontSize: 9, align: 'left', fill: { color: rowFill } } },
          { text: String(t.count), options: { color: C.CYAN, fontSize: 11, align: 'center', bold: true, fill: { color: rowFill } } },
        ];
      });

      s7.addTable([ttpHeader, ...ttpRows], {
        x: 0.5, y: 1.3, w: 12.3,
        colW: [0.5, 1.5, 4.5, 3.5, 2.3],
        border: { type: 'solid', pt: 0.5, color: C.BORDER },
        rowH: 0.45,
        autoPage: false,
      });


    } else {
      this._addEmptyMessage(s7, C, 'No hay TTPs mapeadas en este proyecto.');
    }

    // ═══════════════════════════════════════
    // SLIDE 8: Matriz MITRE ATT&CK
    // ═══════════════════════════════════════
    const s8 = pres.addSlide();
    s8.background = { color: C.BG };
    this._addHeader(pres, s8, C, '06 — Matriz MITRE ATT&CK');

    if (ttpMatrix.length > 0) {
      const TACTICS = [
        { key: 'reco', label: 'Recon' },
        { key: 'resdev', label: 'Resource Dev' },
        { key: 'ia', label: 'Initial Access' },
        { key: 'exec', label: 'Execution' },
        { key: 'pers', label: 'Persistence' },
        { key: 'pe', label: 'Priv Escalation' },
        { key: 'de', label: 'Def Evasion' },
        { key: 'ca', label: 'Credential Acc' },
        { key: 'disc', label: 'Discovery' },
        { key: 'lm', label: 'Lateral Mov' },
        { key: 'coll', label: 'Collection' },
        { key: 'c2', label: 'C2' },
        { key: 'exfil', label: 'Exfiltration' },
        { key: 'impact', label: 'Impact' },
      ];

      // Agrupar TTPs por táctica
      const tacticGroups = {};
      TACTICS.forEach(t => { tacticGroups[t.key] = []; });
      ttpMatrix.forEach(ttp => {
        if (tacticGroups[ttp.tactic]) {
          tacticGroups[ttp.tactic].push(ttp);
        }
      });

      // Tabla: cabecera = tácticas, filas = hasta 8 TTPs por columna
      const maxRows = Math.min(8, Math.max(...Object.values(tacticGroups).map(g => g.length), 1));
      const colW = TACTICS.map(() => 12.3 / TACTICS.length);

      // Header row
      const headerRow = TACTICS.map(t => {
        const count = tacticGroups[t.key].length;
        return {
          text: `${t.label}\n(${count})`,
          options: {
            bold: true, color: C.ACCENT, fill: { color: C.ACCENT_L },
            fontSize: 6.5, align: 'center', valign: 'middle',
          },
        };
      });

      // Data rows
      const dataRows = [];
      for (let r = 0; r < maxRows; r++) {
        const row = TACTICS.map(t => {
          const ttp = tacticGroups[t.key][r];
          if (!ttp) {
            return { text: '', options: { fontSize: 5, fill: { color: C.BG } } };
          }
          const cveCount = new Set((ttp.cves || []).map(c => c.id)).size;
          return {
            text: `${ttp.id}\n${(ttp.name || '').substring(0, 22)}\n(${cveCount} CVEs)`,
            options: {
              fontSize: 5.5, color: C.TEXT, fill: { color: cveCount > 0 ? C.ACCENT_L : C.BG_CARD },
              align: 'center', valign: 'middle',
            },
          };
        });
        dataRows.push(row);
      }

      s8.addTable([headerRow, ...dataRows], {
        x: 0.15, y: 1.2, w: 13.0,
        colW,
        border: { type: 'solid', pt: 0.3, color: C.BORDER },
        rowH: 0.7,
        autoPage: false,
      });

      // Nota al pie si hay más TTPs que filas
      const hiddenCount = Math.max(0, ...Object.values(tacticGroups).map(g => g.length - maxRows));
      if (hiddenCount > 0) {
        s8.addText(`* Se muestran las ${maxRows} primeras técnicas por táctica. Existen técnicas adicionales no visualizadas.`, {
          x: 0.5, y: 7.0, w: 12.3, h: 0.3,
          fontSize: 8, fontFace: 'Arial', italic: true, color: C.TEXT_SEC,
        });
      }
    } else {
      this._addEmptyMessage(s8, C, 'No hay TTPs mapeadas para construir la matriz MITRE.');
    }

    // ═══════════════════════════════════════
    // SLIDE 9: Heatmap ATT&CK (rejilla real)
    // ═══════════════════════════════════════
    const s9 = pres.addSlide();
    s9.background = { color: C.BG };
    this._addHeader(pres, s9, C, '07 — Heatmap de Frecuencia ATT&CK');

    if (ttpMatrix.length > 0) {
      const TACTICS = [
        { key: 'reco', label: 'Recon' },
        { key: 'resdev', label: 'Res Dev' },
        { key: 'ia', label: 'Init Acc' },
        { key: 'exec', label: 'Exec' },
        { key: 'pers', label: 'Persist' },
        { key: 'pe', label: 'Priv Esc' },
        { key: 'de', label: 'Def Eva' },
        { key: 'ca', label: 'Cred Acc' },
        { key: 'disc', label: 'Discov' },
        { key: 'lm', label: 'Lat Mov' },
        { key: 'coll', label: 'Collect' },
        { key: 'c2', label: 'C2' },
        { key: 'exfil', label: 'Exfil' },
        { key: 'impact', label: 'Impact' },
      ];

      // Agrupar y ordenar por frecuencia descendente dentro de cada táctica
      const tacticGroups = {};
      TACTICS.forEach(t => { tacticGroups[t.key] = []; });
      ttpMatrix.forEach(ttp => {
        if (tacticGroups[ttp.tactic]) {
          tacticGroups[ttp.tactic].push(ttp);
        }
      });

      // Ordenar cada columna por CVE count descendente
      Object.keys(tacticGroups).forEach(key => {
        tacticGroups[key].sort((a, b) => {
          const aCves = new Set((a.cves || []).map(c => c.id)).size;
          const bCves = new Set((b.cves || []).map(c => c.id)).size;
          return bCves - aCves;
        });
      });

      // Max global para calcular intensidad
      const maxGlobal = ttpMatrix.reduce((acc, t) => {
        return Math.max(acc, new Set((t.cves || []).map(c => c.id)).size);
      }, 1);

      const maxRows = Math.min(10, Math.max(...Object.values(tacticGroups).map(g => g.length), 1));
      const colW = TACTICS.map(() => 13.0 / TACTICS.length);

      // Función para generar color cyan graduado (simula rgba(0,255,255, intensity))
      const intensityToColor = (count) => {
        if (count === 0) return C.BG_CARD;
        const ratio = Math.min(count / maxGlobal, 1);
        const base = 0.15 + 0.85 * ratio;
        // De 111118 (BG_CARD) hacia 00FFFF (Cyan brillante)
        const r = Math.round(17 - (17 - 0) * base);
        const g = Math.round(17 + (255 - 17) * base);
        const b = Math.round(24 + (255 - 24) * base);
        return this._rgbToHex(r, g, b);
      };

      // Header row
      const headerRow = TACTICS.map(t => {
        const count = tacticGroups[t.key].length;
        return {
          text: `${t.label}\n(${count})`,
          options: {
            bold: true, color: C.TEXT, fill: { color: C.ACCENT_L },
            fontSize: 6, align: 'center', valign: 'middle',
          },
        };
      });

      // Data rows — celdas coloreadas por intensidad
      const dataRows = [];
      for (let r = 0; r < maxRows; r++) {
        const row = TACTICS.map(t => {
          const ttp = tacticGroups[t.key][r];
          if (!ttp) {
            return { text: '', options: { fontSize: 5, fill: { color: C.BG } } };
          }
          const cveCount = new Set((ttp.cves || []).map(c => c.id)).size;
          const bgColor = intensityToColor(cveCount);
          const ratio = cveCount / maxGlobal;
          const textColor = ratio > 0.35 ? '000000' : C.TEXT;

          return {
            text: `${ttp.id}\n${(ttp.name || '').substring(0, 20)}\n${cveCount}`,
            options: {
              fontSize: 5, color: textColor,
              fill: { color: bgColor },
              align: 'center', valign: 'middle',
            },
          };
        });
        dataRows.push(row);
      }

      s9.addTable([headerRow, ...dataRows], {
        x: 0.15, y: 1.15, w: 13.0,
        colW,
        border: { type: 'solid', pt: 0.2, color: C.BORDER },
        rowH: 0.58,
        autoPage: false,
      });

      // Leyenda de intensidad
      const legendY = 1.15 + (maxRows + 1) * 0.58 + 0.15;
      if (legendY < 7.0) {
        s9.addText('Leyenda de intensidad:', {
          x: 0.5, y: legendY, w: 2.5, h: 0.3,
          fontSize: 8, fontFace: 'Arial', bold: true, color: C.TEXT,
        });

        const legendSteps = [
          { label: 'Baja', color: intensityToColor(Math.round(maxGlobal * 0.15)) },
          { label: 'Media', color: intensityToColor(Math.round(maxGlobal * 0.4)) },
          { label: 'Alta', color: intensityToColor(Math.round(maxGlobal * 0.7)) },
          { label: 'Crítica', color: intensityToColor(maxGlobal) },
        ];

        legendSteps.forEach((step, i) => {
          const lx = 3.0 + i * 2.5;
          s9.addShape(pres.ShapeType.roundRect, {
            x: lx, y: legendY + 0.02, w: 0.35, h: 0.25,
            fill: { color: step.color },
            line: { color: C.BORDER, width: 0.5 },
            rectRadius: 0.03,
          });
          s9.addText(step.label, {
            x: lx + 0.42, y: legendY, w: 1.5, h: 0.3,
            fontSize: 8, fontFace: 'Arial', color: C.TEXT_SEC,
          });
        });
      }
    } else {
      this._addEmptyMessage(s9, C, 'No hay datos de TTPs para generar el heatmap.');
    }

    // ═══════════════════════════════════════
    // SLIDE 10: Antigüedad de las Vulnerabilidades (Aging)
    // ═══════════════════════════════════════
    const s10 = pres.addSlide();
    s10.background = { color: C.BG };
    this._addHeader(pres, s10, C, '08 — Antigüedad de las Vulnerabilidades (Aging)');

    const nowMs = Date.now();
    const msPerDay = 1000 * 60 * 60 * 24;

    const agingData = vulnNodes.map(n => {
      const props = n.properties || {};
      const first = props.first_detected_at;
      const updated = props.updated_at;
      
      let daysOld = null;
      let firstSeenDate = 'N/D';

      if (first || updated) {
        const firstSeenMs = first || updated || nowMs;
        daysOld = Math.floor((nowMs - firstSeenMs) / msPerDay);
        firstSeenDate = new Date(firstSeenMs).toLocaleDateString('es-ES');
      }

      return {
        cve: props.cve_id || 'N/A',
        severity: (props.severity || 'LOW').toUpperCase(),
        baseScore: props.base_score || 0,
        firstSeenDate,
        daysOld
      };
    });

    // Ordenar: primero los que tienen daysOld (descendente), luego los N/D al final
    agingData.sort((a, b) => {
      if (a.daysOld === null && b.daysOld === null) return b.baseScore - a.baseScore;
      if (a.daysOld === null) return 1;
      if (b.daysOld === null) return -1;
      return b.daysOld - a.daysOld;
    });

    if (agingData.length > 0) {
      const agingHeader = [
        { text: 'CVE ID', options: { bold: true, color: C.TEXT, fill: { color: C.ACCENT_L }, fontSize: 11, align: 'left' } },
        { text: 'Severidad', options: { bold: true, color: C.TEXT, fill: { color: C.ACCENT_L }, fontSize: 11, align: 'center' } },
        { text: 'Score CVSS', options: { bold: true, color: C.TEXT, fill: { color: C.ACCENT_L }, fontSize: 11, align: 'center' } },
        { text: 'Fecha Detección', options: { bold: true, color: C.TEXT, fill: { color: C.ACCENT_L }, fontSize: 11, align: 'center' } },
        { text: 'Días Activa', options: { bold: true, color: C.TEXT, fill: { color: C.ACCENT_L }, fontSize: 11, align: 'center' } },
      ];

      const agingRows = agingData.slice(0, 10).map((item, i) => {
        const bg = i % 2 === 0 ? C.BG : C.BG_CARD;
        const sevColor = this._sevColor(item.severity, C);
        
        let daysColor = C.TEXT;
        let daysBg = bg;
        if (item.daysOld !== null) {
          if (item.daysOld >= 90) {
            daysColor = 'FFFFFF';
            daysBg = '991B1B'; // Rojo muy oscuro
          } else if (item.daysOld >= 30) {
            daysColor = 'FFFFFF';
            daysBg = '9A3412'; // Naranja muy oscuro
          }
        }

        return [
          { text: item.cve, options: { color: C.TEXT, fontSize: 10, align: 'left', fill: { color: bg } } },
          { text: item.severity, options: { color: sevColor, fontSize: 10, bold: true, align: 'center', fill: { color: bg } } },
          { text: item.baseScore.toFixed(1), options: { color: C.TEXT_SEC, fontSize: 10, align: 'center', fill: { color: bg } } },
          { text: item.firstSeenDate, options: { color: C.TEXT_SEC, fontSize: 10, align: 'center', fill: { color: bg } } },
          { text: item.daysOld !== null ? `${item.daysOld} días` : 'N/D', options: { color: daysColor, fontSize: 10, bold: true, align: 'center', fill: { color: daysBg } } },
        ];
      });

      s10.addTable([agingHeader, ...agingRows], {
        x: 0.5, y: 1.2, w: 12.3,
        colW: [3.5, 2.5, 2.0, 2.3, 2.0],
        border: { type: 'solid', pt: 0.3, color: C.BORDER },
        rowH: 0.45,
        autoPage: false,
      });

      s10.addText('* Mostrando el top 10 de vulnerabilidades activas más antiguas en el sistema.', {
        x: 0.5, y: 6.8, w: 12.3, h: 0.3,
        fontSize: 10, fontFace: 'Arial', italic: true, color: C.TEXT_SEC,
      });
    } else {
      this._addEmptyMessage(s10, C, 'No hay vulnerabilidades para calcular su antigüedad.');
    }

    // ── Generar y descargar ──
    const safeName = projectName.toLowerCase().replace(/[^a-z0-9]/gi, '_');
    await pres.writeFile({ fileName: `${safeName}_reporte_vulnerabilidades.pptx` });
  }

  // ── Helpers ──

  _addHeader(pres, slide, C, title) {
    slide.addText(title, {
      x: 0.5, y: 0.3, w: 12.3, h: 0.6,
      fontSize: 20, fontFace: 'Arial', bold: true,
      color: C.TEXT,
    });
    slide.addShape(pres.ShapeType.rect, {
      x: 0.5, y: 0.95, w: 12.3, h: 0.02,
      fill: { color: C.BORDER },
    });
  }

  _addEmptyMessage(slide, C, message) {
    slide.addText(message, {
      x: 1, y: 3, w: 11.3, h: 1,
      fontSize: 16, fontFace: 'Arial',
      color: C.TEXT_SEC, align: 'center',
    });
  }

  _sevColor(severity, C) {
    const s = (severity || '').toUpperCase();
    if (s === 'CRITICAL') return C.CRITICAL;
    if (s === 'HIGH') return C.HIGH;
    if (s === 'MEDIUM') return C.MEDIUM;
    return C.LOW;
  }

  _normalizeTactic(tacticStr = '') {
    const str = String(tacticStr).toLowerCase();
    if (['reco','resdev','ia','exec','pers','pe','de','ca','disc','lm','coll','c2','exfil','impact'].includes(str)) return str;
    if (str.includes('recon') || str === 'ta0043') return 'reco';
    if (str.includes('resource') || str === 'ta0042') return 'resdev';
    if (str.includes('initial') || (str.includes('access') && !str.includes('cred')) || str === 'ta0001') return 'ia';
    if (str.includes('execution') || str === 'ta0002') return 'exec';
    if (str.includes('persist') || str === 'ta0003') return 'pers';
    if (str.includes('privilege') || str.includes('escalat') || str === 'ta0004') return 'pe';
    if (str.includes('defense') || str.includes('evasion') || str === 'ta0005') return 'de';
    if (str.includes('credential') || str === 'ta0006') return 'ca';
    if (str.includes('discovery') || str === 'ta0007') return 'disc';
    if (str.includes('lateral') || str.includes('movement') || str === 'ta0008') return 'lm';
    if (str.includes('collection') || str === 'ta0009') return 'coll';
    if (str.includes('command') || str.includes('control') || str === 'ta0011') return 'c2';
    if (str.includes('exfil') || str === 'ta0010') return 'exfil';
    if (str.includes('impact') || str === 'ta0040') return 'impact';
    return 'de';
  }

  _rgbToHex(r, g, b) {
    const toHex = (c) => {
      const hex = c.toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    };
    return (toHex(r) + toHex(g) + toHex(b)).toUpperCase();
  }
}
