import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';
import { InventoryProvider } from './context/InventoryContext.jsx';
<<<<<<< HEAD
=======
import RequireAuth from './components/auth/RequireAuth.jsx';
import RequireRole from './components/auth/RequireRole.jsx';
>>>>>>> origin/role-based-access
import AppLayout from './components/layout/AppLayout.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Products from './pages/Products.jsx';
import ProductForm from './pages/ProductForm.jsx';
import Transactions from './pages/Transactions.jsx';
import RecordTransaction from './pages/RecordTransaction.jsx';
import Analysis from './pages/Analysis.jsx';
import Settings from './pages/Settings.jsx';

<<<<<<< HEAD
=======
// Access rules (frontend-only, no backend):
//   admin   -> every module, unrestricted.
//   manager -> can VIEW every module; on Transactions can add + change status.
//   staff   -> can VIEW every module; on Transactions can only change status.
// View pages (Dashboard, Products, Transactions, Analysis, Settings) are open
// to any logged-in role — the add/edit controls *inside* them are what's
// locked per role (see LockIcon usage in Products/Settings/Transactions).
// Pure write-action pages (create/edit forms) are gated at the route level
// since there's no separate "view" for a form.
>>>>>>> origin/role-based-access
export default function App() {
  return (
    <AuthProvider>
      <InventoryProvider>
        <Routes>
          <Route path="/" element={<Login />} />

<<<<<<< HEAD
          <Route element={<AppLayout />}>
=======
          <Route
            element={
              <RequireAuth>
                <AppLayout />
              </RequireAuth>
            }
          >
>>>>>>> origin/role-based-access
            <Route path="/dashboard" element={<Dashboard />} />

            <Route path="/transactions" element={<Transactions />} />
            {/* Keep the old /transactions/receive URL working — "Orders" now covers this */}
            <Route path="/transactions/receive" element={<Navigate to="/transactions/new" replace />} />
<<<<<<< HEAD
            <Route path="/transactions/new" element={<RecordTransaction />} />

            <Route path="/products" element={<Products />} />
            <Route path="/products/new" element={<ProductForm />} />
            <Route path="/products/:id/edit" element={<ProductForm />} />
=======
            {/* Deep-link fallback for the same form Transactions also opens as a pop-up. */}
            <Route
              path="/transactions/new"
              element={
                <RequireRole allow={['admin', 'manager']}>
                  <RecordTransaction />
                </RequireRole>
              }
            />

            <Route path="/products" element={<Products />} />
            <Route
              path="/products/new"
              element={
                <RequireRole allow={['admin']}>
                  <ProductForm />
                </RequireRole>
              }
            />
            <Route
              path="/products/:id/edit"
              element={
                <RequireRole allow={['admin']}>
                  <ProductForm />
                </RequireRole>
              }
            />
>>>>>>> origin/role-based-access

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
