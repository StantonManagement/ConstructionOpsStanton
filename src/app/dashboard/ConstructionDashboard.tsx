import OverviewView from './OverviewView';
import SubcontractorsView from './SubcontractorsView';
import ManageView from './ManageView';
import PaymentProcessingView from './PaymentProcessingView';
import ComplianceView from './ComplianceView';
import MetricsView from './MetricsView';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<OverviewView />} />
      <Route path="/subcontractors" element={<SubcontractorsView />} />
      <Route path="/manage" element={<ManageView />} />
      <Route path="/payment-processing" element={<PaymentProcessingView />} />
      <Route path="/compliance" element={<ComplianceView />} />
      <Route path="/metrics" element={<MetricsView />} />
    </Routes>
  );
}