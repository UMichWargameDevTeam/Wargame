import React from 'react';
import NewRequestPanel from './NewRequestPanel';
import ResourcePointsPanel from './ResourcePointsPanel';

/**
 * Right-hand menu column.
 * Width is whatever its parent provides (`w-full`).
 */
const JTFCCMenu: React.FC = () => {
  return (
    <div className="flex flex-col justify-between h-full w-full p-2 gap-4">
      <NewRequestPanel />
      <ResourcePointsPanel />
    </div>
  );
};

export default JTFCCMenu;