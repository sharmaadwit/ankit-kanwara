/**
 * Extract from pams_migration_ready_v3.csv:
 * - Unique account names (alphabetically)
 * - Per-account: industry counts (best-fit), sales rep names (for region hint), count of rows
 * - Duplicate candidates: same normalized name (lowercase, trim, collapse spaces)
 * Output: JSON and summary for MIGRATION_MAPPING_FOR_VALIDATION.md
 *
 * Run from project root: node scripts/extract-migration-mapping.js
 */

const fs = require('fs');
const path = require('path');

const CSV_PATH = path.join(__dirname, '..', '..', 'Project-PAT-LocalArchive', '2026-02-11_161551', 'pams_migration_ready_v3.csv');

// Canonical PAMS industries (from CAI + your list)
const CANONICAL_INDUSTRIES = [
  'Banking', 'Fintech', 'Insurance', 'Retail / eCommerce', 'Healthcare',
  'B2B / Manufacturing', 'Automotive', 'Real Estate', 'Hospitality',
  'Transportation', 'Sports', 'Gov / Citizen Services', 'Education',
  'Media & Entertainment', 'IT & Software', 'CPG & FMCG', 'Pharma & Life Sciences',
  'Logistics & Supply Chain', 'Industrial', 'Agritech', 'Professional Services'
];

// Map source industry string -> PAMS canonical
function mapToCanonicalIndustry(source) {
  if (!source || typeof source !== 'string') return null;
  const s = source.trim();
  const lower = s.toLowerCase();
  const map = {
    'bfsi': 'Banking',
    'banking': 'Banking',
    'financial services': 'Fintech',
    'fintech': 'Fintech',
    'insurance': 'Insurance',
    'retail & ecommerce': 'Retail / eCommerce',
    'retail / ecommerce': 'Retail / eCommerce',
    'retail': 'Retail / eCommerce',
    'healthcare': 'Healthcare',
    'b2b / manufacturing': 'B2B / Manufacturing',
    'automotive': 'Automotive',
    'automative': 'Automotive',
    'real estate': 'Real Estate',
    'hospitality': 'Hospitality',
    'transportation': 'Transportation',
    'sports': 'Sports',
    'gov / citizen services': 'Gov / Citizen Services',
    'government': 'Gov / Citizen Services',
    'goverment': 'Gov / Citizen Services',
    'education': 'Education',
    'media': 'Media & Entertainment',
    'media & entertainment': 'Media & Entertainment',
    'it & software': 'IT & Software',
    'travel & hospitality': 'Hospitality',
    'travel and hospitality': 'Hospitality',
    'f&b': 'CPG & FMCG',
    'cpg & fmcg': 'CPG & FMCG',
    'utility : energy, gas': 'Industrial',
    'industrial': 'Industrial',
    'logistics': 'Logistics & Supply Chain',
    'logistics & supply chain': 'Logistics & Supply Chain',
    'pharma': 'Pharma & Life Sciences',
    'pharma & life sciences': 'Pharma & Life Sciences',
    'agritech': 'Agritech',
    'professional services': 'Professional Services',
    'consulting': 'Professional Services'
  };
  return map[lower] || (CANONICAL_INDUSTRIES.includes(s) ? s : null);
}

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      inQuotes = !inQuotes;
    } else if ((c === ',' && !inQuotes) || (c === '\n' && !inQuotes)) {
      result.push(current.trim());
      current = '';
      if (c === '\n') break;
    } else {
      current += c;
    }
  }
  if (current.length) result.push(current.trim());
  return result;
}

function normalizeAccountName(name) {
  if (!name || typeof name !== 'string') return '';
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[,.\-_/\\]/g, ' ');
}

