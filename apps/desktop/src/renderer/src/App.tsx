import { Navigate, Route, Routes } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'
import RoleRoute from './components/RoleRoute'
import AppShellLayout from './components/AppShellLayout'
import BackendHealthBanner from './components/BackendHealthBanner'
import SetupPage from './pages/SetupPage'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import ProductsPage from './pages/ProductsPage'
import StockTakePage from './pages/StockTakePage'
import StockHistoryPage from './pages/StockHistoryPage'
import PosPage from './pages/PosPage'
import SalesHistoryPage from './pages/SalesHistoryPage'
import QuotationsPage from './pages/QuotationsPage'
import SuppliersPage from './pages/SuppliersPage'
import PayablesPage from './pages/PayablesPage'
import CustomersPage from './pages/CustomersPage'
import ReportsPage from './pages/ReportsPage'
import ExpensesPage from './pages/ExpensesPage'
import DayEndPage from './pages/DayEndPage'
import ReturnsPage from './pages/ReturnsPage'
import UsersPage from './pages/UsersPage'
import SettingsPage from './pages/SettingsPage'
import BackupPage from './pages/BackupPage'
import ActivityLogPage from './pages/ActivityLogPage'

export default function App(): JSX.Element {
  return (
    <>
      <BackendHealthBanner />
      <Routes>
      <Route path="/setup" element={<SetupPage />} />
      <Route path="/login" element={<LoginPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AppShellLayout />}>
          {/* All authenticated roles */}
          <Route path="/" element={<DashboardPage />} />
          <Route path="/pos" element={<PosPage />} />
          <Route path="/sales" element={<SalesHistoryPage />} />
          <Route path="/quotations" element={<QuotationsPage />} />

          {/* Admin + Manager */}
          <Route element={<RoleRoute allow={['Admin', 'Manager']} />}>
            <Route path="/products" element={<ProductsPage />} />
            <Route path="/stock-take" element={<StockTakePage />} />
            <Route path="/stock-history" element={<StockHistoryPage />} />
            <Route path="/suppliers" element={<SuppliersPage />} />
            <Route path="/payables" element={<PayablesPage />} />
            <Route path="/customers" element={<CustomersPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/expenses" element={<ExpensesPage />} />
            <Route path="/day-end" element={<DayEndPage />} />
            <Route path="/returns" element={<ReturnsPage />} />
          </Route>

          {/* Admin only */}
          <Route element={<RoleRoute allow={['Admin']} />}>
            <Route path="/users" element={<UsersPage />} />
            <Route path="/activity" element={<ActivityLogPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/backup" element={<BackupPage />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}
