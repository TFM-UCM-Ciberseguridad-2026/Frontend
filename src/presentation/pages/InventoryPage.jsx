import React from 'react';
import { useInventory } from '../hooks/useInventory';
import { SidebarFilters } from '../components/Inventory/SidebarFilters';
import { AssetTable } from '../components/Inventory/AssetTable';
import { AssetDetails } from '../components/Inventory/AssetDetails';

export function InventoryPage({ graphData, categories }) {
  const {
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
  } = useInventory(graphData.nodes);

  return (
    <>
      {/* PANEL IZQUIERDO DE FILTROS — grid column 1 (250px) */}
      <SidebarFilters
        search={search}
        setSearch={setSearch}
        category={category}
        setCategory={setCategory}
        categories={categories}
        nodes={graphData.nodes}
      />

      {/* TABLA CENTRAL DE INVENTARIO — grid column 2 (1fr) */}
      <AssetTable
        processedNodes={processedNodes}
        selectedNode={selectedNode}
        setSelectedNode={setSelectedNode}
        sortField={sortField}
        sortDirection={sortDirection}
        handleSort={handleSort}
      />

      {/* PANEL DERECHO DE DETALLES — grid column 3 (300px) */}
      <AssetDetails
        selectedNode={selectedNode}
      />
    </>
  );
}
