import React from 'react';
import NewRequestPanel from './NewRequestPanel';
import ResourcePointsPanel from './ResourcePointsPanel';
import FileOrganizer from './FileOrganizer';

/**
 * Right-hand menu column.
 * Width is whatever its parent provides (`w-full`).
 */
const JTFCCMenu: React.FC = () => {
  return (
    // We remove the 'gap' utility from this parent div.
    <div className="flex flex-col items-center w-full p-2">

      <div style={{ marginTop: '20px' }} className="w-full">
        <FileOrganizer />
      </div>
      
      <div style={{ marginTop: '120px' }} className="w-full">
        <ResourcePointsPanel />
      </div>

      <div style={{ marginTop: '200px' }}>
        <NewRequestPanel />
      </div>
    </div>
  );
};

export default JTFCCMenu;