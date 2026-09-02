import { useMemo, useState } from 'react';
import PageHeader from '../components/layout/PageHeader.jsx';
import Card from '../components/ui/Card.jsx';
import DataTable from '../components/ui/DataTable.jsx';
import Button from '../components/ui/Button.jsx';
import StatusBadge from '../components/ui/StatusBadge.jsx';
import { UserIcon } from '../components/ui/Icons.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useInventory } from '../context/InventoryContext.jsx';
import { generateReorderRule } from '../utils/inventoryLogic.js';
import styles from './Settings.module.css';

export default function Settings() {
  const { user, renameUser } = useAuth();
  const { products, reorderRules, addReorderRule, regenerateReorderRules } = useInventory();

  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(user?.username || '');
  const [generatorProductId, setGeneratorProductId] = useState('');

  const rules = useMemo(() => {
    return reorderRules.map((rule) => ({
      ...rule,
      productName: products.find((p) => p.id === rule.productId)?.name || rule.productId,
    }));
  }, [reorderRules, products]);

  // Every product already gets a rule the moment it's added (see
  // ProductForm / InventoryContext), so this list is normally empty — it
  // only matters if a rule was ever removed, or for re-previewing one.
  const unconfiguredProducts = products.filter((p) => !reorderRules.some((r) => r.productId === p.id));

  const previewProduct = products.find((p) => p.id === generatorProductId);
  const previewRule = previewProduct ? generateReorderRule(previewProduct, { id: `ROZ-${previewProduct.id.replace('PID-', '')}` }) : null;

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
      <PageHeader title="Settings" subtitle="Account and automated reorder rules" />

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
                  <Button type="submit" variant="accent">
                    Save
                  </Button>
                  <Button type="button" variant="secondary" onClick={() => setEditingName(false)}>
                    Cancel
                  </Button>
                </form>
              ) : (
                <>
                  <p className={styles.accountName}>
                    {user.username}
                    <button
                      type="button"
                      className={styles.editLink}
                      onClick={() => {
                        setNameDraft(user.username);
                        setEditingName(true);
                      }}
                    >
                      Edit
                    </button>
                  </p>
                  <p className={styles.accountMeta}>
                    {user.role} <StatusBadge status="Logged In" />
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
            <span className={styles.avatarLg}>
              <UserIcon width={20} height={20} />
            </span>
            <div className={styles.accountInfo}>
              <p className={styles.accountName}>Guest</p>
              <p className={styles.accountMeta}>
                Not signed in <StatusBadge status="No" />
              </p>
            </div>
          </div>
        )}
      </Card>

      <Card
        title="Automated Reorder Rules"
        action={
          <Button variant="secondary" onClick={regenerateReorderRules}>
            Recalculate All (current month)
          </Button>
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

      {unconfiguredProducts.length > 0 && (
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
                <option key={p.id} value={p.id}>
                  {p.name} ({p.id})
                </option>
              ))}
            </select>
            <Button variant="accent" disabled={!previewRule} onClick={handleSaveRule}>
              Save Generated Rule
            </Button>
          </div>

          {previewRule && (
            <div className={styles.previewGrid}>
              <div>
                <span className={styles.previewLabel}>Class</span>
                <StatusBadge status={previewRule.productClass} />
              </div>
              <div>
                <span className={styles.previewLabel}>Review Cycle</span>
                <span>{previewRule.reviewCycle}</span>
              </div>
              <div>
                <span className={styles.previewLabel}>Season</span>
                <span>{previewRule.seasonStart ? `${previewRule.seasonStart} – ${previewRule.seasonEnd}` : 'Non-seasonal'}</span>
              </div>
              <div>
                <span className={styles.previewLabel}>Avg Daily Usage</span>
                <span>{previewRule.avgDailyUsage}</span>
              </div>
              <div>
                <span className={styles.previewLabel}>Lead Time</span>
                <span>{previewRule.leadTimeDays} days</span>
              </div>
              <div>
                <span className={styles.previewLabel}>Safety Stock</span>
                <span>{previewRule.safetyStock}</span>
              </div>
              <div>
                <span className={styles.previewLabel}>Reorder Point</span>
                <span>
                  <strong>{previewRule.rop}</strong>
                </span>
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
