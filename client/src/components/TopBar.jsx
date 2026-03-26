import React, { useEffect, useState } from 'react';
import { useFlow } from '../context/FlowContext';
import { getHealth } from '../api/shipstation';

export default function TopBar() {
  const { serverMode, setServerMode } = useFlow();
  const [apiStatus, setApiStatus] = useState('checking');

  useEffect(() => {
    let mounted = true;
    getHealth()
      .then((data) => {
        if (!mounted) return;
        setApiStatus('online');
        setServerMode(data.mode || 'mock');
      })
      .catch(() => {
        if (!mounted) return;
        setApiStatus('offline');
      });
    return () => { mounted = false; };
  }, [setServerMode]);

  const isMock = serverMode === 'mock';

  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6 flex-shrink-0">
      <div className="flex items-center gap-3">
        <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center">
          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10" />
          </svg>
        </div>
        <span className="font-semibold text-gray-900 text-sm">ShipStation V2 Demo</span>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">API Status</span>
          <span className={`flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
            apiStatus === 'online'
              ? 'bg-green-100 text-green-700'
              : apiStatus === 'offline'
              ? 'bg-red-100 text-red-700'
              : 'bg-gray-100 text-gray-500'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${
              apiStatus === 'online' ? 'bg-green-500' : apiStatus === 'offline' ? 'bg-red-500' : 'bg-gray-400'
            }`} />
            {apiStatus === 'online' ? 'Online' : apiStatus === 'offline' ? 'Offline' : 'Checking...'}
          </span>
        </div>

        <span className={`text-xs font-semibold px-3 py-1 rounded-full ${
          isMock
            ? 'bg-yellow-100 text-yellow-800 border border-yellow-300'
            : 'bg-green-100 text-green-800 border border-green-300'
        }`}>
          {isMock ? 'MOCK' : 'LIVE'}
        </span>
      </div>
    </header>
  );
}
