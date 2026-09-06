import React, { useCallback } from 'react';
import { useInventory } from '../hooks/useInventory';
import { SidebarFilters } from '../components/Inventory/SidebarFilters';
import { AssetTable } from '../components/Inventory/AssetTable';
import { NodeInspector } from '../components/NodeInspector/NodeInspector';

export function InventoryPage({
  categories = [],
  selectedProjectId = null,
  updateNode,
  deleteNode,
  renameProject,
  deleteProject,
  fetchFindingVulnerabilities,
  fetchEndpointPatchHistory
}) {
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
    lastPage,
    refetch
  } = useInventory(selectedProjectId);

  // Wrapper para actualizar activo y refrescar la tabla de inventario en tiempo real
  const handleUpdateNode = useCallback(async (categoryName, id, data, projectId) => {
    if (updateNode) {
      const res = await updateNode(categoryName, id, data, projectId || selectedProjectId);
      await refetch();
      return res;
    }
  }, [updateNode, refetch, selectedProjectId]);

  // Wrapper para eliminar activo, deseleccionar el nodo y refrescar el inventario
  const handleDeleteNode = useCallback(async (categoryName, id, justification) => {
    if (deleteNode) {
      const res = await deleteNode(categoryName, id, justification);
      setSelectedNode(null);
      await refetch();
      return res;
    }
  }, [deleteNode, refetch, setSelectedNode]);

  // Wrapper para renombrar proyecto y refrescar inventario
  const handleRenameProject = useCallback(async (id, newName, justification) => {
    if (renameProject) {
      const res = await renameProject(id, newName, justification);
      await refetch();
      return res;
    }
  }, [renameProject, refetch]);

  // Wrapper para eliminar proyecto y refrescar inventario
  const handleDeleteProject = useCallback(async (id, justification) => {
    if (deleteProject) {
      const res = await deleteProject(id, justification);
      setSelectedNode(null);
      await refetch();
      return res;
    }
  }, [deleteProject, refetch, setSelectedNode]);

  return (
    <>
      {/* PANEL IZQUIERDO DE FILTROS */}
      <SidebarFilters
        search={search}
        setSearch={setSearch}
        category={category}
        setCategory={setCategory}
        categories={categories}
        categoryCounts={categoryCounts}
        totalItems={totalItems}
        filters={filters}
        updateFilter={updateFilter}
        clearAllFilters={clearAllFilters}
      />

      {/* TABLA CENTRAL DE INVENTARIO */}
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

      {/* PANEL DERECHO DE DETALLES: NODE INSPECTOR */}
      <NodeInspector
        selectedNode={selectedNode}
        updateNode={handleUpdateNode}
        deleteNode={handleDeleteNode}
        renameProject={handleRenameProject}
        deleteProject={handleDeleteProject}
        fetchFindingVulnerabilities={fetchFindingVulnerabilities}
        fetchEndpointPatchHistory={fetchEndpointPatchHistory}
      />
    </>
  );
}