function main() {
  let csvContent;
  try {
    csvContent = fs.readFileSync(CSV_PATH, 'utf8');
  } catch (e) {
    console.error('Cannot read CSV:', CSV_PATH, e.message);
    process.exit(1);
  }

  const lines = csvContent.split(/\r?\n/).filter(Boolean);
  const header = parseCSVLine(lines[0]);
  const accountNameIdx = header.indexOf('Account Name');
  const projectNameIdx = header.indexOf('Project Name');
  const salesRepIdx = header.indexOf('Sales Rep Name');
  const industryIdx = header.indexOf('Industry');

  if (accountNameIdx === -1 || industryIdx === -1) {
    console.error('Expected columns Account Name, Industry. Header:', header);
    process.exit(1);
  }

  const byAccount = new Map(); // accountName -> { industries: {}, salesReps: Set, rows: number }
  for (let i = 1; i < lines.length; i++) {
    const fields = parseCSVLine(lines[i]);
    const accountName = (fields[accountNameIdx] || '').trim();
    const industry = (fields[industryIdx] || '').trim();
    const salesRep = (fields[salesRepIdx] || '').trim();
    if (!accountName) continue;

    if (!byAccount.has(accountName)) {
      byAccount.set(accountName, { industries: {}, salesReps: new Set(), rows: 0 });
    }
    const rec = byAccount.get(accountName);
    rec.rows++;
    if (industry) rec.industries[industry] = (rec.industries[industry] || 0) + 1;
    if (salesRep) rec.salesReps.add(salesRep);
  }

  // Best-fit industry per account (majority vote, then map to canonical)
  const accountList = Array.from(byAccount.keys()).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
  const duplicateGroups = new Map(); // normalizedName -> [ original names ]
  for (const name of accountList) {
    const norm = normalizeAccountName(name);
    if (!norm) continue;
    if (!duplicateGroups.has(norm)) duplicateGroups.set(norm, []);
    const group = duplicateGroups.get(norm);
    if (!group.includes(name)) group.push(name);
  }

  const duplicateCandidates = Array.from(duplicateGroups.entries())
    .filter(([, names]) => names.length > 1)
    .map(([norm, names]) => ({ normalized: norm, variants: names.sort() }));

  // Build best-fit per account
  const bestFitPerAccount = [];
  for (const accountName of accountList) {
    const rec = byAccount.get(accountName);
    const industryCounts = Object.entries(rec.industries).sort((a, b) => b[1] - a[1]);
    const topIndustry = industryCounts[0] ? industryCounts[0][0] : null;
    const canonical = mapToCanonicalIndustry(topIndustry);
    const suggested = canonical || (topIndustry ? topIndustry + ' (add to canonical?)' : null);
    bestFitPerAccount.push({
      accountName,
      rowCount: rec.rows,
      topSourceIndustry: topIndustry,
      allSourceIndustries: rec.industries,
      suggestedPamsIndustry: suggested,
      salesReps: Array.from(rec.salesReps).slice(0, 5),
      isDuplicateVariant: duplicateGroups.get(normalizeAccountName(accountName))?.length > 1
    });
  }

  const outDir = path.join(__dirname, '..', 'docs');
  const jsonPath = path.join(outDir, 'migration-mapping-extract.json');
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(jsonPath, JSON.stringify({
    generatedAt: new Date().toISOString(),
    sourceCsv: path.basename(CSV_PATH),
    accountCount: accountList.length,
    duplicateGroupCount: duplicateCandidates.length,
    bestFitPerAccount: bestFitPerAccount.slice(0, 500),
    duplicateCandidates: duplicateCandidates.slice(0, 100),
    canonicalIndustries: CANONICAL_INDUSTRIES
  }, null, 2), 'utf8');
  console.log('Wrote', jsonPath);

  // Summary for markdown
  const md = [];
  md.push('# Migration mapping (for validation)');
  md.push('');
  md.push('Generated from `pams_migration_ready_v3.csv`. Use this to validate best-fit industry and duplicate groups before implementation.');
  md.push('');
  md.push('## 1. Canonical PAMS industries');
  md.push('');
  CANONICAL_INDUSTRIES.forEach((ind, i) => md.push(`${i + 1}. ${ind}`));
  md.push('');
  md.push('## 2. Source → PAMS industry mapping (used for best-fit)');
  md.push('');
  md.push('| Source (from CSV) | PAMS canonical |');
  md.push('|-------------------|----------------|');
  md.push('| BFSI, Banking | Banking |');
  md.push('| Financial Services, Fintech | Fintech |');
  md.push('| Insurance | Insurance |');
  md.push('| Retail & eCommerce, Retail / eCommerce | Retail / eCommerce |');
  md.push('| Education, Healthcare, Automotive, etc. | (see script map) |');
  md.push('| Goverment (typo) | Gov / Citizen Services |');
  md.push('| utility : energy, gas | Industrial |');
  md.push('| F&B | CPG & FMCG |');
  md.push('');
  md.push('## 3. Duplicate candidates (normalized name)');
  md.push('');
  md.push('Accounts that share the same normalized name (lowercase, trim, collapse spaces) – review for merge in Migration mode.');
  md.push('');
  if (duplicateCandidates.length === 0) {
    md.push('*No duplicate groups found with current normalization.*');
  } else {
    duplicateCandidates.slice(0, 50).forEach(({ normalized, variants }) => {
      md.push(`- **${normalized}**: ${variants.join(', ')}`);
    });
    if (duplicateCandidates.length > 50) md.push(`- … and ${duplicateCandidates.length - 50} more groups.`);
  }
  md.push('');
  md.push('## 4. Sample: Account → best-fit Industry (first 80)');
  md.push('');
  md.push('| Account Name | Row count | Top source industry | Suggested PAMS industry | Duplicate? |');
  md.push('|--------------|-----------|----------------------|------------------------|------------|');
  bestFitPerAccount.slice(0, 80).forEach(({ accountName, rowCount, topSourceIndustry, suggestedPamsIndustry, isDuplicateVariant }) => {
    const dup = isDuplicateVariant ? 'Yes' : '';
    md.push(`| ${accountName.replace(/\|/g, '\\|')} | ${rowCount} | ${(topSourceIndustry || '').replace(/\|/g, '\\|')} | ${(suggestedPamsIndustry || '').replace(/\|/g, '\\|')} | ${dup} |`);
  });
  md.push('');
  md.push('## 5. Win match categories (to apply after parsing Wins xlsx)');
  md.push('');
  md.push('- **Strong (Green):** Win row has matching account + linked activities in migration data.');
  md.push('- **Medium (Yellow):** Account or SFDC match but not all activities linked.');
  md.push('- **Weak (Red):** No matching account or no activities; needs manual review.');
  md.push('');
  md.push('---');
  md.push('*Full list in `docs/migration-mapping-extract.json` (up to 500 accounts, 100 duplicate groups).*');
  md.push('');

  const mdPath = path.join(outDir, 'MIGRATION_MAPPING_FOR_VALIDATION.md');
  fs.writeFileSync(mdPath, md.join('\n'), 'utf8');
  console.log('Wrote', mdPath);
  console.log('Accounts:', accountList.length, 'Duplicate groups:', duplicateCandidates.length);
}

main();
