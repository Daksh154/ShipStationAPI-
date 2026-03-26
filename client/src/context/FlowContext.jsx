import React, { createContext, useContext, useState, useCallback } from 'react';

const defaultChecklist = {
  addressValid: 'pending',
  addressInvalid: 'pending',
  rateFetching: 'pending',
  labelCreate: 'pending',
  labelVoid: 'pending',
  webhookRegistration: 'pending',
  webhookReceipt: 'pending',
  trackingUpdates: 'pending',
  rateLimitHandling: 'pending',
};

const FlowContext = createContext(null);

export function FlowProvider({ children }) {
  const [activeStep, setActiveStep] = useState(1);
  const [validatedAddress, setValidatedAddress] = useState(null);
  const [selectedRate, setSelectedRate] = useState(null);
  const [carrierId, setCarrierId] = useState(null);
  const [labelId, setLabelId] = useState(null);
  const [trackingNumber, setTrackingNumber] = useState(null);
  const [labelVoided, setLabelVoided] = useState(false);
  const [checklistStatus, setChecklistStatus] = useState(defaultChecklist);
  const [serverMode, setServerMode] = useState('sandbox');

  const updateChecklist = useCallback((key, status) => {
    setChecklistStatus((prev) => ({ ...prev, [key]: status }));
  }, []);

  const goToStep = useCallback((step) => {
    setActiveStep(step);
  }, []);

  const value = {
    activeStep,
    goToStep,
    validatedAddress,
    setValidatedAddress,
    selectedRate,
    setSelectedRate,
    carrierId,
    setCarrierId,
    labelId,
    setLabelId,
    trackingNumber,
    setTrackingNumber,
    labelVoided,
    setLabelVoided,
    checklistStatus,
    updateChecklist,
    serverMode,
    setServerMode,
  };

  return <FlowContext.Provider value={value}>{children}</FlowContext.Provider>;
}

export function useFlow() {
  const ctx = useContext(FlowContext);
  if (!ctx) throw new Error('useFlow must be used inside FlowProvider');
  return ctx;
}
