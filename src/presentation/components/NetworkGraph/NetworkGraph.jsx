import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { NodeIcon } from './NodeIcon';
import { getGraphFilterLineageMaps } from '../../utils/graphFilterUtils';

const PHYSICS = {
  repulsion: 8500,
  springLength: 190,
  springConstant: 0.015,
  damping: 0.09,
  centralGravity: 0.02,
  avoidOverlapPadding: 38,
  maxSpeed: 18
};

const CANVAS_MIN = -5000;
const CANVAS_MAX = 5000;
const CANVAS_WIDTH = CANVAS_MAX - CANVAS_MIN;  // 10000
const CANVAS_HEIGHT = CANVAS_MAX - CANVAS_MIN; // 10000

const WORLD_CENTER_X = (CANVAS_MIN + CANVAS_MAX) / 2; // 0
const WORLD_CENTER_Y = (CANVAS_MIN + CANVAS_MAX) / 2; // 0

const INITIAL_VIEW_W = 900;
const INITIAL_VIEW_H = 640;

const getLayerY = (categoryId, primaryLabel, labels = []) => {
  const cat = (categoryId || primaryLabel || labels[0] || '').toLowerCase();
  switch (cat) {
    case 'proyecto': case 'project': return -220;
    case 'red': case 'network': return -140;
    case 'endpoint': return -40;
    case 'container': case 'contenedor': return 10;
    case 'instalacion': case 'installation': case 'softwareinstallation': return 60;
    case 'hardware':
    case 'software': return 160;
    case 'hallazgo': case 'finding': return 240;
    case 'vulnerabilidad': case 'vulnerability':
    case 'remediacion': case 'remediation': return 300;
    default: return 0;
  }
};

const getNodeColor = (categoryId, primaryLabel, labels = []) => {
  const cat = (categoryId || primaryLabel || labels[0] || '').toLowerCase();
  switch (cat) {
    case 'proyecto': case 'project': return '#4D3BFF';
    case 'red': case 'network': return '#7973FF';
    case 'endpoint': return '#FFFFFF';
    case 'hardware': return '#a855f7';
    case 'instalacion': case 'softwareinstallation': return '#3813FF';
    case 'container': case 'contenedor': case 'containerimage': return '#0db7ed';
    case 'software': return '#CDCFFF';
    case 'hallazgo': case 'finding': return '#f59e0b';
    case 'vulnerabilidad': case 'vulnerability': return '#ef4444';
    case 'remediacion': case 'remediation': return '#2701D6';
    case 'parche': return '#2103A9';
    default: return '#A5A5FF';
  }
};

const getNodeRadius = (categoryId, primaryLabel, labels = []) => {
  const cat = (categoryId || primaryLabel || labels[0] || '').toLowerCase();
  switch (cat) {
    case 'proyecto': case 'project': return 32;
    case 'red': case 'network': return 28;
    case 'endpoint': return 26;
    case 'container': case 'contenedor': case 'containerimage': return 22;
    case 'hardware': return 22;
    case 'instalacion': case 'softwareinstallation': return 20;
    default: return 18;
  }
};

const getTierColor = (tier) => {
  switch ((tier || '').toUpperCase()) {
    case 'CRITICAL': return '#74050e';
    case 'HIGH': return '#eb250f';
    case 'MEDIUM': return '#ea6a08';
    case 'LOW': return '#e7ee17';
    default: return null;
  }
};

const isDecommissionedEndpoint = (node) => {
  if (!node) return false;
  const isEp = node.primaryLabel === 'Endpoint' || (node.labels || []).includes('Endpoint') || node.categoryId === 'endpoint';
  if (!isEp) return false;
  const estado = (node.properties?.estado || node.properties?.status || '').toString().toLowerCase().trim();
  return estado === 'decommissioned' || estado === 'decomisado';
};

