import React, { useEffect } from 'react';
import { FlowProvider, useFlow } from './context/FlowContext';
import Layout from './components/Layout';
import Step1AddressValidation from './components/steps/Step1AddressValidation';
import Step2Rates from './components/steps/Step2Rates';
import Step3CreateLabel from './components/steps/Step3CreateLabel';
import Step4TrackShipment from './components/steps/Step4TrackShipment';
import Step5Webhooks from './components/steps/Step5Webhooks';
import Step6Checklist from './components/steps/Step6Checklist';
import { getHealth } from './api/shipstation';

const STEPS = {
  1: Step1AddressValidation,
  2: Step2Rates,
  3: Step3CreateLabel,
  4: Step4TrackShipment,
  5: Step5Webhooks,
  6: Step6Checklist,
};

function AppContent() {
  const { activeStep, setServerMode } = useFlow();
  const StepComponent = STEPS[activeStep] || Step1AddressValidation;

  useEffect(() => {
    getHealth()
      .then((data) => {
        if (data?.mode) setServerMode(data.mode);
      })
      .catch(() => {});
  }, [setServerMode]);

  return (
    <Layout>
      <StepComponent />
    </Layout>
  );
}

export default function App() {
  return (
    <FlowProvider>
      <AppContent />
    </FlowProvider>
  );
}
