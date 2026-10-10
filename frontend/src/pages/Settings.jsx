import { useMemo, useState } from 'react';
import PageHeader from '../components/layout/PageHeader.jsx';
import Card from '../components/ui/Card.jsx';
import DataTable from '../components/ui/DataTable.jsx';
import Button from '../components/ui/Button.jsx';
import StatusBadge from '../components/ui/StatusBadge.jsx';
import { UserIcon, PlusIcon, EditIcon, TrashIcon } from '../components/ui/Icons.jsx';
import { useAuth, usePermissions, ROLE_LABEL, ROLE_OPTIONS } from '../context/AuthContext.jsx';
import { useInventory } from '../context/InventoryContext.jsx';
import { generateReorderRule } from '../utils/inventoryLogic.js';
import styles from './Settings.module.css';

const emptySupplier = { name: '', contactPerson: '', phone: '', email: '', address: '' };

export default function Settings() {
  const { user, renameUser, registeredUsers, updateUserRole, toggleUserActive, deleteUser } = useAuth();
  const {
    canViewSuppliers,
    canAddSupplier,
    canEditSupplier,
    canDeleteSupplier,
    canManageAccounts,
    canManageReorderRules,
  } = usePermissions();
  const {
    products,
    reorderRules,
    addReorderRule,
    regenerateReorderRules,
    suppliers,
    addSupplier,
    editSupplier,
    deleteSupplier,
  } = useInventory();

  // ── Account ────────────────────────────────────────────────────────────
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(user?.username || '');

  // ── Reorder rules ──────────────────────────────────────────────────────
  const [generatorProductId, setGeneratorProductId] = useState('');

  const rules = useMemo(() => {
    return reorderRules.map((rule) => ({
      ...rule,
      productName: products.find((p) => p.id === rule.productId)?.name || rule.productId,
    }));
  }, [reorderRules, products]);

  const unconfiguredProducts = products.filter((p) => !reorderRules.some((r) => r.productId === p.id));

  const previewProduct = products.find((p) => p.id === generatorProductId);
  const previewRule = previewProduct
    ? generateReorderRule(previewProduct, { id: `ROZ-${previewProduct.id.replace('PID-', '')}` })
    : null;

  // ── Supplier management ────────────────────────────────────────────────
  // supplierModal: null = closed | 'add' | supplier-object (edit)
  const [supplierModal, setSupplierModal] = useState(null);
  const [supplierForm, setSupplierForm] = useState(emptySupplier);
  const [supplierError, setSupplierError] = useState('');
  const [deleteSupplierTarget, setDeleteSupplierTarget] = useState(null);

  // ── Account management ─────────────────────────────────────────────────
  // roleModal: null = closed | user-object (open for role change)
  const [roleModal, setRoleModal] = useState(null);
  const [roleDraft, setRoleDraft] = useState('');
  const [deleteAccountTarget, setDeleteAccountTarget] = useState(null);
  function openAddSupplier() {
    setSupplierForm(emptySupplier);
    setSupplierError('');
    setSupplierModal('add');
  }

  function openEditSupplier(s) {
    setSupplierForm({ name: s.name, contactPerson: s.contactPerson, phone: s.phone, email: s.email, address: s.address });
    setSupplierError('');
    setSupplierModal(s);
  }

  function updateSupplierForm(field, value) {
    setSupplierForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleSupplierSubmit(e) {
    e.preventDefault();
    setSupplierError('');
    if (!supplierForm.name.trim()) {
      setSupplierError('Supplier name is required.');
      return;
    }
    if (supplierModal === 'add') {
      addSupplier({ ...supplierForm });
    } else {
      editSupplier({ ...supplierModal, ...supplierForm });
    }
    setSupplierModal(null);
  }

  function handleDeleteSupplierConfirm() {
    if (deleteSupplierTarget) {
      deleteSupplier(deleteSupplierTarget.id);
      setDeleteSupplierTarget(null);
    }
  }

  // ── Account management handlers ────────────────────────────────────────
  function openRoleModal(account) {
    setRoleDraft(account.role);
    setRoleModal(account);
  }

  function handleRoleSubmit(e) {
    e.preventDefault();
    if (roleModal) {
      updateUserRole(roleModal.username, roleDraft);
      setRoleModal(null);
    }
  }

  function handleDeleteAccountConfirm() {
    if (deleteAccountTarget) {
      const result = deleteUser(deleteAccountTarget.username, user);
      if (result && !result.ok) {
        alert(result.message);
      }
      setDeleteAccountTarget(null);
    }
  }

  // ── Handlers ───────────────────────────────────────────────────────────
  function handleSaveName(e) {
    e.preventDefault();
    renameUser(nameDraft);
    setEditingName(false);
  }

  function handleSaveRule() {
    if (!previewRule) return;
    addReorderRule(previewRule);
    setGeneratorProductId('');
  }

  return (
    <div>
      <PageHeader title="Settings" subtitle="Account, suppliers, and automated reorder rules" />

      {/* ── Account ─────────────────────────────────────────────────── */}
      <Card title="Account" className={styles.accountCard}>
        {user ? (
          <div className={styles.accountRow}>
            <span className={styles.avatarLg}>{user.username.charAt(0).toUpperCase()}</span>
            <div className={styles.accountInfo}>
              {editingName ? (
                <form className={styles.nameForm} onSubmit={handleSaveName}>
                  <input
                    className={styles.nameInput}
                    value={nameDraft}
                    onChange={(e) => setNameDraft(e.target.value)}
                    autoFocus
                  />
                  <Button type="submit" variant="accent">Save</Button>
                  <Button type="button" variant="secondary" onClick={() => setEditingName(false)}>Cancel</Button>
                </form>
              ) : (
                <>
                  <p className={styles.accountName}>
                    {user.username}
                    <button
                      type="button"
                      className={styles.editLink}
                      onClick={() => { setNameDraft(user.username); setEditingName(true); }}
                    >
                      Edit
                    </button>
                  </p>
                  <p className={styles.accountMeta}>
                    {ROLE_LABEL[user.role]} <StatusBadge status="Logged In" />
                  </p>
                  <p className={styles.accountMeta}>
                    Session started {new Date(user.loginTime).toLocaleString()}
                  </p>
                </>
              )}
            </div>
          </div>
        ) : (
          <div className={styles.accountRow}>
            <span className={styles.avatarLg}><UserIcon width={20} height={20} /></span>
            <div className={styles.accountInfo}>
              <p className={styles.accountName}>Guest</p>
              <p className={styles.accountMeta}>Not signed in <StatusBadge status="No" /></p>
            </div>
          </div>
        )}
      </Card>

      {/* ── Supplier Management — visible to all roles; edit/add/delete gated ── */}
      {canViewSuppliers && (
        <Card
          title="Supplier Management"
          className={styles.supplierCard}
          action={
            canAddSupplier ? (
              <Button variant="accent" icon={PlusIcon} onClick={openAddSupplier}>
                Add Supplier
              </Button>
            ) : null
          }
        >
          <p className={styles.helperText}>
            Manage the suppliers that provide products to this inventory. Adding and deleting
            suppliers is restricted to Admins; Managers can edit supplier details.
          </p>
          <DataTable
            rowKey="id"
            rows={suppliers}
            emptyMessage="No suppliers yet — add one above."
            columns={[
              { key: 'id', header: 'Supplier ID' },
              { key: 'name', header: 'Supplier Name' },
              { key: 'contactPerson', header: 'Contact Person' },
              { key: 'phone', header: 'Phone' },
              { key: 'email', header: 'Email' },
              { key: 'address', header: 'Address' },
              ...(canEditSupplier || canDeleteSupplier
                ? [
                    {
                      key: '_actions',
                      header: 'Actions',
                      align: 'right',
                      render: (s) => (
                        <span className={styles.supplierActions}>
                          {canEditSupplier && (
                            <button
                              type="button"
                              className={styles.supplierActionBtn}
                              title="Edit supplier"
                              onClick={() => openEditSupplier(s)}
                            >
                              <EditIcon width={14} height={14} />
                              Edit
                            </button>
                          )}
                          {canDeleteSupplier && (
                            <button
                              type="button"
                              className={`${styles.supplierActionBtn} ${styles.supplierActionBtnDelete}`}
                              title="Delete supplier"
                              onClick={() => setDeleteSupplierTarget(s)}
                            >
                              <TrashIcon width={14} height={14} />
                              Delete
                            </button>
                          )}
                        </span>
                      ),
                    },
                  ]
                : []),
            ]}
          />
        </Card>
      )}

      {/* ── Accounts Management — Admin only ────────────────────────── */}
      {canManageAccounts && (
        <Card
          title="Accounts Management"
          className={styles.accountsCard}
        >
          <p className={styles.helperText}>
            Manage all registered accounts. Only Admins can view and edit this section.
          </p>
          <DataTable
            rowKey="username"
            rows={registeredUsers}
            emptyMessage="No accounts found."
            columns={[
              { key: 'username', header: 'Username' },
              {
                key: 'role',
                header: 'Role',
                render: (acct) => ROLE_LABEL[acct.role] ?? acct.role,
              },
              {
                key: 'active',
                header: 'Status',
                render: (acct) => (
                  <StatusBadge status={acct.active ? 'Active' : 'Inactive'} />
                ),
              },
              {
                key: '_actions',
                header: 'Actions',
                align: 'right',
                render: (acct) => (
                  <span className={styles.supplierActions}>
                    <button
                      type="button"
                      className={styles.supplierActionBtn}
                      title="Change role"
                      onClick={() => openRoleModal(acct)}
                    >
                      <EditIcon width={14} height={14} />
                      Role
                    </button>
                    <button
                      type="button"
                      className={styles.supplierActionBtn}
                      title={acct.active ? 'Deactivate account' : 'Reactivate account'}
                      onClick={() => {
                        const res = toggleUserActive(acct.username, user);
                        if (res && !res.ok) alert(res.message);
                      }}
                    >
                      {acct.active ? 'Deactivate' : 'Reactivate'}
                    </button>
                    <button
                      type="button"
                      className={`${styles.supplierActionBtn} ${styles.supplierActionBtnDelete}`}
                      title="Delete account"
                      onClick={() => setDeleteAccountTarget(acct)}
                    >
                      <TrashIcon width={14} height={14} />
                      Delete
                    </button>
                  </span>
                ),
              },
            ]}
          />
        </Card>
      )}

      {/* ── Automated Reorder Rules ──────────────────────────────────── */}
      <Card
        title="Automated Reorder Rules"
        action={
          canManageReorderRules ? (
            <Button
              variant="secondary"
              onClick={regenerateReorderRules}
            >
              Recalculate All (current month)
            </Button>
          ) : null
        }
      >
        <p className={styles.helperText}>
          Every rule below is generated automatically from each product's ABC classification —
          review cadence, demand, lead time, safety stock, and Reorder Point are never typed in by
          hand.
        </p>
        <DataTable
          rowKey="id"
          rows={rules}
          emptyMessage="No products yet — add one to generate its first reorder rule."
          columns={[
            { key: 'id', header: 'Reorder Rule ID' },
            { key: 'productName', header: 'Product' },
            { key: 'productClass', header: 'Class', render: (r) => <StatusBadge status={r.productClass} /> },
            { key: 'reviewCycle', header: 'Review Cycle' },
            { key: 'seasonStart', header: 'Season Start', render: (r) => r.seasonStart || '—' },
            { key: 'seasonEnd', header: 'Season End', render: (r) => r.seasonEnd || '—' },
            { key: 'avgDailyUsage', header: 'Avg Daily Usage', align: 'right' },
            { key: 'leadTimeDays', header: 'Lead Time (Days)', align: 'right' },
            { key: 'safetyStock', header: 'Safety Stock', align: 'right' },
            { key: 'rop', header: 'Reorder Point', align: 'right' },
          ]}
        />
      </Card>

      {canManageReorderRules && unconfiguredProducts.length > 0 && (
        <Card title="Generate a Missing Rule" className={styles.generatorCard}>
          <p className={styles.helperText}>
            Pick a product — its rule is computed automatically from its class, nothing to fill in by hand.
          </p>
          <div className={styles.generatorRow}>
            <select
              className={styles.generatorSelect}
              value={generatorProductId}
              onChange={(e) => setGeneratorProductId(e.target.value)}
            >
              <option value="">Select a product…</option>
              {unconfiguredProducts.map((p) => (
                <option key={p.id} value={p.id}>{p.name} ({p.id})</option>
              ))}
            </select>
            <Button
              variant="accent"
              icon={PlusIcon}
              disabled={!previewRule}
              onClick={handleSaveRule}
            >
              Save Generated Rule
            </Button>
          </div>

          {previewRule && (
            <div className={styles.previewGrid}>
              <div><span className={styles.previewLabel}>Class</span><StatusBadge status={previewRule.productClass} /></div>
              <div><span className={styles.previewLabel}>Review Cycle</span><span>{previewRule.reviewCycle}</span></div>
              <div>
                <span className={styles.previewLabel}>Season</span>
                <span>{previewRule.seasonStart ? `${previewRule.seasonStart} – ${previewRule.seasonEnd}` : 'Non-seasonal'}</span>
              </div>
              <div><span className={styles.previewLabel}>Avg Daily Usage</span><span>{previewRule.avgDailyUsage}</span></div>
              <div><span className={styles.previewLabel}>Lead Time</span><span>{previewRule.leadTimeDays} days</span></div>
              <div><span className={styles.previewLabel}>Safety Stock</span><span>{previewRule.safetyStock}</span></div>
              <div><span className={styles.previewLabel}>Reorder Point</span><span><strong>{previewRule.rop}</strong></span></div>
            </div>
          )}
        </Card>
      )}

      {/* ── Add / Edit Supplier modal ────────────────────────────────── */}
      {supplierModal !== null && (
        <div className={styles.modalOverlay} onClick={() => setSupplierModal(null)}>
          <div className={styles.modalBox} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>
              {supplierModal === 'add' ? 'Add Supplier' : 'Edit Supplier'}
            </h3>
            {supplierError && <p className={styles.modalError}>{supplierError}</p>}
            <form onSubmit={handleSupplierSubmit}>
              <div className={styles.modalGrid}>
                <label className={styles.modalLabel}>
                  Supplier Name <span className={styles.required}>*</span>
                  <input
                    className={styles.modalInput}
                    value={supplierForm.name}
                    onChange={(e) => updateSupplierForm('name', e.target.value)}
                    placeholder="e.g. CoolAire Distributors"
                    required
                  />
                </label>
                <label className={styles.modalLabel}>
                  Contact Person
                  <input
                    className={styles.modalInput}
                    value={supplierForm.contactPerson}
                    onChange={(e) => updateSupplierForm('contactPerson', e.target.value)}
                    placeholder="e.g. Juan dela Cruz"
                  />
                </label>
                <label className={styles.modalLabel}>
                  Phone
                  <input
                    className={styles.modalInput}
                    value={supplierForm.phone}
                    onChange={(e) => updateSupplierForm('phone', e.target.value)}
                    placeholder="e.g. 09171234567"
                  />
                </label>
                <label className={styles.modalLabel}>
                  Email
                  <input
                    className={styles.modalInput}
                    type="email"
                    value={supplierForm.email}
                    onChange={(e) => updateSupplierForm('email', e.target.value)}
                    placeholder="e.g. supplier@email.com"
                  />
                </label>
                <label className={`${styles.modalLabel} ${styles.modalLabelFull}`}>
                  Address
                  <input
                    className={styles.modalInput}
                    value={supplierForm.address}
                    onChange={(e) => updateSupplierForm('address', e.target.value)}
                    placeholder="e.g. Quezon City, Metro Manila"
                  />
                </label>
              </div>
              <div className={styles.modalFooter}>
                <Button type="button" variant="secondary" onClick={() => setSupplierModal(null)}>
                  Cancel
                </Button>
                <Button type="submit" variant="accent">
                  {supplierModal === 'add' ? 'Save Supplier' : 'Save Changes'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Delete Supplier confirmation ─────────────────────────────── */}
      {deleteSupplierTarget && (
        <div className={styles.modalOverlay} onClick={() => setDeleteSupplierTarget(null)}>
          <div className={styles.modalBox} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>Delete Supplier?</h3>
            <p className={styles.modalBody}>
              <strong>{deleteSupplierTarget.name}</strong> ({deleteSupplierTarget.id}) will be
              permanently removed. This cannot be undone.
            </p>
            <div className={styles.modalFooter}>
              <Button variant="secondary" onClick={() => setDeleteSupplierTarget(null)}>Cancel</Button>
              <Button variant="danger" onClick={handleDeleteSupplierConfirm}>Delete</Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Change Role modal ───────────────────────────────────────── */}
      {roleModal !== null && (
        <div className={styles.modalOverlay} onClick={() => setRoleModal(null)}>
          <div className={styles.modalBox} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>Change Role — {roleModal.username}</h3>
            <form onSubmit={handleRoleSubmit}>
              <div className={styles.modalBody}>
                <label className={styles.modalLabel}>
                  New Role
                  <select
                    className={styles.modalInput}
                    value={roleDraft}
                    onChange={(e) => setRoleDraft(e.target.value)}
                  >
                    {ROLE_OPTIONS.map((r) => (
                      <option key={r} value={r}>{ROLE_LABEL[r]}</option>
                    ))}
                  </select>
                </label>
              </div>
              <div className={styles.modalFooter}>
                <Button type="button" variant="secondary" onClick={() => setRoleModal(null)}>
                  Cancel
                </Button>
                <Button type="submit" variant="accent">
                  Save Role
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Delete Account confirmation ──────────────────────────────── */}
      {deleteAccountTarget && (
        <div className={styles.modalOverlay} onClick={() => setDeleteAccountTarget(null)}>
          <div className={styles.modalBox} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>Delete Account?</h3>
            <p className={styles.modalBody}>
              <strong>{deleteAccountTarget.username}</strong> will be permanently removed.
              This cannot be undone.
            </p>
            <div className={styles.modalFooter}>
              <Button variant="secondary" onClick={() => setDeleteAccountTarget(null)}>Cancel</Button>
              <Button variant="danger" onClick={handleDeleteAccountConfirm}>Delete</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
