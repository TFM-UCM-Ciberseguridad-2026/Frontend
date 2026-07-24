import React from 'react';

export function SidebarFilters({
  search,
  setSearch,
  category,
  setCategory,
  categories,
  nodes
}) {
  const getNodeCount = (catKey) => {
    if (!nodes) return 0;
    if (catKey === 'ALL') return nodes.length;
    return nodes.filter(n => n.primaryLabel === catKey).length;
  };

  return (
    <aside className="sidebar">
      <div>
        <p className="eyebrow">Buscar activos</p>
        <input
          id="search"
          type="text"
          placeholder="Buscar por nombre, ID, prop..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div>
        <p className="eyebrow">Filtrar por categoría</p>
        <div id="catList">
          {categories.map(c => (
            <button
              key={c.key}
              className={`cat-btn ${category === c.key ? 'active' : ''}`}
              onClick={() => setCategory(c.key)}
            >
              <span>{c.label}</span>
              <span className="count">
                {getNodeCount(c.key)}
              </span>
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
}
