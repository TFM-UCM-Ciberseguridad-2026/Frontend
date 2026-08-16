import * as XLSX from 'xlsx';

export class ExportInventoryUseCase {
  constructor(infrastructureRepository) {
    this.infrastructureRepository = infrastructureRepository;
  }

  /**
   * Genera y descarga un libro de Excel (.xlsx) con el inventario completo de la infraestructura extraído del backend.
   * @param {string|number} selectedProjectId - ID del proyecto seleccionado
   * @param {string} projectName - Nombre del proyecto
   * @returns {Object} Nombre del archivo y Blob binario listo para descargar
   */
  async execute(selectedProjectId, projectName = 'Proyecto') {
    if (!selectedProjectId) {
      throw new Error('No se ha seleccionado ningún proyecto para exportar inventario.');
    }

    // Pide al backend el grafo inmaculado completo sin filtros
    const exportData = await this.infrastructureRepository.exportProject(selectedProjectId);

    if (!exportData || !exportData.nodes) {
      throw new Error('El backend devolvió un formato inválido o vacío.');
    }

    // Pre-procesar relaciones para encontrar fácilmente las IPs de un Endpoint
    const endpointIpsMap = {};
    const ipNodesMap = {};
    
    exportData.nodes.forEach(n => {
      if (n.labels?.includes('IPAddress') || n.primaryLabel === 'IPAddress') {
        ipNodesMap[n.id] = n;
      }
    });

    (exportData.relationships || []).forEach(rel => {
      if (rel.type === 'HAS_IP') {
        if (!endpointIpsMap[rel.source]) endpointIpsMap[rel.source] = [];
        const targetIp = ipNodesMap[rel.target];
        if (targetIp) {
          const ipStr = targetIp.properties?.ip || 'N/A';
          const vlanStr = targetIp.properties?.vlan_id ? ` (VLAN: ${targetIp.properties.vlan_id})` : '';
          endpointIpsMap[rel.source].push(`${ipStr}${vlanStr}`);
        }
      }
    });

    // Ordenar nodos por categoría lógica y luego por nombre/ID
    const categoryOrder = {
      'Project': 1,
      'Endpoint': 2,
      'Container': 3,
      'Hardware': 4,
      'Network': 5,
      'IPAddress': 6,
      'SoftwareInstallation': 7,
      'Software': 8,
      'ContainerImage': 9,
      'Finding': 10,
      'Vulnerability': 11,
      'Remediation': 12,
      'Patch': 13
    };

    const sortedNodes = [...exportData.nodes].sort((a, b) => {
      const catA = categoryOrder[a.primaryLabel || a.labels?.[0]] || 99;
      const catB = categoryOrder[b.primaryLabel || b.labels?.[0]] || 99;
      if (catA !== catB) return catA - catB;

      const nameA = a.name || a.properties?.name || a.properties?.nombre || a.properties?.hostname || a.properties?.ip || String(a.id);
      const nameB = b.name || b.properties?.name || b.properties?.nombre || b.properties?.hostname || b.properties?.ip || String(b.id);
      return nameA.localeCompare(nameB);
    });

    const wb = XLSX.utils.book_new();

    // 1. HOJA MASTER: Inventario General
    const masterRows = sortedNodes.map(n => {
      const p = n.properties || {};
      const cat = n.primaryLabel || n.labels?.[0] || 'Asset';
      const name = n.name || p.name || p.nombre || p.hostname || p.title || p.cve_id || p.ip || String(n.id);
      
      let locationOrPath = p.ip_address || p.ip || p.path || p.cidr || p.subnet || 'N/A';
      // Si es un Endpoint o Container, mostrar sus IPs conectadas si las hay
      if ((cat === 'Endpoint' || cat === 'Container') && endpointIpsMap[n.id] && endpointIpsMap[n.id].length > 0) {
        locationOrPath = endpointIpsMap[n.id].join(', ');
      }

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
      
      // Eliminar el array sucio si existía para que no se imprima [object Object]
      if (propsCopy.ips) delete propsCopy.ips; 

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

    // 2. HOJA: Endpoints, Hardware y Contenedores
    const endpointRows = sortedNodes
      .filter(n => ['Endpoint', 'Hardware', 'Container'].includes(n.primaryLabel || n.labels?.[0]))
      .map(n => {
        const p = n.properties || {};
        const isEndpointOrContainer = ['Endpoint', 'Container'].includes(n.primaryLabel || n.labels?.[0]);
        
        let ipInfo = p.ip_address || p.ip || 'N/A';
        if (isEndpointOrContainer && endpointIpsMap[n.id] && endpointIpsMap[n.id].length > 0) {
          ipInfo = endpointIpsMap[n.id].join(', ');
        }

        return {
          'ID': n.id,
          'Categoría': n.primaryLabel || n.labels?.[0],
          'Nombre / Hostname': p.hostname || p.name || n.name,
          'Dirección IP': ipInfo,
          'Sistema Operativo / Imagen': p.os || p.operating_system || p.image_id || 'N/A',
          'Estado': p.status || p.state || 'Activo',
          'Hardware / Especificaciones': p.cpu || p.ram || p.specs || 'N/A',
          'Descripción': p.description || ''
        };
      });

    if (endpointRows.length > 0) {
      const epSheet = XLSX.utils.json_to_sheet(endpointRows);
      XLSX.utils.book_append_sheet(wb, epSheet, 'Endpoints y Contenedores');
    }

    // 3. HOJA: Redes e IPs
    const networkRows = sortedNodes
      .filter(n => ['Network', 'IPAddress'].includes(n.primaryLabel || n.labels?.[0]))
      .map(n => {
        const p = n.properties || {};
        const isIP = (n.primaryLabel || n.labels?.[0]) === 'IPAddress';
        return {
          'ID': n.id,
          'Categoría': n.primaryLabel || n.labels?.[0],
          'Nombre / IP': p.name || p.nombre || p.ip || n.name,
          'Rango CIDR / VLAN': p.cidr || p.subnet || p.ip_range || (p.vlan_id ? `VLAN ${p.vlan_id}` : 'N/A'),
          'Tipo de Red': p.type || p.tipo || (isIP ? 'Dirección IP' : 'LAN'),
          'Descripción': p.description || ''
        };
      });

    if (networkRows.length > 0) {
      const netSheet = XLSX.utils.json_to_sheet(networkRows);
      XLSX.utils.book_append_sheet(wb, netSheet, 'Redes e IPs');
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
