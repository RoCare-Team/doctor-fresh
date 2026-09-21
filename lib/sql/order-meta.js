// The follow-up work on an order that the `sale` row has no place for:
// where it is in the team's workflow (active / completed / not interested /
// duplicate / deleted), call remarks, the courier and tracking number, whether
// COD cash has been collected, and whether it was a test order.
//
// Kept beside the order in `df_order_meta` (created on first use), so the
// `sale` row — which the PHP panel and the customer's order page read — is
// never altered. "Delete" here only moves an order to the Deleted tab.

import { query, mutate } from '@/lib/db';

const TABLE = 'df_order_meta';
const store = globalThis;
const clean = (v, max = 255) => String(v ?? '').trim().slice(0, max);

export const ORDER_STAGES = [
  { id: 'active', label: 'Active' },
  { id: 'completed', label: 'Completed' },
  { id: 'not_interested', label: 'Not Interested' },
  { id: 'duplicate', label: 'Duplicate' },
  { id: 'deleted', label: 'Deleted' },
];

export const COURIERS = [
  'Self delivery', 'Delhivery', 'Blue Dart', 'DTDC', 'Ecom Express', 'Xpressbees', 'Shadowfax',
  'Ekart', 'India Post', 'Shiprocket', 'Porter', 'Other',
];

async function ensureTable() {
  if (store.__dfOrderMetaTable) return true;
  try {
    await mutate(
      `CREATE TABLE IF NOT EXISTS \`${TABLE}\` (
        \`sale_id\` INT NOT NULL PRIMARY KEY,
        \`stage\` VARCHAR(20) NOT NULL DEFAULT 'active',
        \`is_test\` TINYINT(1) NOT NULL DEFAULT 0,
        \`courier\` VARCHAR(60) NOT NULL DEFAULT '',
        \`tracking\` VARCHAR(100) NOT NULL DEFAULT '',
        \`cod_collected\` TINYINT(1) NOT NULL DEFAULT 0,
        \`remarks\` MEDIUMTEXT NULL,
        \`updated_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        KEY \`idx_stage\` (\`stage\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
    );
    store.__dfOrderMetaTable = true;
    return true;
  } catch (err) {
    console.error('[order-meta] table unavailable:', err.code || err.message);
    return false;
  }
}

const parseRemarks = (text) => {
  try {
    const list = JSON.parse(text || '[]');
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
};

export const EMPTY_META = {
  stage: 'active', isTest: false, courier: '', tracking: '', codCollected: false, remarks: [],
};

function metaRow(r) {
  return {
    stage: ORDER_STAGES.some((s) => s.id === r.stage) ? r.stage : 'active',
    isTest: Number(r.is_test) === 1,
    courier: r.courier || '',
    tracking: r.tracking || '',
    codCollected: Number(r.cod_collected) === 1,
    remarks: parseRemarks(r.remarks),
  };
}

/** sale_id → meta, for every order that has any. */
export async function orderMetaMap() {
  if (!(await ensureTable())) return new Map();
  const rows = await query(`SELECT * FROM \`${TABLE}\``);
  return new Map((rows || []).map((r) => [Number(r.sale_id), metaRow(r)]));
}

/**
 * Payment attempts per order, so an unpaid online order that the gateway
 * declined can be told apart from one that is simply still pending.
 */
export async function failedPaymentOrders() {
  const rows = await query(
    `SELECT \`order_id\`, SUM(\`status\` = 'failed') AS \`failed\`, SUM(\`status\` = 'success') AS \`ok\`
       FROM \`payment_transactions\` GROUP BY \`order_id\``,
  );
  return new Set((rows || []).filter((r) => Number(r.failed) > 0 && !Number(r.ok)).map((r) => Number(r.order_id)));
}

async function current(saleId) {
  const rows = await query(`SELECT * FROM \`${TABLE}\` WHERE \`sale_id\` = ? LIMIT 1`, [saleId]);
  return rows?.[0] ? metaRow(rows[0]) : { ...EMPTY_META };
}

async function write(saleId, meta) {
  await mutate(
    `INSERT INTO \`${TABLE}\` (\`sale_id\`, \`stage\`, \`is_test\`, \`courier\`, \`tracking\`, \`cod_collected\`, \`remarks\`)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE \`stage\` = VALUES(\`stage\`), \`is_test\` = VALUES(\`is_test\`),
       \`courier\` = VALUES(\`courier\`), \`tracking\` = VALUES(\`tracking\`),
       \`cod_collected\` = VALUES(\`cod_collected\`), \`remarks\` = VALUES(\`remarks\`)`,
    [saleId, meta.stage, meta.isTest ? 1 : 0, meta.courier, meta.tracking, meta.codCollected ? 1 : 0, JSON.stringify(meta.remarks)],
  );
}

/**
 * Applies one change to several orders at once (bulk actions) or one.
 * `patch` may carry stage, isTest, courier, tracking, codCollected,
 * addRemark (text), editRemark ({ index, text }) or removeRemark (index).
 */
export async function updateOrderMeta(saleIds, patch, adminName = '') {
  if (!(await ensureTable())) return { error: 'The order notes table is not available.' };
  const ids = [].concat(saleIds).map(Number).filter((n) => n > 0).slice(0, 1000);
  if (!ids.length) return { error: 'No order chosen.' };

  const results = {};
  for (const id of ids) {
    // eslint-disable-next-line no-await-in-loop
    const meta = await current(id);
    if (patch.stage !== undefined) {
      if (!ORDER_STAGES.some((s) => s.id === patch.stage)) return { error: 'Unknown stage.' };
      meta.stage = patch.stage;
    }
    if (patch.isTest !== undefined) meta.isTest = Boolean(patch.isTest);
    if (patch.courier !== undefined) meta.courier = clean(patch.courier, 60);
    if (patch.tracking !== undefined) meta.tracking = clean(patch.tracking, 100);
    if (patch.codCollected !== undefined) meta.codCollected = Boolean(patch.codCollected);
    if (patch.addRemark) {
      const text = clean(patch.addRemark, 1000);
      if (text) meta.remarks.push({ text, at: Date.now(), by: clean(adminName, 80) });
    }
    if (patch.editRemark && meta.remarks[patch.editRemark.index]) {
      const text = clean(patch.editRemark.text, 1000);
      if (text) meta.remarks[patch.editRemark.index] = { ...meta.remarks[patch.editRemark.index], text, editedAt: Date.now() };
    }
    if (patch.removeRemark !== undefined && meta.remarks[patch.removeRemark]) meta.remarks.splice(patch.removeRemark, 1);
    meta.remarks = meta.remarks.slice(-50);
    // eslint-disable-next-line no-await-in-loop
    await write(id, meta);
    results[id] = meta;
  }
  return { ok: true, meta: results };
}
