import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';
import { InventoryProvider } from './context/InventoryContext.jsx';
import AppLayout from './components/layout/AppLayout.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Products from './pages/Products.jsx';
import ProductForm from './pages/ProductForm.jsx';
import Transactions from './pages/Transactions.jsx';
import RecordTransaction from './pages/RecordTransaction.jsx';
import Analysis from './pages/Analysis.jsx';
import Settings from './pages/Settings.jsx';

export default function App() {
  return (
    <AuthProvider>
      <InventoryProvider>
        <Routes>
          <Route path="/" element={<Login />} />

          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />

            <Route path="/transactions" element={<Transactions />} />
            {/* Keep the old /transactions/receive URL working — "Orders" now covers this */}
            <Route path="/transactions/receive" element={<Navigate to="/transactions/new" replace />} />
            <Route path="/transactions/new" element={<RecordTransaction />} />

            <Route path="/products" element={<Products />} />
            <Route path="/products/new" element={<ProductForm />} />
            <Route path="/products/:id/edit" element={<ProductForm />} />

            <Route path="/analysis" element={<Analysis />} />
            {/* Keep the old /reports URL working for anyone with it bookmarked */}
            <Route path="/reports" element={<Navigate to="/analysis" replace />} />

            <Route path="/settings" element={<Settings />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </InventoryProvider>
    </AuthProvider>
  );
}
