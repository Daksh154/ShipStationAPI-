import React from 'react';
import TopBar from './TopBar';
import Sidebar from './Sidebar';
import { useFlow } from '../context/FlowContext';

export default function Layout({ children }) {
  const { serverMode } = useFlow();
  const isMock = serverMode === 'mock';

  return (
    <div className="flex flex-col h-screen">
      <TopBar />
      {isMock && (
        <div className="bg-yellow-50 border-b border-yellow-200 px-6 py-2 flex items-center gap-2">
          <span className="text-yellow-600 text-sm font-medium">⚠ MOCK MODE — No real labels or charges</span>
          <span className="text-yellow-500 text-xs">All API calls go to ShipStation's official mock server</span>
        </div>
      )}
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto bg-gray-50 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
