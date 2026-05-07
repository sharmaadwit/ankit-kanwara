/**
 * Rebuild client-shaped account list from normalized `accounts` + `projects` tables when
 * storage.accounts is missing, empty, or corrupt. Shared by entities and storage routes.
 */
async function loadAccountsFromNormalizedTables(pool) {
  try {
    const { rows: accRows } = await pool.query(
      `SELECT id, name, industry, region, sales_rep, sales_rep_region, sales_rep_email, notes
       FROM accounts ORDER BY name ASC NULLS LAST, id ASC`
    );
    if (!accRows.length) return [];
    let projRows = [];
    try {
      const pr = await pool.query(
        `SELECT id, account_id, name, sfdc_link, use_cases, products_interested
         FROM projects ORDER BY name ASC NULLS LAST, id ASC`
      );
      projRows = pr.rows || [];
    } catch (e) {
      if (e.code !== '42P01') throw e;
    }
    const projectsByAccountId = new Map();
    for (const p of projRows) {
      const aid = p.account_id;
      if (!projectsByAccountId.has(aid)) projectsByAccountId.set(aid, []);
      projectsByAccountId.get(aid).push({
        id: p.id,
        name: p.name || '',
        sfdcLink: p.sfdc_link || null,
        useCases: Array.isArray(p.use_cases) ? p.use_cases : [],
        productsInterested: Array.isArray(p.products_interested) ? p.products_interested : []
      });
    }
    return accRows.map((r) => ({
      id: r.id,
      name: r.name || '',
      industry: r.industry || '',
      region: r.region || '',
      salesRep: r.sales_rep || '',
      salesRepRegion: r.sales_rep_region || '',
      salesRepEmail: r.sales_rep_email || '',
      notes: r.notes || '',
      projects: projectsByAccountId.get(r.id) || []
    }));
  } catch (e) {
    if (e.code === '42P01') return [];
    throw e;
  }
}

module.exports = { loadAccountsFromNormalizedTables };
