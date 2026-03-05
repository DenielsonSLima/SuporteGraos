export const isSqlCanonicalOpsEnabled = (): boolean => {
  const raw = String(process.env.VITE_SQL_CANONICAL_OPS || '').trim().toLowerCase();

  if (raw === 'false' || raw === '0' || raw === 'off') {
    return false;
  }

  if (raw === 'true' || raw === '1' || raw === 'on') {
    return true;
  }

  return true;
};

export const sqlCanonicalOpsLog = (message: string, error?: unknown) => {
  if (error) {
    console.warn(`[sql-canonical-ops] ${message}`, error);
    return;
  }

  console.info(`[sql-canonical-ops] ${message}`);
};
