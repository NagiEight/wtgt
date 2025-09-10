import React from 'react';

const PlaylistPanel = ({ items = [], onSelect }) => {
  return (
    <div
      className="w-full max-w-5xl mt-4 p-4 rounded-md bg-[#262836] overflow-y-auto"
      style={{
        boxShadow: 'inset 0 0 0 2px #645b51',
        maxHeight: '200px',
      }}
    >
      <h2 className="text-[#b09477] text-sm font-semibold mb-2">Playlist</h2>
      <ul className="space-y-2">
        {items.map((item, index) => (
          <li
            key={index}
            onClick={() => onSelect(item)}
            className="cursor-pointer px-3 py-2 rounded-md text-sm text-[#b09477] hover:bg-[#33363b]"
            style={{ boxShadow: 'inset 0 0 0 1px #47484a' }}
          >
            {item.title}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default PlaylistPanel;
