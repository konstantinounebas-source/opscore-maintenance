import { base44 } from "@/api/base44Client";

const PREFIX_MAP = {
  make_safe: "MS",
  inspection: "INSP",
  corrective: "CORR",
};

/**
 * Generates a sequential work order ID based on existing WOs.
 * Format: PREFIX-001, PREFIX-002, ...
 * @param {"make_safe"|"inspection"|"corrective"} woType
 * @returns {Promise<string>}
 */
export async function generateWorkOrderId(woType) {
  const prefix = PREFIX_MAP[woType] || woType.toUpperCase();
  const allWOs = await base44.entities.WorkOrders.list();
  const existing = allWOs.filter(w => {
    const id = w.work_order_id || "";
    return id.startsWith(`${prefix}-`);
  });

  let maxNum = 0;
  for (const wo of existing) {
    const parts = wo.work_order_id.split("-");
    const num = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(num) && num > maxNum) maxNum = num;
  }

  const nextNum = String(maxNum + 1).padStart(3, "0");
  return `${prefix}-${nextNum}`;
}