import React from 'react';
import { useInventory } from '../hooks/useInventory';
import { SidebarFilters } from '../components/Inventory/SidebarFilters';
import { AssetTable } from '../components/Inventory/AssetTable';
import { AssetDetails } from '../components/Inventory/AssetDetails';

export function InventoryPage({ categories = [], selectedProjectId = null, graphData = { nodes: [] } }) {
  const {
    search,
    setSearch,
    category,
    setCategory,
    filters,
    updateFilter,
    removeFilter,
    clearAllFilters,
    sortField,
    sortDirection,
    handleSort,
    page,
    totalPages,
    totalItems,
    categoryCounts,
    processedNodes,
    loading,
    selectedNode,
    setSelectedNode,
    prevPage,
    nextPage,
    firstPage,
    lastPage
  } = useInventory(selectedProjectId);

  return (
    <>
      {/* PANEL IZQUIERDO DE FILTROS — grid column 1 (250px) */}
      <SidebarFilters
        search={search}
        setSearch={setSearch}
        category={category}
        setCategory={setCategory}
        categories={categories}
        categoryCounts={categoryCounts}
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
        filters={filters}
        updateFilter={updateFilter}
        removeFilter={removeFilter}
        clearAllFilters={clearAllFilters}
        categoriesList={categories}
        page={page}
        totalPages={totalPages}
        totalItems={totalItems}
        loading={loading}
        prevPage={prevPage}
        nextPage={nextPage}
        firstPage={firstPage}
        lastPage={lastPage}
      />

      {/* PANEL DERECHO DE DETALLES — grid column 3 (300px) */}
      <AssetDetails
        selectedNode={selectedNode}
      />
    </>
  );
}
