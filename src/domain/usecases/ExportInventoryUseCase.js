import * as XLSX from 'xlsx';

export class ExportInventoryUseCase {
  /**
   * Genera y descarga un libro de Excel (.xlsx) con el inventario completo de la infraestructura.
   * @param {Object} graphData - Grafo de infraestructura ({ nodes: [], relationships: [] })
   * @param {string|number} selectedProjectId - ID del proyecto seleccionado
   * @returns {Object} Nombre del archivo y Blob binario listo para descargar
   */
  execute(graphData, selectedProjectId) {
    if (!graphData || !graphData.nodes || graphData.nodes.length === 0) {
      throw new Error('No hay datos de inventario para exportar.');
    }

    const projectNode = graphData.nodes.find(
      n => (n.labels?.includes('Project') || n.primaryLabel === 'Project') &&
          String(n.properties?.id ?? n.id) === String(selectedProjectId)
    ) || graphData.nodes.find(n => n.labels?.includes('Project') || n.primaryLabel === 'Project');

    const projectName = projectNode?.properties?.nombre || projectNode?.properties?.name || 'Proyecto';

    // Ordenar nodos por categoría lógica y luego por nombre/ID
    const categoryOrder = {
      'Project': 1,
      'Endpoint': 2,
      'Network': 3,
      'Hardware': 4,
      'SoftwareInstallation': 5,
      'Software': 6,
      'Finding': 7,
      'Vulnerability': 8,
      'Remediation': 9,
      'Patch': 10
    };

    const sortedNodes = [...graphData.nodes].sort((a, b) => {
      const catA = categoryOrder[a.primaryLabel || a.labels?.[0]] || 99;
      const catB = categoryOrder[b.primaryLabel || b.labels?.[0]] || 99;
      if (catA !== catB) return catA - catB;

      const nameA = a.name || a.properties?.name || a.properties?.nombre || a.properties?.hostname || String(a.id);
      const nameB = b.name || b.properties?.name || b.properties?.nombre || b.properties?.hostname || String(b.id);
      return nameA.localeCompare(nameB);
    });

    const wb = XLSX.utils.book_new();

    // 1. HOJA MASTER: Inventario General
    const masterRows = sortedNodes.map(n => {
      const p = n.properties || {};
      const cat = n.primaryLabel || n.labels?.[0] || 'Asset';
      const name = n.name || p.name || p.nombre || p.hostname || p.title || p.cve_id || String(n.id);
      const locationOrPath = p.ip_address || p.ip || p.path || p.cidr || p.subnet || 'N/A';
      const statusOrSev = p.severity || p.status || p.risk_tier || 'N/A';
      const desc = p.description || p.descripcion || '';

      const propsCopy = { ...p };
      delete propsCopy.id;
      delete propsCopy.name;
      delete propsCopy.nombre;
      delete propsCopy.hostname;
      delete propsCopy.title;
      delete propsCopy.description;
      delete propsCopy.descripcion;
      const propsStr = Object.entries(propsCopy).map(([k, v]) => `${k}: ${v}`).join(' | ');

      return {
        'ID': n.id,
        'Categoría': cat,
        'Nombre / Título': name,
        'Ubicación / IP / Path': locationOrPath,
        'Estado / Severidad': statusOrSev,
        'Descripción': desc,
        'Atributos Adicionales': propsStr
      };
    });

    const masterSheet = XLSX.utils.json_to_sheet(masterRows);
    XLSX.utils.book_append_sheet(wb, masterSheet, 'Inventario General');

    // 2. HOJA: Endpoints y Hardware
    const endpointRows = sortedNodes
      .filter(n => ['Endpoint', 'Hardware'].includes(n.primaryLabel || n.labels?.[0]))
      .map(n => {
        const p = n.properties || {};
        return {
          'ID': n.id,
          'Categoría': n.primaryLabel || n.labels?.[0],
          'Nombre / Hostname': p.hostname || p.name || n.name,
          'Dirección IP': p.ip_address || p.ip || 'N/A',
          'Sistema Operativo': p.os || p.operating_system || 'N/A',
          'Estado': p.status || 'Activo',
          'Hardware / Especificaciones': p.cpu || p.ram || p.specs || 'N/A',
          'Descripción': p.description || ''
        };
      });

    if (endpointRows.length > 0) {
      const epSheet = XLSX.utils.json_to_sheet(endpointRows);
      XLSX.utils.book_append_sheet(wb, epSheet, 'Endpoints y Hardware');
    }

    // 3. HOJA: Redes
    const networkRows = sortedNodes
      .filter(n => (n.primaryLabel || n.labels?.[0]) === 'Network')
      .map(n => {
        const p = n.properties || {};
        return {
          'ID': n.id,
          'Nombre Red': p.name || p.nombre || n.name,
          'Rango IP / CIDR': p.cidr || p.subnet || p.ip_range || 'N/A',
          'Tipo de Red': p.type || p.tipo || 'LAN',
          'Descripción': p.description || ''
        };
      });

    if (networkRows.length > 0) {
      const netSheet = XLSX.utils.json_to_sheet(networkRows);
      XLSX.utils.book_append_sheet(wb, netSheet, 'Redes');
    }

    // 4. HOJA: Software e Instalaciones
    const softwareRows = sortedNodes
      .filter(n => ['Software', 'SoftwareInstallation'].includes(n.primaryLabel || n.labels?.[0]))
      .map(n => {
        const p = n.properties || {};
        return {
          'ID': n.id,
          'Categoría': n.primaryLabel || n.labels?.[0],
          'Software / Componente': p.name || p.nombre || n.name,
          'Ruta / Path': p.path || 'N/A',
          'Versión': p.version || 'N/A',
          'Estado Ejecución': p.status || 'Running',
          'Descripción': p.description || ''
        };
      });

    if (softwareRows.length > 0) {
      const swSheet = XLSX.utils.json_to_sheet(softwareRows);
      XLSX.utils.book_append_sheet(wb, swSheet, 'Software e Instalaciones');
    }

    // 5. HOJA: Vulnerabilidades y Hallazgos
    const vulnRows = sortedNodes
      .filter(n => ['Finding', 'Vulnerability'].includes(n.primaryLabel || n.labels?.[0]))
      .map(n => {
        const p = n.properties || {};
        const ttps = Array.isArray(p.ttps) ? p.ttps.join(', ') : (p.ttps || 'N/A');
        return {
          'ID': n.id,
          'Categoría': n.primaryLabel || n.labels?.[0],
          'CVE / Identificador': p.cve_id || p.cve || n.id,
          'Título Hallazgo': p.title || p.name || n.name,
          'Severidad': p.severity || 'N/A',
          'Puntuación CVSS': p.cvss_score || p.cvss || 'N/A',
          'TTPs MITRE Asociadas': ttps,
          'Descripción': p.description || ''
        };
      });

    if (vulnRows.length > 0) {
      const vulnSheet = XLSX.utils.json_to_sheet(vulnRows);
      XLSX.utils.book_append_sheet(wb, vulnSheet, 'Vulnerabilidades y Hallazgos');
    }

    // Generar buffer XLSX binario
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

    return {
      filename: `${projectName.toLowerCase().replace(/[^a-z0-9]/gi, '_')}_inventario.xlsx`,
      blob: blob
    };
  }
}
