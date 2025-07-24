import React from 'react';
import NewRequestPanel from './NewRequestPanel';
import ResourcePointsPanel from './ResourcePointsPanel';

const JTFCCMenu: React.FC = () => {
  return (
    <div className="flex flex-col justify-between h-full w-full p-2 gap-4">
      <NewRequestPanel />
      <ResourcePointsPanel />
    </div>
  );
};

export default JTFCCMenu; 