// Dibuja los iconos vectoriales directamente sobre el contexto 2D de Canvas con altísima fidelidad
function drawCanvasNodeIcon(ctx, categoryId, primaryLabel, color, size) {
  const cat = (categoryId || primaryLabel || '').toLowerCase();
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 1.8;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const scale = size / 24;
  ctx.scale(scale, scale);
  ctx.translate(-12, -12);

  ctx.beginPath();
  switch (cat) {
    case 'proyecto':
    case 'project':
      ctx.roundRect ? ctx.roundRect(5, 3, 15, 18, 2) : ctx.rect(5, 3, 15, 18);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(9, 7); ctx.lineTo(16, 7);
      ctx.moveTo(9, 11); ctx.lineTo(16, 11);
      ctx.moveTo(9, 15); ctx.lineTo(13, 15);
      ctx.moveTo(3, 6); ctx.lineTo(7, 6);
      ctx.moveTo(3, 10); ctx.lineTo(7, 10);
      ctx.moveTo(3, 14); ctx.lineTo(7, 14);
      ctx.moveTo(3, 18); ctx.lineTo(7, 18);
      ctx.stroke();
      break;

    case 'red':
    case 'network':
      ctx.rect(9, 2, 6, 6);
      ctx.rect(2, 16, 6, 6);
      ctx.rect(16, 16, 6, 6);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(12, 8); ctx.lineTo(12, 12);
      ctx.moveTo(5, 16); ctx.lineTo(5, 14); ctx.lineTo(19, 14); ctx.lineTo(19, 16);
      ctx.stroke();
      break;

    case 'endpoint':
      ctx.rect(2, 3, 20, 13);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(12, 16); ctx.lineTo(12, 20);
      ctx.moveTo(8, 20); ctx.lineTo(16, 20);
      ctx.moveTo(6, 8); ctx.lineTo(12, 8);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(15, 8, 1, 0, Math.PI * 2);
      ctx.fill();
      break;

    case 'hardware':
      // Icono de Procesador / Chip Hardware
      ctx.rect(5, 5, 14, 14);
      ctx.stroke();
      ctx.rect(9, 9, 6, 6);
      ctx.stroke();
      ctx.beginPath();
      // Pines exteriores del procesador
      ctx.moveTo(8, 2); ctx.lineTo(8, 5);
      ctx.moveTo(12, 2); ctx.lineTo(12, 5);
      ctx.moveTo(16, 2); ctx.lineTo(16, 5);
      ctx.moveTo(8, 19); ctx.lineTo(8, 22);
      ctx.moveTo(12, 19); ctx.lineTo(12, 22);
      ctx.moveTo(16, 19); ctx.lineTo(16, 22);
      ctx.moveTo(2, 8); ctx.lineTo(5, 8);
      ctx.moveTo(2, 12); ctx.lineTo(5, 12);
      ctx.moveTo(2, 16); ctx.lineTo(5, 16);
      ctx.moveTo(19, 8); ctx.lineTo(22, 8);
      ctx.moveTo(19, 12); ctx.lineTo(22, 12);
      ctx.moveTo(19, 16); ctx.lineTo(22, 16);
      ctx.stroke();
      break;

    case 'container':
    case 'contenedor':
    case 'containerimage':
      ctx.rect(4, 12, 16, 8);
      ctx.rect(6, 8, 4, 4);
      ctx.rect(10, 8, 4, 4);
      ctx.rect(14, 8, 4, 4);
      ctx.rect(10, 4, 4, 4);
      ctx.stroke();
      break;

    case 'instalacion':
    case 'softwareinstallation':
      ctx.moveTo(21, 16); ctx.lineTo(21, 8); ctx.lineTo(12, 3); ctx.lineTo(3, 8); ctx.lineTo(3, 16); ctx.lineTo(12, 21); ctx.closePath();
      ctx.moveTo(3.27, 6.96); ctx.lineTo(12, 12.01); ctx.lineTo(20.73, 6.96);
      ctx.moveTo(12, 22.08); ctx.lineTo(12, 12);
      ctx.stroke();
      break;

    case 'software':
      ctx.rect(3, 3, 18, 18);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(7, 9); ctx.lineTo(10.5, 12); ctx.lineTo(7, 15);
      ctx.moveTo(13, 15); ctx.lineTo(17, 15);
      ctx.stroke();
      break;

    case 'hallazgo':
    case 'finding':
      ctx.arc(11, 11, 7, 0, Math.PI * 2);
      ctx.moveTo(21, 21); ctx.lineTo(16.05, 16.05);
      ctx.moveTo(11, 8); ctx.lineTo(11, 11.5);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(11, 14, 1, 0, Math.PI * 2);
      ctx.fill();
      break;

    case 'vulnerabilidad':
    case 'vulnerability':
      ctx.moveTo(10.29, 3.86); ctx.lineTo(1.82, 18); ctx.lineTo(22.18, 18); ctx.closePath();
      ctx.moveTo(12, 9); ctx.lineTo(12, 13);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(12, 16.5, 1, 0, Math.PI * 2);
      ctx.fill();
      break;

    case 'remediacion':
    case 'remediation':
    case 'parche':
    case 'patch':
      ctx.moveTo(12, 22); ctx.lineTo(20, 18); ctx.lineTo(20, 5); ctx.lineTo(12, 2); ctx.lineTo(4, 5); ctx.lineTo(4, 18); ctx.closePath();
      ctx.moveTo(9, 12); ctx.lineTo(11, 14); ctx.lineTo(15, 10);
      ctx.stroke();
      break;

    default:
      ctx.arc(12, 12, 8, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(12, 12, 3, 0, Math.PI * 2);
      ctx.fill();
      break;
  }

  ctx.restore();
}

function getNodeDepth(n) {
  const cat = (n.categoryId || '').toLowerCase().trim();
  const label = (n.primaryLabel || n.labels?.[0] || '').toLowerCase().trim();
  const labels = (n.labels || []).map(l => String(l).toLowerCase().trim());

  if (cat === 'red' || cat === 'network' || label === 'network' || labels.includes('network') || labels.includes('subnet')) return 0;
  if (cat === 'proyecto' || cat === 'project' || label === 'project' || labels.includes('project')) return 1;
  if (cat === 'endpoint' || label === 'endpoint' || labels.includes('endpoint')) return 2;
  // IMPORTANTE: ContainerImage debe evaluarse ANTES que Container
  if (cat.includes('imagen') || cat.includes('image') || label.includes('containerimage') || labels.some(l => l.includes('containerimage'))) return 3.2;
  if (cat === 'container' || cat === 'contenedor' || label === 'container' || (labels.includes('container') && !labels.some(l => l.includes('containerimage')))) return 3;
  if (cat === 'instalacion' || cat === 'installation' || cat === 'softwareinstallation' || label === 'installation' || label === 'softwareinstallation' || labels.includes('installation') || labels.includes('softwareinstallation')) return 3.5;
  if (cat === 'hardware' || label === 'hardware' || labels.includes('hardware') || cat === 'software' || label === 'software' || labels.includes('software')) return 4;
  if (cat === 'hallazgo' || cat === 'finding' || label === 'finding' || labels.includes('finding')) return 4.5;
  if (cat === 'vulnerabilidad' || cat === 'remediacion' || cat === 'parche' || label === 'vulnerability' || label === 'remediation' || labels.includes('vulnerability') || labels.includes('remediation')) return 5;
  return 4;
}

function getCanonicalNodeId(rawId, nodes) {
  if (!rawId || !nodes) return String(rawId);
  const targetStr = String(rawId);
  const found = nodes.find(n => String(n.id) === targetStr || String(n.properties?.id) === targetStr);
  return found ? String(found.id) : targetStr;
}

function getHierarchyData(nodes, relationships) {
  if (!nodes || nodes.length === 0) {
    return { depthMap: new Map(), primaryParentMap: new Map(), childrenSetMap: new Map() };
  }

  const depthMap = new Map();
  nodes.forEach(n => depthMap.set(String(n.id), getNodeDepth(n)));

  const primaryParentMap = new Map();
  const childrenSetMap = new Map();
  nodes.forEach(n => childrenSetMap.set(String(n.id), new Set()));

  const rels = relationships || [];
  rels.forEach(rel => {
    const s = getCanonicalNodeId(rel.source, nodes);
    const t = getCanonicalNodeId(rel.target, nodes);
    const dS = depthMap.get(s);
    const dT = depthMap.get(t);
    if (dS === undefined || dT === undefined) return;

    // Ignorar aristas donde alguno de los nodos es una Red (depth 0)
    if (dS === 0 || dT === 0) return;

    if (dS !== dT) {
      const parentId = dS < dT ? s : t;
      const childId = dS < dT ? t : s;
      const parentDepth = dS < dT ? dS : dT;

      const currentParentId = primaryParentMap.get(childId);
      if (!currentParentId) {
        primaryParentMap.set(childId, parentId);
      } else {
        const currentParentDepth = depthMap.get(currentParentId) || 0;
        // Preferir el padre real con mayor profundidad (más cercano al nodo hijo)
        if (parentDepth > currentParentDepth) {
          primaryParentMap.set(childId, parentId);
        }
      }
    }
  });

  // Pasada de protección: si un nodo Finding/Vulnerability/Software/ContainerImage quedó apuntando a Project (depth 1)
  // pero tiene una conexión a un Endpoint/Container/Installation (depth >= 2), forzar la reasignación
  // a ese Endpoint/Container para garantizar que se colapse al plegar el Endpoint.
  rels.forEach(rel => {
    const s = getCanonicalNodeId(rel.source, nodes);
    const t = getCanonicalNodeId(rel.target, nodes);
    const dS = depthMap.get(s) || 0;
    const dT = depthMap.get(t) || 0;

    if (dS >= 2 && dT >= 2 && dS !== dT) {
      const parentId = dS < dT ? s : t;
      const childId = dS < dT ? t : s;
      const currentParentId = primaryParentMap.get(childId);
      if (currentParentId) {
        const currentParentDepth = depthMap.get(currentParentId) || 0;
        if (currentParentDepth === 1) { // Si apuntaba a Project
          primaryParentMap.set(childId, parentId);
        }
      }
    }
  });

  primaryParentMap.forEach((parentId, childId) => {
    if (childrenSetMap.has(parentId)) {
      childrenSetMap.get(parentId).add(childId);
    }
  });

  return { depthMap, primaryParentMap, childrenSetMap };
}

export function NetworkGraph({
  graphData,
  filterType,
  searchQuery,
  graphAdvancedFilters,
  loading,
  error,
  selectedNode,
  setSelectedNode,
  fetchInfrastructure,
  fetchTopAPTs,
  selectedExploitationPath,
  clearSelectedExploitationPath
}) {
  const [layoutMode, setLayoutMode] = useState('tree'); // 'layered', 'tree', 'stix'
  const [collapsedNodeIds, setCollapsedNodeIds] = useState(new Set()); // IDs de nodos cuyo subárbol está plegado
  const nodesRef = useRef([]);
  const nodeMapRef = useRef(new Map());
  const alphaRef = useRef(1.0); // Factor de enfriamiento físico
  const draggedNodeIdRef = useRef(null);
  const dragSwapPartnerRef = useRef(null);
  const dragSnapTargetRef = useRef(null);
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const [canvasEl, setCanvasEl] = useState(null);
  const canvasCallbackRef = useCallback((node) => {
    canvasRef.current = node;
    setCanvasEl(node);
  }, []);
  const animationFrameRef = useRef(null);
  const hasInitialTreeFitRef = useRef(false);

  const collapseToLevels012 = useCallback(() => {
    if (!graphData?.nodes || !graphData?.relationships) return;
    const { depthMap, childrenSetMap } = getHierarchyData(graphData.nodes, graphData.relationships);
    const initialCollapsed = new Set();
    childrenSetMap.forEach((childrenSet, parentId) => {
      const d = depthMap.get(parentId);
      if (childrenSet.size > 0 && d >= 2) {
        initialCollapsed.add(parentId);
      }
    });
    setCollapsedNodeIds(initialCollapsed);
    alphaRef.current = 1.0;
  }, [graphData]);

  useEffect(() => {
    hasInitialTreeFitRef.current = false;
    setCollapsedNodeIds(new Set()); // Desplegado por defecto al abrir por primera vez
  }, [graphData]);

  const toggleNodeCollapse = useCallback((nodeId) => {
    const idStr = String(nodeId);
    setCollapsedNodeIds(prev => {
      const next = new Set(prev);
      if (next.has(idStr)) {
        next.delete(idStr);
      } else {
        next.add(idStr);
      }
      return next;
    });
    alphaRef.current = 1.0; // Re-activar física para reajuste fluido
  }, []);

  const expandAllNodes = useCallback(() => {
    setCollapsedNodeIds(new Set());
    alphaRef.current = 1.0;
  }, []);

  const collapseAllNodes = useCallback(() => {
    collapseToLevels012();
  }, [collapseToLevels012]);

  // Reloj
  const [timeStr, setTimeStr] = useState('--:--:--');
  const [dateStr, setDateStr] = useState('-----');

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setTimeStr(now.toLocaleTimeString('es-ES'));
      setDateStr(now.toLocaleDateString('es-ES', {
        weekday: 'short',
        day: '2-digit',
        month: 'short'
      }).toUpperCase());
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, []);

  const [viewBox, setViewBox] = useState({
    x: -INITIAL_VIEW_W / 2,
    y: -INITIAL_VIEW_H / 2,
    w: INITIAL_VIEW_W,
    h: INITIAL_VIEW_H
  });
  const viewBoxRef = useRef(viewBox);

  useEffect(() => {
    viewBoxRef.current = viewBox;
  }, [viewBox]);

  useEffect(() => {
    if (nodesRef.current && nodesRef.current.length > 0) {
      nodesRef.current.forEach(node => {
        node.pinned = false;
      });
      alphaRef.current = 1.0; // Re-activar física al cambiar layout

      if (layoutMode === 'tree') {
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        nodesRef.current.forEach(n => {
          const tx = n.treeX !== undefined ? n.treeX : n.x;
          const ty = n.treeY !== undefined ? n.treeY : n.y;
          if (tx < minX) minX = tx;
          if (tx > maxX) maxX = tx;
          if (ty < minY) minY = ty;
          if (ty > maxY) maxY = ty;
        });

        const padding = 220;
        let treeW = Math.max(INITIAL_VIEW_W, (maxX - minX) + padding * 2);
        let treeH = Math.max(INITIAL_VIEW_H, (maxY - minY) + padding * 2);
        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;

        const canvas = canvasRef.current;
        if (canvas && canvas.clientWidth > 0 && canvas.clientHeight > 0) {
          const aspect = canvas.clientWidth / canvas.clientHeight;
          if (treeW / treeH < aspect) {
            treeW = treeH * aspect;
          } else {
            treeH = treeW / aspect;
          }
        }

        setViewBox({
          x: centerX - treeW / 2,
          y: centerY - treeH / 2,
          w: treeW,
          h: treeH
        });
      }
    }
  }, [layoutMode]);

  // Pre-procesar subárboles y visibilidad de nodos
  const visibleNodes = useMemo(() => {
    if (!graphData.nodes || graphData.nodes.length === 0) {
      return [];
    }

    const decomEndpointNodes = graphData.nodes.filter(n => isDecommissionedEndpoint(n));
    const decomEndpointIds = new Set(decomEndpointNodes.map(n => String(n.id)));

    const rels = graphData.relationships || [];
    const nodeMap = new Map(graphData.nodes.map(n => [String(n.id), n]));
    const adj = new Map();

    graphData.nodes.forEach(n => adj.set(String(n.id), []));
    rels.forEach(rel => {
      const s = String(rel.source);
      const t = String(rel.target);
      if (adj.has(s) && adj.has(t)) {
        adj.get(s).push(t);
        adj.get(t).push(s);
      }
    });

    const hiddenSubtreeNodeIds = new Set();
    const collapsedArray = Array.from(collapsedNodeIds);
    const queue = [...decomEndpointIds, ...collapsedArray];
    const visited = new Set([...decomEndpointIds, ...collapsedArray]);

    while (queue.length > 0) {
      const currId = queue.shift();
      const currNode = nodeMap.get(currId);
      const currDepth = currNode ? getNodeDepth(currNode) : 0;
      const neighbors = adj.get(currId) || [];

      for (const nbrId of neighbors) {
        if (!visited.has(nbrId)) {
          const nbrNode = nodeMap.get(nbrId);
          if (nbrNode) {
            const nbrDepth = getNodeDepth(nbrNode);
            const label = nbrNode.primaryLabel || nbrNode.labels?.[0] || '';
            const labels = nbrNode.labels || [];
            const isNet = label === 'Network' || labels.includes('Network');
            const isProj = label === 'Project' || labels.includes('Project');
            const isOtherEp = label === 'Endpoint' || labels.includes('Endpoint');

            // CRÍTICO: Solamente recorrer hacia abajo en profundidad (nbrDepth > currDepth)
            // para evitar que la semilla de un hijo oculto elimine al padre (Container) al desplegar.
            if (!isNet && !isProj && !isOtherEp && nbrDepth > currDepth) {
              visited.add(nbrId);
              hiddenSubtreeNodeIds.add(nbrId);
              queue.push(nbrId);
            }
          }
        }
      }
    }

    const { primaryParentMap } = getHierarchyData(graphData.nodes, graphData.relationships);

    // Evaluación Top-Down de Visibilidad de Nodos:
    // Un nodo C es visible sólo si ninguno de sus ancestros directos está colapsado.
    const isAncestorCollapsed = (nodeId) => {
      let currId = String(nodeId);
      const visitedChain = new Set();
      while (currId && !visitedChain.has(currId)) {
        visitedChain.add(currId);
        const parentId = primaryParentMap.get(currId);
        if (!parentId) break;
        if (collapsedNodeIds.has(parentId)) {
          return true; // Si el padre o cualquier ancestro está colapsado, el hijo se oculta
        }
        currId = parentId;
      }
      return false;
    };

    return graphData.nodes.filter(n => {
      const idStr = String(n.id);
      if (n.labels.includes('TTP') || n.labels.includes('ThreatActor') || n.labels.includes('Vulnerability')) {
        return false;
      }
      if (hiddenSubtreeNodeIds.has(idStr)) return false;
      if (isAncestorCollapsed(idStr)) return false;
      return true;
    });
  }, [graphData, collapsedNodeIds]);

  // Inicializar posiciones de nodos
  useEffect(() => {
    if (!visibleNodes || visibleNodes.length === 0) {
      nodesRef.current = [];
      nodeMapRef.current = new Map();
      return;
    }

    const rels = graphData.relationships || [];
    const depths = {};
    visibleNodes.forEach(n => {
      depths[n.id] = getNodeDepth(n);
    });

    // Mapear cada Endpoint a su ID de Red (Network) para agrupamiento por subred
    const endpointNetworkMap = new Map();
    rels.forEach(rel => {
      const s = String(rel.source);
      const t = String(rel.target);
      const nodeA = visibleNodes.find(n => String(n.id) === s);
      const nodeB = visibleNodes.find(n => String(n.id) === t);
      if (!nodeA || !nodeB) return;

      const isNetA = nodeA.primaryLabel === 'Network' || nodeA.categoryId === 'red' || (nodeA.labels || []).includes('Network');
      const isNetB = nodeB.primaryLabel === 'Network' || nodeB.categoryId === 'red' || (nodeB.labels || []).includes('Network');
      const isEpA = nodeA.primaryLabel === 'Endpoint' || nodeA.categoryId === 'endpoint' || (nodeA.labels || []).includes('Endpoint');
      const isEpB = nodeB.primaryLabel === 'Endpoint' || nodeB.categoryId === 'endpoint' || (nodeB.labels || []).includes('Endpoint');

      if (isNetA && isEpB) {
        endpointNetworkMap.set(t, s);
      } else if (isNetB && isEpA) {
        endpointNetworkMap.set(s, t);
      }
    });

    // Cómputo de posiciones objetivo deterministas con Tidier Trees (Asignación Recursiva de Ancho por Subárbol)
    const treeTargetMap = new Map();
    const childMap = new Map();
    const nodeById = new Map();

    const { primaryParentMap, childrenSetMap } = getHierarchyData(graphData.nodes, graphData.relationships);

    visibleNodes.forEach(n => {
      nodeById.set(String(n.id), n);
      childMap.set(String(n.id), []);
    });

    primaryParentMap.forEach((parentId, childId) => {
      if (nodeById.has(parentId) && nodeById.has(childId)) {
        childMap.get(parentId).push(nodeById.get(childId));
      }
    });

    // Agrupar los Endpoints hijos del Proyecto por su ID de Subred (Network Proximity Sorting)
    childMap.forEach((childrenList, parentId) => {
      const parentNode = nodeById.get(parentId);
      if (parentNode && (parentNode.primaryLabel === 'Project' || parentNode.categoryId === 'proyecto')) {
        childrenList.sort((a, b) => {
          const netA = endpointNetworkMap.get(String(a.id)) || '';
          const netB = endpointNetworkMap.get(String(b.id)) || '';
          if (netA !== netB) return netA.localeCompare(netB);
          return String(a.name || a.id).localeCompare(String(b.name || b.id));
        });
      }
    });

    // Ancho mínimo base para cada nodo hoja (garantiza cero solapamiento)
    const MIN_LEAF_SPACING = 180;
    const subtreeWidthMap = new Map();

    // 1. Pasada Bottom-Up: Calcular ancho de subárbol recursivo
    const computeSubtreeWidth = (nodeId) => {
      const children = childMap.get(String(nodeId)) || [];
      if (children.length === 0) {
        subtreeWidthMap.set(String(nodeId), MIN_LEAF_SPACING);
        return MIN_LEAF_SPACING;
      }

      let totalWidth = 0;
      children.forEach(ch => {
        totalWidth += computeSubtreeWidth(ch.id);
      });

      const width = Math.max(MIN_LEAF_SPACING, totalWidth);
      subtreeWidthMap.set(String(nodeId), width);
      return width;
    };

    // 2. Pasada Top-Down: Posicionar subárboles de forma centrada
    const positionSubtree = (nodeId, centerX, currentY) => {
      treeTargetMap.set(String(nodeId), { x: centerX, y: currentY });

      const children = childMap.get(String(nodeId)) || [];
      if (children.length === 0) return;

      const totalChildrenWidth = children.reduce((acc, ch) => acc + (subtreeWidthMap.get(String(ch.id)) || MIN_LEAF_SPACING), 0);
      let startLeft = centerX - (totalChildrenWidth / 2);

      children.forEach(ch => {
        const chWidth = subtreeWidthMap.get(String(ch.id)) || MIN_LEAF_SPACING;
        const chCenterX = startLeft + (chWidth / 2);
        const chDepth = depths[ch.id] !== undefined ? depths[ch.id] : (depths[nodeId] + 1);
        const chY = -320 + chDepth * 190;

        positionSubtree(ch.id, chCenterX, chY);
        startLeft += chWidth;
      });
    };

    // Raíz del Árbol Principal: Proyecto (Depth 1)
    const projectRoots = visibleNodes.filter(n => depths[n.id] === 1);
    const rootsToUse = projectRoots.length > 0 ? projectRoots : (visibleNodes.length > 0 ? [visibleNodes[0]] : []);

    rootsToUse.forEach(r => computeSubtreeWidth(r.id));
    const totalRootsWidth = rootsToUse.reduce((acc, r) => acc + (subtreeWidthMap.get(String(r.id)) || MIN_LEAF_SPACING), 0);
    let currentRootLeft = WORLD_CENTER_X - (totalRootsWidth / 2);

    rootsToUse.forEach(r => {
      const rWidth = subtreeWidthMap.get(String(r.id)) || MIN_LEAF_SPACING;
      const rCenterX = currentRootLeft + (rWidth / 2);
      positionSubtree(r.id, rCenterX, -320 + 1 * 190); // -130px para Proyecto en Nivel 1
      currentRootLeft += rWidth;
    });

    // Posicionar Nodos de Red (Depth 0) en Nivel 0 (y = -320) centrados sobre sus Endpoints
    const networkNodes = visibleNodes.filter(n => depths[n.id] === 0);
    networkNodes.forEach(netNode => {
      const netIdStr = String(netNode.id);
      const connectedEndpoints = visibleNodes.filter(n => depths[n.id] === 2 && endpointNetworkMap.get(String(n.id)) === netIdStr);

      let netX = WORLD_CENTER_X;
      if (connectedEndpoints.length > 0) {
        const sumX = connectedEndpoints.reduce((acc, ep) => {
          const pos = treeTargetMap.get(String(ep.id));
          return acc + (pos ? pos.x : WORLD_CENTER_X);
        }, 0);
        netX = sumX / connectedEndpoints.length;
      }
      treeTargetMap.set(netIdStr, { x: netX, y: -320 });
    });

    // Fallback para nodos huérfanos no posicionados
    let orphanCount = 0;
    visibleNodes.forEach(n => {
      const idStr = String(n.id);
      if (!treeTargetMap.has(idStr)) {
        const d = depths[n.id] || 3;
        const fallbackX = WORLD_CENTER_X + (totalRootsWidth / 2) + 200 + (orphanCount * MIN_LEAF_SPACING);
        const fallbackY = -320 + d * 190;
        treeTargetMap.set(idStr, { x: fallbackX, y: fallbackY });
        orphanCount++;
      }
    });

    const initial = visibleNodes.map((n, i) => {
      const angle = (i / visibleNodes.length) * 2 * Math.PI;
      const initialX = Math.cos(angle) * 200;
      const isDecom = isDecommissionedEndpoint(n);
      const treePos = treeTargetMap.get(String(n.id)) || { x: 0, y: -320 + depths[n.id] * 190 };

      return {
        id: n.id,
        entity: n,
        x: layoutMode === 'tree' ? treePos.x : initialX,
        y: layoutMode === 'tree' ? treePos.y : getLayerY(n.categoryId, n.primaryLabel, n.labels),
        vx: 0,
        vy: 0,
        fx: 0,
        fy: 0,
        r: getNodeRadius(n.categoryId, n.primaryLabel, n.labels),
        color: isDecom ? '#6b7280' : getNodeColor(n.categoryId, n.primaryLabel, n.labels),
        isDecom: isDecom,
        pinned: false,
        depth: depths[n.id],
        treeX: treePos.x,
        treeY: treePos.y,
        hasChildren: (childrenSetMap.get(String(n.id)) || new Set()).size > 0,
        childCount: (childrenSetMap.get(String(n.id)) || new Set()).size
      };
    });

    nodesRef.current = initial;
    const map = new Map();
    initial.forEach(n => map.set(n.id, n));
    nodeMapRef.current = map;
    alphaRef.current = 1.0; // Resetear física para asentamiento suave

    // Encuadrar el viewBox en el árbol únicamente al inicializar por primera vez
    if (layoutMode === 'tree' && initial.length > 0 && !hasInitialTreeFitRef.current) {
      hasInitialTreeFitRef.current = true;
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      initial.forEach(n => {
        if (n.treeX < minX) minX = n.treeX;
        if (n.treeX > maxX) maxX = n.treeX;
        if (n.treeY < minY) minY = n.treeY;
        if (n.treeY > maxY) maxY = n.treeY;
      });

      const padding = 220;
      let treeW = Math.max(INITIAL_VIEW_W, (maxX - minX) + padding * 2);
      let treeH = Math.max(INITIAL_VIEW_H, (maxY - minY) + padding * 2);
      const centerX = (minX + maxX) / 2;
      const centerY = (minY + maxY) / 2;

      const canvas = canvasRef.current;
      if (canvas && canvas.clientWidth > 0 && canvas.clientHeight > 0) {
        const aspect = canvas.clientWidth / canvas.clientHeight;
        if (treeW / treeH < aspect) {
          treeW = treeH * aspect;
        } else {
          treeH = treeW / aspect;
        }
      }

      setViewBox({
        x: centerX - treeW / 2,
        y: centerY - treeH / 2,
        w: treeW,
        h: treeH
      });
    }
  }, [visibleNodes, graphData.relationships, layoutMode]);

  // Cómputo de Rutas de Ataque (Estructura en memoria O(1))
  const { pathEdgeIdSet, pathConnectorNodeIdSet, pathNodeStepMap } = useMemo(() => {
    const edgeIdSet = new Set();
    const connectorNodeIdSet = new Set();
    const nodeStepMap = new Map();

    if (!selectedExploitationPath || !graphData?.nodes) {
      return { pathEdgeIdSet: edgeIdSet, pathConnectorNodeIdSet: connectorNodeIdSet, pathNodeStepMap: nodeStepMap };
    }

    const findNodeForHostOrId = (hostName, endpointId) => {
      const hLower = (hostName || '').toLowerCase();
      const idStr = String(endpointId || '');

      return graphData.nodes.find(n => {
        const nHost = (n.properties?.hostname || n.name || '').toLowerCase();
        const nIdStr = String(n.id);
        const nPropIdStr = String(n.properties?.id || '');

        return (hLower && nHost === hLower) || (idStr && (nIdStr === idStr || nPropIdStr === idStr));
      });
    };

    const getStepFindingRefs = (step) => {
      const refs = [];
      if (step.finding_id) {
        refs.push({ id: step.finding_id, cve_id: step.vulnerability || step.cve_id || '', title: step.vulnerability || '' });
      }
      if (Array.isArray(step.finding_ids)) {
        step.finding_ids.forEach(id => refs.push({ id, cve_id: '', title: '' }));
      }
      if (Array.isArray(step.findings)) {
        step.findings.forEach(f => {
          refs.push({ id: f.id || f.finding_id || f.properties?.id, cve_id: f.cve_id || f.properties?.cve_id || '', title: f.title || f.properties?.title || f.cve_id || '' });
        });
      }
      const seen = new Set();
      return refs.filter(ref => {
        const key = String(ref.id || ref.cve_id || ref.title || '');
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    };

    const findFindingNode = (findingRef) => {
      const findingID = findingRef?.id;
      const cveID = findingRef?.cve_id;

      return graphData.nodes.find(n => {
        const labels = n.labels || [];
        const isFinding = n.primaryLabel === 'Finding' || labels.includes('Finding');
        const isVulnerability = n.primaryLabel === 'Vulnerability' || labels.includes('Vulnerability');

        if (findingID && (String(n.id) === String(findingID) || String(n.properties?.id) === String(findingID))) return true;

        if (Array.isArray(n.properties?.findings) && n.properties.findings.some(f =>
          String(f.id) === String(findingID) || String(f.finding_id) === String(findingID) ||
          String(f.properties?.id) === String(findingID) || String(f.cve_id) === String(cveID) ||
          String(f.properties?.cve_id) === String(cveID)
        )) return true;

        if (cveID && isFinding && (n.properties?.cve_id === cveID || (Array.isArray(n.properties?.cves) && n.properties.cves.includes(cveID)))) return true;
        if (cveID && isVulnerability && n.properties?.cve_id === cveID) return true;
        return false;
      });
    };

    const orderedPathNodes = [];
    const entryNode = findNodeForHostOrId(selectedExploitationPath.initialEndpoint, null) ||
      (selectedExploitationPath.steps?.[0] && findNodeForHostOrId(selectedExploitationPath.steps[0].sourceEndpoint, null));

    if (entryNode) {
      orderedPathNodes.push(entryNode);
      nodeStepMap.set(String(entryNode.id), 1);
    }

    (selectedExploitationPath.steps || []).forEach((step) => {
      const tId = step.is_container ? step.container_id : step.targetEndpointId;
      const tName = step.is_container ? step.container_name : step.targetEndpoint;
      const stepNode = findNodeForHostOrId(tName, tId);
      if (stepNode) {
        if (!orderedPathNodes.some(n => String(n.id) === String(stepNode.id))) {
          orderedPathNodes.push(stepNode);
        }
        nodeStepMap.set(String(stepNode.id), orderedPathNodes.length);
      }
    });

    const rels = graphData.relationships || [];
    const adjMap = new Map();
    rels.forEach(rel => {
      const s = String(rel.source);
      const t = String(rel.target);
      if (!adjMap.has(s)) adjMap.set(s, []);
      if (!adjMap.has(t)) adjMap.set(t, []);
      adjMap.get(s).push({ neighborId: t, relId: rel.id });
      adjMap.get(t).push({ neighborId: s, relId: rel.id });
    });

    for (let i = 0; i < orderedPathNodes.length - 1; i++) {
      const srcId = String(orderedPathNodes[i].id);
      const tgtId = String(orderedPathNodes[i + 1].id);

      const directEdge = rels.find(r =>
        (String(r.source) === srcId && String(r.target) === tgtId) ||
        (String(r.source) === tgtId && String(r.target) === srcId)
      );

      if (directEdge) {
        edgeIdSet.add(directEdge.id);
        continue;
      }

      const srcNeighbors = adjMap.get(srcId) || [];
      const tgtNeighbors = adjMap.get(tgtId) || [];
      const tgtNeighborSet = new Map(tgtNeighbors.map(item => [item.neighborId, item.relId]));

      let bestMidId = null;
      let bestRel1 = null;
      let bestRel2 = null;

      for (const srcItem of srcNeighbors) {
        if (tgtNeighborSet.has(srcItem.neighborId)) {
          const midId = srcItem.neighborId;
          const midNode = graphData.nodes.find(n => String(n.id) === String(midId));
          const primaryLabel = midNode?.primaryLabel || midNode?.labels?.[0] || '';

          if (primaryLabel === 'Network' || (midNode?.labels || []).includes('Network')) {
            bestMidId = midId;
            bestRel1 = srcItem.relId;
            bestRel2 = tgtNeighborSet.get(midId);
            break;
          }

          if (primaryLabel !== 'Project' && !(midNode?.labels || []).includes('Project')) {
            if (!bestMidId) {
              bestMidId = midId;
              bestRel1 = srcItem.relId;
              bestRel2 = tgtNeighborSet.get(midId);
            }
          }
        }
      }

      if (bestMidId) {
        edgeIdSet.add(bestRel1);
        edgeIdSet.add(bestRel2);
        connectorNodeIdSet.add(bestMidId);
      }
    }

    // Marcar ÚNICAMENTE el software, la imagen de contenedor, el hallazgo y la vulnerabilidad ESPECÍFICOS explotados en cada etapa
    (selectedExploitationPath.steps || []).forEach((step) => {
      if (!step) return;
      const tId = step.is_container ? step.container_id : step.targetEndpointId;
      const tName = step.is_container ? step.container_name : step.targetEndpoint;
      const sName = step.sourceEndpoint;
      const sId = step.container_id;

      const candidateNodes = [
        findNodeForHostOrId(tName, tId),
        findNodeForHostOrId(sName, sId)
      ].filter(Boolean);

      if (candidateNodes.length === 0) return;

      const stepCve = String(step.vulnerability || step.cve_id || '').toLowerCase().trim();
      const stepSw = String(step.software_affected || '').toLowerCase().trim();
      const stepFId = String(step.finding_id || '').trim();

      const nodes = graphData.nodes || [];
      const rels = graphData.relationships || [];

      candidateNodes.forEach(stepNode => {
        const stepNodeId = getCanonicalNodeId(stepNode.id, graphData.nodes);

        // 1. Obtener todas las instalaciones o imágenes conectadas a este equipo host/contenedor
        const hostInstallations = [];
        rels.forEach(r => {
          const s = getCanonicalNodeId(r.source, nodes);
          const t = getCanonicalNodeId(r.target, nodes);
          if (s === stepNodeId || t === stepNodeId) {
            const otherId = s === stepNodeId ? t : s;
            const otherNode = nodes.find(n => getCanonicalNodeId(n.id, nodes) === otherId);
            if (otherNode) {
              const cat = (otherNode.primaryLabel || otherNode.labels?.[0] || '').toLowerCase();
              if (['softwareinstallation', 'installation', 'containerimage'].includes(cat) || (otherNode.labels || []).some(l => ['SoftwareInstallation', 'Installation', 'ContainerImage'].includes(l))) {
                hostInstallations.push({ node: otherNode, id: otherId, relId: r.id });
              }
            }
          }
        });

        // 2. Para cada instalación/imagen del host/contenedor, buscar sus Hallazgos / Vulnerabilidades / Software conectados (1 y 2 saltos)
        let bestInstallation = null;
        let maxScore = -1;

        hostInstallations.forEach(item => {
          const siId = item.id;
          const siNode = item.node;
          const siName = String(siNode.name || siNode.properties?.name || siNode.properties?.software_name || '').toLowerCase();

          // Buscar hallazgos o vulnerabilidades conectados a esta instalación/imagen (1 y 2 saltos)
          const connectedVulnNodes = [];
          rels.forEach(r => {
            const s = getCanonicalNodeId(r.source, nodes);
            const t = getCanonicalNodeId(r.target, nodes);
            if (s === siId || t === siId) {
              const vId = s === siId ? t : s;
              const vNode = nodes.find(n => getCanonicalNodeId(n.id, nodes) === vId);
              if (vNode) {
                const vCat = (vNode.primaryLabel || vNode.labels?.[0] || '').toLowerCase();
                if (['finding', 'vulnerability', 'software'].includes(vCat) || (vNode.labels || []).some(l => ['Finding', 'Vulnerability', 'Software'].includes(l))) {
                  connectedVulnNodes.push({ node: vNode, id: vId, relId: r.id });

                  // Si es un Finding, buscar su Vulnerability conectada (segundo salto)
                  if (vCat === 'finding' || (vNode.labels || []).includes('Finding')) {
                    rels.forEach(r2 => {
                      const s2 = getCanonicalNodeId(r2.source, nodes);
                      const t2 = getCanonicalNodeId(r2.target, nodes);
                      if (s2 === vId || t2 === vId) {
                        const subId = s2 === vId ? t2 : s2;
                        const subNode = nodes.find(n => getCanonicalNodeId(n.id, nodes) === subId);
                        if (subNode && (subNode.primaryLabel === 'Vulnerability' || (subNode.labels || []).includes('Vulnerability'))) {
                          connectedVulnNodes.push({ node: subNode, id: subId, relId: r2.id, parentFindingId: vId });
                        }
                      }
                    });
                  }
                }
              }
            }
          });

          // Comprobar coincidencia con la etapa
          let score = 0;
          let hasFindingMatch = false;

          connectedVulnNodes.forEach(vItem => {
            const vName = String(vItem.node.name || vItem.node.properties?.name || vItem.node.properties?.title || '').toLowerCase();
            const vCve = String(vItem.node.properties?.cve_id || vItem.node.properties?.cve || vItem.node.properties?.finding_key || vItem.node.name || '').toLowerCase();
            const vFId = String(vItem.node.id);
            const vPropId = String(vItem.node.properties?.id || '');

            const matchesId = stepFId && (vFId === stepFId || vPropId === stepFId || vFId.endsWith(':' + stepFId) || stepFId.endsWith(':' + vPropId));
            const matchesCve = stepCve && (vCve.includes(stepCve) || vName.includes(stepCve));

            if (matchesId) { score += 100; hasFindingMatch = true; }
            if (matchesCve) { score += 50; hasFindingMatch = true; }
            if (stepSw && (siName.includes(stepSw) || vName.includes(stepSw))) score += 30;
          });

          // Solo considerar la instalación/imagen como el destino explotado si tiene un finding/CVE que coincide con el paso
          if (hasFindingMatch && score > maxScore) {
            maxScore = score;
            bestInstallation = { ...item, vulnNodes: connectedVulnNodes };
          }
        });

        // 3. Si se encontró la instalación/imagen correspondiente al paso, marcarla junto con el finding/vuln exacto
        if (bestInstallation) {
          connectorNodeIdSet.add(bestInstallation.id);
          edgeIdSet.add(bestInstallation.relId);

          // Solo añadir el finding/vuln que realmente coincide con el paso (no todos los conectados)
          bestInstallation.vulnNodes.forEach(vItem => {
            const vName = String(vItem.node.name || vItem.node.properties?.name || vItem.node.properties?.title || '').toLowerCase();
            const vCve = String(vItem.node.properties?.cve_id || vItem.node.properties?.cve || vItem.node.properties?.finding_key || vItem.node.name || '').toLowerCase();
            const vFId = String(vItem.node.id);
            const vPropId = String(vItem.node.properties?.id || '');

            const matchesId = stepFId && (vFId === stepFId || vPropId === stepFId || vFId.endsWith(':' + stepFId) || stepFId.endsWith(':' + vPropId));
            const matchesCve = stepCve && (vCve.includes(stepCve) || vName.includes(stepCve));
            const isFindingOrVuln = vItem.node.primaryLabel === 'Finding' || vItem.node.primaryLabel === 'Vulnerability' ||
              (vItem.node.labels || []).some(l => l === 'Finding' || l === 'Vulnerability');

            // Solo marcar si coincide exactamente con el paso (excluyendo el nodo Vulnerability puro)
            if (matchesId || matchesCve) {
              const isVulnNode = vItem.node.primaryLabel === 'Vulnerability' || (vItem.node.labels || []).includes('Vulnerability');
              if (!isVulnNode) {
                connectorNodeIdSet.add(vItem.id);
                edgeIdSet.add(vItem.relId);
              }
              if (vItem.parentFindingId) {
                connectorNodeIdSet.add(vItem.parentFindingId);
              }
            } else if (!isFindingOrVuln) {
              // Marcar nodos Software (no Finding/Vuln) siempre que sean de la instalación
              connectorNodeIdSet.add(vItem.id);
              edgeIdSet.add(vItem.relId);
            }
          });
        }
      });
    });

    return { pathEdgeIdSet: edgeIdSet, pathConnectorNodeIdSet: connectorNodeIdSet, pathNodeStepMap: nodeStepMap };
  }, [selectedExploitationPath, graphData]);

  // Búsqueda y Filtros ACTIVOS con mapa de linaje estructural (ancestros y descendientes de contexto)
  const lineageMaps = useMemo(() => {
    return getGraphFilterLineageMaps(
      graphData?.nodes || [],
      graphData?.relationships || [],
      filterType,
      searchQuery,
      graphAdvancedFilters
    );
  }, [graphData, filterType, searchQuery, graphAdvancedFilters]);

  // Renderizador principal en HTML5 Canvas con animación a 60 FPS
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let frameId;

    const render = () => {
      const nodes = nodesRef.current;
      const nodeMap = nodeMapRef.current;
      const alpha = alphaRef.current;

      // 1. Simulación física basada en partículas y particionado espacial (Spatial Grid)
      if (nodes.length > 0 && alpha > 0.001) {
        // Construir Spatial Grid para repulsión O(N)
        const CELL_SIZE = 250;
        const grid = new Map();

        for (let i = 0; i < nodes.length; i++) {
          const n = nodes[i];
          const cx = Math.floor(n.x / CELL_SIZE);
          const cy = Math.floor(n.y / CELL_SIZE);
          const key = `${cx},${cy}`;
          if (!grid.has(key)) grid.set(key, []);
          grid.get(key).push(n);
          n.fx = 0;
          n.fy = 0;
        }

        // Repulsión física espacial
        for (let i = 0; i < nodes.length; i++) {
          const a = nodes[i];
          const cx = Math.floor(a.x / CELL_SIZE);
          const cy = Math.floor(a.y / CELL_SIZE);

          for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
              const key = `${cx + dx},${cy + dy}`;
              const neighbors = grid.get(key);
              if (!neighbors) continue;

              for (let j = 0; j < neighbors.length; j++) {
                const b = neighbors[j];
                if (a.id === b.id) continue;

                const ndx = a.x - b.x;
                const ndy = a.y - b.y;
                const dist = Math.sqrt(ndx * ndx + ndy * ndy) || 0.01;
                const minDist = a.r + b.r + PHYSICS.avoidOverlapPadding;

                if (dist < minDist * 4) {
                  const force = (PHYSICS.repulsion / (dist * dist)) * alpha;
                  a.fx += (ndx / dist) * force;
                  a.fy += (ndy / dist) * force;
                }

                if (dist < minDist) {
                  const overlap = minDist - dist;
                  a.fx += (ndx / dist) * overlap * 0.4 * alpha;
                  a.fy += (ndy / dist) * overlap * 0.4 * alpha;
                }
              }
            }
          }
        }

        // Fuerza de Muelles (Springs) sobre Relaciones O(1)
        const rels = graphData.relationships || [];
        for (let r = 0; r < rels.length; r++) {
          const rel = rels[r];
          if (rel.type === 'CONTAINS_NETWORK') continue;

          const source = nodeMap.get(rel.source);
          const target = nodeMap.get(rel.target);
          if (!source || !target) continue;

          const isProjectToNetwork =
            (source.entity.primaryLabel === 'Project' && target.entity.primaryLabel === 'Network') ||
            (target.entity.primaryLabel === 'Project' && source.entity.primaryLabel === 'Network');
          if (isProjectToNetwork) continue;

          // En modo Árbol, los nodos de Nivel 4 (como Hardware) se posicionan de forma determinista bajo su equipo; ignorar muelles transversales
          if (layoutMode === 'tree') {
            const isHwOrLevel4 =
              (source.depth !== undefined && source.depth >= 4) ||
              (target.depth !== undefined && target.depth >= 4) ||
              source.entity?.primaryLabel === 'Hardware' ||
              target.entity?.primaryLabel === 'Hardware';
            if (isHwOrLevel4) continue;
          }

          const dx = target.x - source.x;
          const dy = target.y - source.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 0.01;
          const displacement = dist - PHYSICS.springLength;
          const force = displacement * PHYSICS.springConstant * alpha;
          const sfx = (dx / dist) * force;
          const sfy = (dy / dist) * force;
          source.fx += sfx;
          source.fy += sfy;
          target.fx -= sfx;
          target.fy -= sfy;
        }

        // Aplicación de velocidades con desaceleración orgánica (Velocity Damping)
        for (let i = 0; i < nodes.length; i++) {
          const node = nodes[i];
          if (node.id === draggedNodeIdRef.current || node.pinned) {
            node.vx = 0;
            node.vy = 0;
            continue;
          }

          if (layoutMode === 'stix') {
            // Grafo STIX: gravedad radial por profundidad de nodo (mismos niveles que Árbol)
            const depth = getNodeDepth(node.entity);
            let targetRadius;
            if (depth === 1) targetRadius = 0;        // PROYECTO → centro
            else if (depth === 2) targetRadius = 190; // ENDPOINTS
            else if (depth >= 3 && depth < 4) targetRadius = 330; // INSTALACIONES Y CONTENEDORES
            else if (depth >= 4 && depth < 5) targetRadius = 480; // SOFTWARE, HALLAZGOS Y HARDWARE
            else if (depth >= 5) targetRadius = 600;  // VULNERABILIDADES Y REMEDIACIONES
            else targetRadius = 720;                  // REDES Y SEGMENTOS (depth 0)

            const dx = node.x - WORLD_CENTER_X;
            const dy = node.y - WORLD_CENTER_Y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;

            if (targetRadius === 0) {
              // Nodo raíz (Project): anclar al centro
              node.fx += (WORLD_CENTER_X - node.x) * 0.25;
              node.fy += (WORLD_CENTER_Y - node.y) * 0.25;
            } else {
              // Atraer hacia el radio objetivo manteniendo la dirección actual
              const targetX = WORLD_CENTER_X + (dx / dist) * targetRadius;
              const targetY = WORLD_CENTER_Y + (dy / dist) * targetRadius;
              node.fx += (targetX - node.x) * 0.08;
              node.fy += (targetY - node.y) * 0.08;
            }
          } else if (layoutMode === 'tree') {
            const targetX = node.treeX !== undefined ? node.treeX : WORLD_CENTER_X;
            const targetY = -320 + (node.depth !== undefined ? node.depth : (node.entity?.depth || 0)) * 190;
            node.treeY = targetY;
            node.fx += (targetX - node.x) * 0.18;
            node.fy += (targetY - node.y) * 0.18;
          } else {
            node.fy += (getLayerY(node.entity?.categoryId, node.entity?.primaryLabel, node.entity?.labels) - node.y) * PHYSICS.centralGravity;
          }

          node.vx = (node.vx + node.fx) * (1 - PHYSICS.damping);
          node.vy = (node.vy + node.fy) * (1 - PHYSICS.damping);

          const speed = Math.sqrt(node.vx * node.vx + node.vy * node.vy);
          if (speed > PHYSICS.maxSpeed) {
            node.vx = (node.vx / speed) * PHYSICS.maxSpeed;
            node.vy = (node.vy / speed) * PHYSICS.maxSpeed;
          }

          node.x += node.vx;
          node.y += node.vy;

          node.x = Math.max(CANVAS_MIN + 40, Math.min(CANVAS_MAX - 40, node.x));
          node.y = Math.max(CANVAS_MIN + 40, Math.min(CANVAS_MAX - 40, node.y));
        }

        // Reducir Alpha dinámicamente hasta asentamiento
        alphaRef.current *= 0.96;
        if (alphaRef.current <= 0.001) {
          alphaRef.current = 0; // Congelar físicas en reposo
        }
      }

      // 2. DIBUJADO EN CANVAS DE ALTO RENDIMIENTO (60 FPS)
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      if (canvas.width !== rect.width * dpr || canvas.height !== rect.height * dpr) {
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
      }

      ctx.save();
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.scale(dpr, dpr);

      // Transformación de ViewBox al lienzo Canvas con escala uniforme (1:1 Aspect Ratio)
      const vb = viewBoxRef.current;
      const containerAspect = rect.width / rect.height;
      let fitW = vb.w;
      let fitH = vb.h;

      if (fitW / fitH > containerAspect) {
        fitH = fitW / containerAspect;
      } else {
        fitW = fitH * containerAspect;
      }

      const scale = rect.width / fitW;
      const offsetX = vb.x - (fitW - vb.w) / 2;
      const offsetY = vb.y - (fitH - vb.h) / 2;

      ctx.translate(-offsetX * scale, -offsetY * scale);
      ctx.scale(scale, scale);

      // Renderizar Guías Horizontales de Nivel (Tier Bands) en Modo Árbol
      if (layoutMode === 'tree') {
        const levelLabels = [
          { depth: 0, label: 'NIVEL 0 · REDES Y SEGMENTOS' },
          { depth: 1, label: 'NIVEL 1 · PROYECTO' },
          { depth: 2, label: 'NIVEL 2 · ENDPOINTS' },
          { depth: 3, label: 'NIVEL 3 · INSTALACIONES Y CONTENEDORES' },
          { depth: 4, label: 'NIVEL 4 · SOFTWARE, HALLAZGOS, HARDWARE E IMÁGENES' },
          { depth: 5, label: 'NIVEL 5 · VULNERABILIDADES Y REMEDIACIONES' }
        ];

        ctx.save();
        ctx.font = 'bold 9px Orbitron, monospace';
        ctx.fillStyle = 'rgba(148, 163, 184, 0.35)';
        ctx.strokeStyle = 'rgba(75, 85, 125, 0.12)';
        ctx.lineWidth = 1;
        ctx.setLineDash([6, 6]);

        levelLabels.forEach(lvl => {
          const y = -320 + lvl.depth * 190;
          ctx.beginPath();
          ctx.moveTo(-4000, y);
          ctx.lineTo(4000, y);
          ctx.stroke();

          ctx.fillText(lvl.label, vb.x + 20, y - 10);
        });
        ctx.restore();
      }

      // Renderizar Anillos Concéntricos en Modo STIX (Radios idénticos a las físicas)
      if (layoutMode === 'stix') {
        const stixRings = [
          { radius: 190, label: 'NIVEL 2 · ENDPOINTS',                        color: 'rgba(255, 255, 255, 0.04)', stroke: 'rgba(255, 255, 255, 0.2)' },
          { radius: 330, label: 'NIVEL 3 · INSTALACIONES Y CONTENEDORES',      color: 'rgba(13, 183, 237, 0.05)',  stroke: 'rgba(13, 183, 237, 0.25)' },
          { radius: 480, label: 'NIVEL 4 · SOFTWARE, HALLAZGOS Y HARDWARE',    color: 'rgba(245, 158, 11, 0.05)',  stroke: 'rgba(245, 158, 11, 0.25)' },
          { radius: 600, label: 'NIVEL 5 · VULNERABILIDADES Y REMEDIACIONES',  color: 'rgba(239, 68, 68, 0.06)',   stroke: 'rgba(239, 68, 68, 0.3)' },
          { radius: 720, label: 'NIVEL 0 · REDES Y SEGMENTOS',                color: 'rgba(121, 115, 255, 0.06)', stroke: 'rgba(121, 115, 255, 0.25)' }
        ];

        ctx.save();
        ctx.font = 'bold 8px Orbitron, monospace';
        stixRings.forEach(ring => {
          // Relleno semitransparente del anillo
          ctx.beginPath();
          ctx.arc(WORLD_CENTER_X, WORLD_CENTER_Y, ring.radius, 0, Math.PI * 2);
          ctx.fillStyle = ring.color;
          ctx.fill();

          // Borde del anillo
          ctx.beginPath();
          ctx.arc(WORLD_CENTER_X, WORLD_CENTER_Y, ring.radius, 0, Math.PI * 2);
          ctx.strokeStyle = ring.stroke;
          ctx.lineWidth = 1;
          ctx.setLineDash([4, 4]);
          ctx.stroke();
          ctx.setLineDash([]);

          // Etiqueta del nivel radial
          ctx.fillStyle = ring.stroke;
          ctx.textAlign = 'center';
          ctx.fillText(ring.label, WORLD_CENTER_X, WORLD_CENTER_Y - ring.radius + 10);
        });
        ctx.restore();
      }

      const pathActive = Boolean(selectedExploitationPath);

      // Renderizar Enlaces (Edges) en Canvas
      const rels = graphData.relationships || [];
      for (let i = 0; i < rels.length; i++) {
        const rel = rels[i];
        const na = nodeMap.get(rel.source);
        const nb = nodeMap.get(rel.target);
        if (!na || !nb) continue;

        const isNetworkEdge = na.entity.primaryLabel === 'Network' || nb.entity.primaryLabel === 'Network';
        const isProjectToNetwork =
          (na.entity.primaryLabel === 'Project' && nb.entity.primaryLabel === 'Network') ||
          (nb.entity.primaryLabel === 'Project' && na.entity.primaryLabel === 'Network');

        // Omitir enlace directo entre Proyecto y Red en el lienzo para no sobrecargar el centro
        if (isProjectToNetwork) continue;

        const naId = String(na.id);
        const nbId = String(nb.id);
        const naActive = lineageMaps.directMatches.has(naId) || lineageMaps.contextMatches.has(naId);
        const nbActive = lineageMaps.directMatches.has(nbId) || lineageMaps.contextMatches.has(nbId);

        const isDimmed = lineageMaps.hasActiveFilters && (!naActive || !nbActive);

        const isPathEdge = pathEdgeIdSet.has(rel.id);
        const pathDimmed = pathActive && !isPathEdge;

        const edgeShouldBeDimmed = (isDimmed && !isPathEdge) || pathDimmed;

        ctx.save();
        ctx.beginPath();
        if (layoutMode === 'tree') {
          const midY = (na.y + nb.y) / 2;
          ctx.moveTo(na.x, na.y);
          ctx.bezierCurveTo(na.x, midY, nb.x, midY, nb.x, nb.y);
        } else {
          const mx = (na.x + nb.x) / 2;
          const my = (na.y + nb.y) / 2 - 20;
          ctx.moveTo(na.x, na.y);
          ctx.quadraticCurveTo(mx, my, nb.x, nb.y);
        }

        if (edgeShouldBeDimmed) {
          ctx.strokeStyle = 'rgba(75, 85, 99, 0.15)';
          ctx.lineWidth = 1;
        } else if (isPathEdge) {
          ctx.strokeStyle = '#ef4444';
          ctx.lineWidth = 3.5;
          ctx.shadowColor = '#ef4444';
          ctx.shadowBlur = 8;
        } else if (isNetworkEdge) {
          const netNode = na.entity.primaryLabel === 'Network' ? na : nb;
          const netHue = Math.abs(String(netNode.id).split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)) % 360;
          ctx.strokeStyle = `hsla(${netHue}, 80%, 65%, 0.65)`;
          ctx.lineWidth = 1.8;
          ctx.setLineDash([4, 3]);
        } else if (rel.type === 'OF_VULNERABILITY' || rel.type === 'TARGETS_VULN') {
          ctx.strokeStyle = 'rgba(239, 68, 68, 0.7)';
          ctx.lineWidth = 1.8;
        } else if (rel.type === 'CONNECTED_TO') {
          ctx.strokeStyle = 'rgba(165, 165, 255, 0.6)';
          ctx.lineWidth = 1.6;
        } else {
          ctx.strokeStyle = 'rgba(60, 65, 110, 0.5)';
          ctx.lineWidth = 1.2;
        }
        ctx.stroke();
        ctx.restore();
      }

      // Renderizar Nodos en Canvas
      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        const nodeIdStr = String(node.id);
        const isDirectMatch = lineageMaps.directMatches.has(nodeIdStr);
        const isContextMatch = lineageMaps.contextMatches.has(nodeIdStr);

        const isDimmed = lineageMaps.hasActiveFilters && !isDirectMatch && !isContextMatch;
        const isContextNode = lineageMaps.hasActiveFilters && !isDirectMatch && isContextMatch;

        const isSelected = selectedNode && selectedNode.id === node.id;
        const isDecom = node.isDecom || isDecommissionedEndpoint(node.entity);
        const nodeIdStr2 = String(node.id);
        const isNodeInPath = pathConnectorNodeIdSet.has(nodeIdStr2) || pathNodeStepMap.has(nodeIdStr2);
        const stepNumber = pathNodeStepMap.get(nodeIdStr2);
        const isStepNode = stepNumber !== undefined;

        const pathDimmedNode = pathActive && !isNodeInPath;
        const nodeShouldBeDimmed = (isDimmed && !isNodeInPath) || pathDimmedNode;

        const riskTierColor = isDecom ? null : getTierColor(node.entity.properties?.risk_tier);
        const priorityTierColor = isDecom ? null : getTierColor(node.entity.properties?.priority_tier);

        ctx.save();
        ctx.translate(node.x, node.y);

        if (nodeShouldBeDimmed) {
          ctx.globalAlpha = 0.2;
        } else if (isContextNode) {
          ctx.globalAlpha = 0.65;
        } else if (isDecom) {
          ctx.globalAlpha = 0.65;
        } else {
          ctx.globalAlpha = 1.0;
        }

        // Anillo de Riesgo Tier
        if (riskTierColor) {
          ctx.beginPath();
          ctx.arc(0, 0, node.r + 9, 0, Math.PI * 2);
          ctx.strokeStyle = riskTierColor;
          ctx.lineWidth = 2;
          ctx.stroke();
        }

        // Anillo de Prioridad Tier
        if (priorityTierColor) {
          ctx.beginPath();
          ctx.arc(0, 0, node.r + 13, 0, Math.PI * 2);
          ctx.strokeStyle = priorityTierColor;
          ctx.lineWidth = 1.5;
          ctx.setLineDash([4, 4]);
          ctx.stroke();
          ctx.setLineDash([]);
        }

        // Halo exterior
        ctx.beginPath();
        ctx.arc(0, 0, node.r + 6, 0, Math.PI * 2);
        ctx.fillStyle = isDecom ? 'rgba(75, 85, 99, 0.1)' : node.color;
        ctx.globalAlpha = (nodeShouldBeDimmed ? 0.05 : isDecom ? 0.05 : 0.15);
        ctx.fill();

        // Círculo central del Nodo
        ctx.globalAlpha = nodeShouldBeDimmed ? 0.2 : 1.0;
        ctx.beginPath();
        ctx.arc(0, 0, node.r, 0, Math.PI * 2);
        ctx.fillStyle = isDecom ? '#111827' : 'rgba(5, 6, 30, 0.92)';
        ctx.fill();
        ctx.lineWidth = isNodeInPath ? 3 : isSelected ? 3 : 2;
        ctx.strokeStyle = isNodeInPath ? '#ef4444' : isSelected ? '#38bdf8' : isDecom ? '#6b7280' : node.color;
        if (isSelected) {
          ctx.shadowColor = '#38bdf8';
          ctx.shadowBlur = 12;
        }
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Dibujar Icono del Nodo
        drawCanvasNodeIcon(ctx, node.entity.categoryId, node.entity.primaryLabel, isNodeInPath ? '#ef4444' : isDecom ? '#6b7280' : node.color, node.r * 1.1);

        // Badge Expuesto a Internet
        const isInternetExposed = Boolean(
          node.entity.properties?.internet_exposed === true ||
          node.entity.properties?.internet_exposed === 'true' ||
          node.entity.internet_exposed === true
        );
        if (isInternetExposed) {
          ctx.save();
          ctx.translate(-node.r + 2, -node.r + 2);
          ctx.beginPath();
          ctx.arc(0, 0, 8.5, 0, Math.PI * 2);
          ctx.fillStyle = '#090d16';
          ctx.strokeStyle = '#0ea5e9';
          ctx.lineWidth = 1.4;
          ctx.fill();
          ctx.stroke();

          // Icono Nube (Cloud) SVG dibujado sobre Canvas
          ctx.beginPath();
          const cloudPath = new Path2D(
            'M -2.8 3.0 H 2.8 C 4.2 3.0 5.2 2.0 5.2 0.6 C 5.2 -0.6 4.3 -1.6 3.1 -1.6 C 2.8 -3.0 1.5 -4.0 0.0 -4.0 C -1.5 -4.0 -2.8 -3.0 -3.1 -1.6 C -4.3 -1.6 -5.2 -0.6 -5.2 0.6 C -5.2 2.0 -4.2 3.0 -2.8 3.0 Z'
          );
          ctx.fillStyle = 'rgba(56, 189, 248, 0.25)';
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 1.2;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.fill(cloudPath);
          ctx.stroke(cloudPath);

          ctx.restore();
        }

        // Badge de Número de Paso en Ruta de Ataque
        if (isStepNode) {
          ctx.save();
          ctx.translate(node.r - 2, -node.r + 2);
          ctx.beginPath();
          ctx.arc(0, 0, 10, 0, Math.PI * 2);
          ctx.fillStyle = '#ef4444';
          ctx.fill();
          ctx.font = 'bold 10px Orbitron, monospace';
          ctx.fillStyle = '#ffffff';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(`#${stepNumber}`, 0, 1);
          ctx.restore();
        }

        // Badge de Pliegue / Despliegue de Subárbol (+ / -)
        if (node.hasChildren || node.childCount > 0) {
          const isCollapsed = collapsedNodeIds.has(String(node.id));
          ctx.save();
          ctx.translate(node.r - 2, node.r - 2);

          ctx.beginPath();
          ctx.arc(0, 0, 9, 0, Math.PI * 2);
          ctx.fillStyle = isCollapsed ? '#090d16' : 'rgba(15, 23, 42, 0.92)';
          ctx.strokeStyle = isCollapsed ? '#38bdf8' : 'rgba(148, 163, 184, 0.6)';
          ctx.lineWidth = 1.6;
          if (isCollapsed) {
            ctx.shadowColor = '#38bdf8';
            ctx.shadowBlur = 8;
          }
          ctx.fill();
          ctx.stroke();
          ctx.shadowBlur = 0;

          // Dibujar símbolo + o -
          ctx.strokeStyle = isCollapsed ? '#38bdf8' : '#ffffff';
          ctx.lineWidth = 1.8;
          ctx.beginPath();
          ctx.moveTo(-4, 0);
          ctx.lineTo(4, 0);
          if (isCollapsed) {
            ctx.moveTo(0, -4);
            ctx.lineTo(0, 4);
          }
          ctx.stroke();
          ctx.restore();
        }

        // Etiqueta Nombre del Nodo
        const rawName = node.entity.name || '';
        const shouldTruncate = layoutMode === 'tree' && !isSelected && rawName.length > 17;
        const displayName = shouldTruncate ? rawName.substring(0, 15) + '…' : rawName;

        ctx.font = '11px Inter, sans-serif';
        const textMetrics = ctx.measureText(displayName);
        const textWidth = textMetrics.width;

        // Cápsula (pill) de fondo traslúcido para máxima legibilidad sobre aristas
        if (layoutMode === 'tree' || isSelected) {
          ctx.save();
          ctx.fillStyle = 'rgba(5, 7, 24, 0.82)';
          ctx.strokeStyle = isSelected ? 'rgba(56, 189, 248, 0.5)' : 'rgba(55, 65, 95, 0.4)';
          ctx.lineWidth = 1;
          const padX = 6;
          const padY = 2;
          const boxX = -textWidth / 2 - padX;
          const boxY = node.r + 4;
          const boxW = textWidth + padX * 2;
          const boxH = 16;
          ctx.beginPath();
          if (ctx.roundRect) {
            ctx.roundRect(boxX, boxY, boxW, boxH, 4);
          } else {
            ctx.rect(boxX, boxY, boxW, boxH);
          }
          ctx.fill();
          ctx.stroke();
          ctx.restore();
        }

        ctx.fillStyle = isDecom ? '#9ca3af' : '#e2e8f0';
        ctx.textAlign = 'center';
        ctx.fillText(displayName, 0, node.r + 16);

        // Etiqueta Tipo del Nodo
        ctx.font = '9px Orbitron, monospace';
        ctx.fillStyle = isDecom ? '#6b7280' : 'rgba(148, 163, 184, 0.7)';
        ctx.fillText(isDecom ? 'DECOMMISSIONED' : node.entity.primaryLabel.toUpperCase(), 0, node.r + 28);

        ctx.restore();
      }

      // Renderizar Feedback Visual de Puntos de Gravedad e Intercambio de Subárboles
      if (layoutMode === 'tree' && draggedNodeIdRef.current) {
        const snapTarget = dragSnapTargetRef.current;
        const swapPartner = dragSwapPartnerRef.current;

        if (snapTarget) {
          ctx.save();
          ctx.beginPath();
          ctx.arc(snapTarget.x, snapTarget.y, 28, 0, Math.PI * 2);
          ctx.strokeStyle = swapPartner ? 'rgba(245, 158, 11, 0.9)' : 'rgba(56, 189, 248, 0.8)';
          ctx.lineWidth = 2;
          ctx.setLineDash([5, 5]);
          ctx.stroke();

          ctx.beginPath();
          ctx.arc(snapTarget.x, snapTarget.y, 4, 0, Math.PI * 2);
          ctx.fillStyle = swapPartner ? '#f59e0b' : '#38bdf8';
          ctx.fill();
          ctx.restore();
        }

        if (swapPartner) {
          ctx.save();
          ctx.beginPath();
          ctx.arc(swapPartner.x, swapPartner.y, swapPartner.r + 14, 0, Math.PI * 2);
          ctx.strokeStyle = '#f59e0b';
          ctx.shadowColor = '#f59e0b';
          ctx.shadowBlur = 10;
          ctx.lineWidth = 2.5;
          ctx.stroke();

          ctx.font = 'bold 10px Orbitron, monospace';
          ctx.fillStyle = '#f59e0b';
          ctx.textAlign = 'center';
          ctx.fillText('⇄ INTERCAMBIAR RAMA', swapPartner.x, swapPartner.y - swapPartner.r - 18);
          ctx.restore();
        }
      }

      ctx.restore();
      frameId = requestAnimationFrame(render);
    };

    frameId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(frameId);
  }, [canvasEl, graphData, layoutMode, selectedNode, filterType, searchQuery, graphAdvancedFilters, selectedExploitationPath, pathEdgeIdSet, pathConnectorNodeIdSet, pathNodeStepMap, lineageMaps, collapsedNodeIds]);

  // Conversión de coordenadas de pantalla a coordenadas del mundo Canvas
  const screenToWorld = useCallback((clientX, clientY) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const px = clientX - rect.left;
    const py = clientY - rect.top;

    const vb = viewBoxRef.current;
    const containerAspect = rect.width / rect.height;
    let fitW = vb.w;
    let fitH = vb.h;

    if (fitW / fitH > containerAspect) {
      fitH = fitW / containerAspect;
    } else {
      fitW = fitH * containerAspect;
    }

    const offsetX = vb.x - (fitW - vb.w) / 2;
    const offsetY = vb.y - (fitH - vb.h) / 2;

    const wx = offsetX + (px / rect.width) * fitW;
    const wy = offsetY + (py / rect.height) * fitH;
    return { x: wx, y: wy };
  }, []);

  // Manejo de Interacción: Mouse Down (Drag Node / Pan Canvas / Click)
  const handleMouseDown = (e) => {
    const { x: wx, y: wy } = screenToWorld(e.clientX, e.clientY);
    const nodes = nodesRef.current;

    // Buscar si se ha hecho clic sobre algún nodo o su badge de pliegue (+ / -)
    let clickedNode = null;
    let clickedBadge = false;

    for (let i = nodes.length - 1; i >= 0; i--) {
      const n = nodes[i];
      if (n.hasChildren || n.childCount > 0) {
        const badgeX = n.x + (n.r - 2);
        const badgeY = n.y + (n.r - 2);
        const bdx = wx - badgeX;
        const bdy = wy - badgeY;

        if (Math.sqrt(bdx * bdx + bdy * bdy) <= 12) {
          clickedNode = n;
          clickedBadge = true;
          break;
        }
      }

      const dx = wx - n.x;
      const dy = wy - n.y;
      if (Math.sqrt(dx * dx + dy * dy) <= n.r + 8) {
        clickedNode = n;
        break;
      }
    }

    if (clickedBadge && clickedNode) {
      toggleNodeCollapse(clickedNode.id);
      return;
    }

    if (clickedNode) {
      draggedNodeIdRef.current = clickedNode.id;
      alphaRef.current = 0.4; // Re-activar física suave al arrastrar
      let hasMoved = false;

      // Función auxiliar para obtener todos los nodos descendientes de un subárbol
      const getSubtreeNodeIds = (rootId) => {
        const ids = new Set([String(rootId)]);
        const queue = [String(rootId)];
        const map = nodeMapRef.current;
        const rels = graphData.relationships || [];

        while (queue.length > 0) {
          const currId = queue.shift();
          const currNode = map.get(currId);
          if (!currNode) continue;
          const currDepth = currNode.depth;

          rels.forEach(rel => {
            const s = String(rel.source);
            const t = String(rel.target);
            if (s === currId && map.has(t)) {
              const tNode = map.get(t);
              if (tNode.depth > currDepth && !ids.has(t)) {
                ids.add(t);
                queue.push(t);
              }
            } else if (t === currId && map.has(s)) {
              const sNode = map.get(s);
              if (sNode.depth > currDepth && !ids.has(s)) {
                ids.add(s);
                queue.push(s);
              }
            }
          });
        }
        return ids;
      };

      const subtreeNodeIds = layoutMode === 'tree' ? getSubtreeNodeIds(clickedNode.id) : new Set([String(clickedNode.id)]);
      let lastPos = { x: wx, y: wy };

      const onMouseMove = (moveEvent) => {
        hasMoved = true;
        const currentPos = screenToWorld(moveEvent.clientX, moveEvent.clientY);
        const dx = currentPos.x - lastPos.x;
        const dy = currentPos.y - lastPos.y;
        lastPos = currentPos;

        subtreeNodeIds.forEach(idStr => {
          const subNode = nodeMapRef.current.get(idStr);
          if (subNode) {
            subNode.x = Math.max(CANVAS_MIN + 40, Math.min(CANVAS_MAX - 40, subNode.x + dx));
            subNode.y = Math.max(CANVAS_MIN + 40, Math.min(CANVAS_MAX - 40, subNode.y + dy));
          }
        });

        // Detección de pareja de intercambio (Swap Partner) en modo Árbol
        if (layoutMode === 'tree') {
          const siblings = nodesRef.current.filter(n => n.depth === clickedNode.depth && String(n.id) !== String(clickedNode.id));
          let bestPartner = null;
          let minDistance = 160; // Umbral de proximidad en px

          siblings.forEach(sib => {
            const dist = Math.sqrt(Math.pow(clickedNode.x - sib.x, 2) + Math.pow(clickedNode.y - sib.y, 2));
            if (dist < minDistance) {
              minDistance = dist;
              bestPartner = sib;
            }
          });

          dragSwapPartnerRef.current = bestPartner;
          dragSnapTargetRef.current = {
            x: bestPartner ? (bestPartner.treeX !== undefined ? bestPartner.treeX : bestPartner.x) : (clickedNode.treeX !== undefined ? clickedNode.treeX : clickedNode.x),
            y: -320 + (clickedNode.depth || 0) * 190
          };
        }

        alphaRef.current = 0.2;
      };

      const onMouseUp = () => {
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
        draggedNodeIdRef.current = null;

        const swapPartner = dragSwapPartnerRef.current;
        dragSwapPartnerRef.current = null;
        dragSnapTargetRef.current = null;

        if (!hasMoved) {
          setSelectedNode(clickedNode.entity);
          return;
        }

        if (layoutMode === 'tree') {
          const targetLevelY = -320 + (clickedNode.depth || 0) * 190;

          if (swapPartner) {
            // INTERCAMBIO (SWAP) DE PUNTOS DE GRAVEDAD ENTRE DOS SUBÁRBOLES
            const partnerSubtreeIds = getSubtreeNodeIds(swapPartner.id);

            const oldTreeX_A = clickedNode.treeX !== undefined ? clickedNode.treeX : clickedNode.x;
            const oldTreeX_B = swapPartner.treeX !== undefined ? swapPartner.treeX : swapPartner.x;

            const newTreeX_A = oldTreeX_B;
            const newTreeX_B = oldTreeX_A;

            const shiftA_X = newTreeX_A - oldTreeX_A;
            const shiftB_X = newTreeX_B - oldTreeX_B;

            // Desplazar Subárbol A (arrastrado)
            subtreeNodeIds.forEach(idStr => {
              const subA = nodeMapRef.current.get(idStr);
              if (subA) {
                subA.treeX = (subA.treeX !== undefined ? subA.treeX : subA.x) + shiftA_X;
                subA.treeY = -320 + (subA.depth !== undefined ? subA.depth : (subA.entity?.depth || 0)) * 190;
                subA.pinned = false;
                subA.vx = 0;
                subA.vy = 0;
              }
            });

            // Desplazar Subárbol B (intercambiado)
            partnerSubtreeIds.forEach(idStr => {
              const subB = nodeMapRef.current.get(idStr);
              if (subB) {
                subB.treeX = (subB.treeX !== undefined ? subB.treeX : subB.x) + shiftB_X;
                subB.treeY = -320 + (subB.depth !== undefined ? subB.depth : (subB.entity?.depth || 0)) * 190;
                subB.pinned = false;
                subB.vx = 0;
                subB.vy = 0;
              }
            });
          } else {
            // ACOPLAMIENTO MAGNÉTICO AL NIVEL Y CORRESPONDIENTE A CADA NODO
            subtreeNodeIds.forEach(idStr => {
              const subA = nodeMapRef.current.get(idStr);
              if (subA) {
                subA.treeY = -320 + (subA.depth !== undefined ? subA.depth : (subA.entity?.depth || 0)) * 190;
                subA.pinned = false;
                subA.vx = 0;
                subA.vy = 0;
              }
            });
          }

          alphaRef.current = 0.85; // Activar asentamiento dinámico suave
        } else {
          subtreeNodeIds.forEach(idStr => {
            const subNode = nodeMapRef.current.get(idStr);
            if (subNode) {
              subNode.pinned = true;
              subNode.vx = 0;
              subNode.vy = 0;
            }
          });
        }
      };

      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    } else {
      // Pan del Fondo del Grafo
      const startX = e.clientX;
      const startY = e.clientY;
      const originX = viewBoxRef.current.x;
      const originY = viewBoxRef.current.y;

      const onMouseMove = (moveEvent) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const scale = viewBoxRef.current.w / canvas.clientWidth;
        const dx = (moveEvent.clientX - startX) * scale;
        const dy = (moveEvent.clientY - startY) * scale;

        setViewBox(vb => ({
          ...vb,
          x: originX - dx,
          y: originY - dy
        }));
      };

      const onMouseUp = () => {
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
      };

      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    }
  };

  // Zoom con rueda del ratón - se registra con passive:false via useEffect
  const handleWheel = useCallback((e) => {
    e.preventDefault();
    const p = screenToWorld(e.clientX, e.clientY);
    const zoomFactor = e.deltaY > 0 ? 1.08 : 0.92;

    setViewBox(vb => {
      const newW = Math.max(150, Math.min(CANVAS_WIDTH, vb.w * zoomFactor));
      const newH = Math.max(110, Math.min(CANVAS_HEIGHT, vb.h * zoomFactor));
      const ratioX = (p.x - vb.x) / vb.w;
      const ratioY = (p.y - vb.y) / vb.h;
      return {
        x: p.x - ratioX * newW,
        y: p.y - ratioY * newH,
        w: newW,
        h: newH
      };
    });
  }, [screenToWorld]);

  // Registrar el listener de rueda con passive:false para poder llamar preventDefault()
  useEffect(() => {
    if (!canvasEl) return;
    canvasEl.addEventListener('wheel', handleWheel, { passive: false });
    return () => canvasEl.removeEventListener('wheel', handleWheel);
  }, [canvasEl, handleWheel]);

  const handleDoubleClick = (e) => {
    const { x: wx, y: wy } = screenToWorld(e.clientX, e.clientY);
    const nodes = nodesRef.current;
    for (let i = nodes.length - 1; i >= 0; i--) {
      const n = nodes[i];
      const dx = wx - n.x;
      const dy = wy - n.y;
      if (Math.sqrt(dx * dx + dy * dy) <= n.r + 8) {
        n.pinned = false;
        alphaRef.current = 0.3;
        break;
      }
    }
  };

  if (loading) {
    return (
      <div className="loader-container">
        <div className="spinner"></div>
        <p>Conectando y recuperando topología de Neo4j...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="graph-error-box">
        <h3 className="graph-error-title">Conexión fallida</h3>
        <p className="graph-error-text">{error}</p>
        <button className="btn btn-secondary graph-error-retry-btn" onClick={() => fetchInfrastructure()}>
          Reintentar Conexión
        </button>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="graph-stage" style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden' }}>
      {/* RELOJ */}
      <div className="cw-tr graph-clock-box">
        <div id="clockTime">{timeStr}</div>
        <div id="clockDate">{dateStr}</div>
      </div>

      {selectedExploitationPath && (
        <div
          style={{
            position: 'absolute',
            top: '70px',
            right: '16px',
            zIndex: 20,
            background: 'rgba(10, 12, 35, 0.92)',
            border: '1px solid rgba(239, 68, 68, 0.6)',
            borderRadius: '6px',
            padding: '8px 14px',
            boxShadow: '0 0 20px rgba(0, 0, 0, 0.8), 0 0 10px rgba(239, 68, 68, 0.2)',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            backdropFilter: 'blur(8px)'
          }}
        >
          <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: '11.5px', color: '#f87171', letterSpacing: '0.5px' }}>
            RUTA DESTACADA: <strong>{selectedExploitationPath.initialEndpoint}</strong> &middot; RIESGO: <strong>{selectedExploitationPath.totalRiskScore.toFixed(1)}</strong>
          </div>
          <button
            className="btn btn-secondary"
            onClick={clearSelectedExploitationPath}
            style={{ padding: '3px 8px', fontSize: '10px', fontFamily: 'Orbitron, sans-serif', borderColor: '#ef4444', color: '#f87171' }}
          >
            LIMPIAR
          </button>
        </div>
      )}

      {/* LIENZO CANVAS DE ALTO RENDIMIENTO */}
      <canvas
        ref={canvasCallbackRef}
        style={{ width: '100%', height: '100%', display: 'block', cursor: 'grab' }}
        onMouseDown={handleMouseDown}
        onDoubleClick={handleDoubleClick}
      />

      <div className="corner-widget cw-tl">
        NODOS: <span id="nodeCount">{nodesRef.current.length}</span> &nbsp;|&nbsp; ENLACES: <span id="edgeCount">{graphData.relationships?.length || 0}</span>
      </div>

      <div className="layout-selector-widget cw-bl">
        <button
          className={`btn-layout ${layoutMode === 'layered' ? 'active' : ''}`}
          onClick={() => setLayoutMode('layered')}
        >
          Capas
        </button>
        <button
          className={`btn-layout ${layoutMode === 'tree' ? 'active' : ''}`}
          onClick={() => setLayoutMode('tree')}
        >
          Árbol
        </button>
        <button
          className={`btn-layout ${layoutMode === 'stix' ? 'active' : ''}`}
          onClick={() => setLayoutMode('stix')}
        >
          Grafo STIX
        </button>
        <div style={{ width: '1px', height: '16px', background: 'rgba(255, 255, 255, 0.15)', margin: '0 3px' }} />
        <button
          className="btn-layout"
          title="Desplegar todas las ramas del árbol"
          onClick={expandAllNodes}
        >
          ➕ Desplegar
        </button>
        <button
          className="btn-layout"
          title="Plegar todas las ramas inferiores"
          onClick={collapseAllNodes}
        >
          ➖ Plegar
        </button>
      </div>

      <div className="corner-widget cw-br">
        SISTEMA: <span className="status-stable">ESTABLE</span><br />
        CANVAS 60FPS &middot; SYNC OK
      </div>
    </div>
  );
}
