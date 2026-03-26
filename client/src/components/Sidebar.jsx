import React from 'react';
import { useFlow } from '../context/FlowContext';

const steps = [
  { id: 1, label: 'Address Validation', icon: '📍' },
  { id: 2, label: 'Get Rates',          icon: '💰' },
  { id: 3, label: 'Track Shipment',     icon: '🚚' },
  { id: 4, label: 'Webhooks',           icon: '🔔' },
  { id: 5, label: 'Test Checklist',     icon: '✅' },
];

const stepToCheckKey = {
  1: 'addressValid',
  2: 'rateFetching',
  3: 'trackingUpdates',
  4: 'webhookRegistration',
};

const MODE_LABELS = {
  mock:    { label: 'Mock Mode',    color: 'text-yellow-600 bg-yellow-50 border-yellow-200' },
  sandbox: { label: 'Sandbox',     color: 'text-blue-600 bg-blue-50 border-blue-200' },
  live:    { label: 'Live',        color: 'text-red-600 bg-red-50 border-red-200' },
};

export default function Sidebar() {
  const { activeStep, goToStep, checklistStatus, serverMode } = useFlow();

  function getStepStatus(stepId) {
    const key = stepToCheckKey[stepId];
    if (!key) return 'pending';
    return checklistStatus[key] || 'pending';
  }

  const modeStyle = MODE_LABELS[serverMode] || MODE_LABELS.mock;

  return (
    <aside className="w-60 bg-white border-r border-gray-200 flex flex-col flex-shrink-0">
      <div className="p-4 border-b border-gray-100">
        <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Fulfillment Flow</p>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {steps.map((step) => {
          const isActive = activeStep === step.id;
          const status = getStepStatus(step.id);

          return (
            <button
              key={step.id}
              onClick={() => goToStep(step.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all text-sm ${
                isActive
                  ? 'bg-blue-50 text-blue-700 font-medium'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <span className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-semibold flex-shrink-0 ${
                isActive
                  ? 'bg-blue-600 text-white'
                  : status === 'pass'
                  ? 'bg-green-500 text-white'
                  : status === 'fail'
                  ? 'bg-red-500 text-white'
                  : 'bg-gray-200 text-gray-600'
              }`}>
                {status === 'pass' && !isActive ? '✓' : status === 'fail' && !isActive ? '✗' : step.id}
              </span>
              <span className="truncate">{step.label}</span>
            </button>
          );
        })}
      </nav>
      <div className="p-4 border-t border-gray-100 space-y-2">
        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${modeStyle.color}`}>
          {modeStyle.label}
        </span>
        <p className="text-xs text-gray-400">ShipStation API v2</p>
      </div>
    </aside>
  );
}
