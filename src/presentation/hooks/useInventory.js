import { useState, useMemo } from 'react';

export function useInventory(nodes) {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('ALL');
  const [sortField, setSortField] = useState('name');
  const [sortDirection, setSortDirection] = useState('asc');
  const [selectedNode, setSelectedNode] = useState(null);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const processedNodes = useMemo(() => {
    if (!nodes) return [];

    // 1. Filtrar
    let result = nodes.filter(node => {
      const text = `${node.id} ${node.name} ${node.primaryLabel} ${Object.entries(node.properties || {}).map(([k, v]) => `${k}:${v}`).join(' ')}`.toLowerCase();
      const matchesSearch = !search || text.includes(search.toLowerCase());
      const matchesCat = category === 'ALL' || node.primaryLabel === category;
      return matchesSearch && matchesCat;
    });

    // 2. Ordenar
    result.sort((a, b) => {
      let valA, valB;
      if (sortField === 'id') {
        valA = a.id;
        valB = b.id;
      } else if (sortField === 'name') {
        valA = a.name;
        valB = b.name;
      } else if (sortField === 'category') {
        valA = a.primaryLabel;
        valB = b.primaryLabel;
      } else if (sortField === 'properties') {
        valA = Object.entries(a.properties || {}).map(([k, v]) => `${k}:${v}`).join(', ');
        valB = Object.entries(b.properties || {}).map(([k, v]) => `${k}:${v}`).join(', ');
      }

      if (valA === undefined || valA === null) valA = '';
      if (valB === undefined || valB === null) valB = '';

      if (typeof valA === 'string') {
        return sortDirection === 'asc'
          ? valA.localeCompare(valB)
          : valB.localeCompare(valA);
      } else {
        return sortDirection === 'asc'
          ? valA - valB
          : valB - valA;
      }
    });

    return result;
  }, [nodes, search, category, sortField, sortDirection]);

  return {
    search,
    setSearch,
    category,
    setCategory,
    sortField,
    sortDirection,
    handleSort,
    processedNodes,
    selectedNode,
    setSelectedNode
  };
}
