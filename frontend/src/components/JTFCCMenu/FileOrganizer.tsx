import React, { useState } from 'react';

type Tab = 'USAF' | 'USN' | 'USA';

const FileOrganizer: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('USAF');

  const renderContent = () => {
    switch (activeTab) {
      case 'USAF':
        return <div className="text-sm mb-4">This is the content area for USAF. Details and controls related to the Air Force can be placed here.</div>;
      case 'USN':
        return <div className="text-sm mb-4">This is the content area for USN. Details and controls related to the Navy can be placed here.</div>;
      case 'USA':
        return <div className="text-sm mb-4">This is the content area for USA. Details and controls related to the Army can be placed here.</div>;
      default:
        return null;
    }
  };

  const tabs: Tab[] = ['USAF', 'USN', 'USA'];

  return (
    <div className="w-full text-white">
      {/* Tabs container */}
      <div className="flex -mb-px">
        {tabs.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 font-semibold rounded-t-lg border transition focus:outline-none
              ${
                activeTab === tab
                  ? 'bg-neutral-700 border-neutral-700 border-b-transparent text-blue-400'
                  : 'bg-neutral-800 border-neutral-700 text-white hover:bg-neutral-700'
              }
            `}
          >
            {tab}
          </button>
        ))}
      </div>
      {/* Content panel */}
      <div className="w-full bg-neutral-700 border border-neutral-700 rounded-b-lg rounded-tr-lg p-4">
        {renderContent()}
      </div>
    </div>
  );
};

export default FileOrganizer;