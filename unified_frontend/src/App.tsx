import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Login } from './pages/Login';
import { AppLayout } from './layouts/AppLayout';
import { DashboardView } from './components/DashboardView';
import { TradingTerminal } from './components/TradingTerminal';
import { StrategiesView } from './components/StrategiesView';
import { PortfolioView } from './components/PortfolioView';
import { OrdersView } from './components/OrdersView';
import { SettingsView } from './components/SettingsView';
import { UserProfileView } from './components/UserProfileView';
import { StrategyBuilderView } from './components/StrategyBuilder/StrategyBuilderView';
import { AIChatView } from './components/AIChatView';
import { BacktestCenterView } from './components/BacktestCenterView';
import { CommunityView } from './components/CommunityView';
import { OptionsView } from './components/OptionsView';
import { GlobalMarketView } from './components/GlobalMarketView';
import { BillingView } from './components/BillingView';
import { SignalAlertsView } from './components/SignalAlertsView';
import { UniverseView } from './components/UniverseView';
import { ToastContainer } from './components/ui/Toast';
import { ErrorBoundary } from './components/ErrorBoundary';

function App() {
  return (
    <Router>
      <ErrorBoundary>
        <Routes>
          <Route path="/" element={<Navigate to="/app/dashboard" replace />} />
          <Route path="/login" element={<Login />} />

          {/* Protected Application Shell */}
          <Route path="/app" element={<AppLayout />}>
            <Route path="dashboard" element={<DashboardView />} />
            <Route path="trading" element={<TradingTerminal />} />
            <Route path="strategies" element={<StrategiesView />} />
            <Route path="strategy-builder" element={<StrategyBuilderView />} />
            <Route path="global-market" element={<GlobalMarketView />} />
            <Route path="options" element={<OptionsView />} />
            <Route path="backtests" element={<BacktestCenterView />} />
            <Route path="community" element={<CommunityView />} />
            <Route path="chat" element={<AIChatView />} />
            <Route path="orders" element={<OrdersView />} />
            <Route path="portfolio" element={<PortfolioView />} />
            <Route path="settings" element={<SettingsView />} />
            <Route path="profile" element={<UserProfileView />} />
            <Route path="billing" element={<BillingView />} />
            <Route path="alerts" element={<SignalAlertsView />} />
            <Route path="universe" element={<UniverseView />} />
          </Route>
        </Routes>
      </ErrorBoundary>
      <ToastContainer />
    </Router>
  );
}

export default App;
