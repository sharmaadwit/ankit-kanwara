/**
 * Regression: CSV headers are normalized to camelCase keys in bulkImport.processRows;
 * row evaluators must read those same keys (JavaScript property names are case-sensitive).
 */
const fs = require('fs');
const path = require('path');

const BULK_IMPORT_PATH = path.join(__dirname, '../../pams-app/js/bulkImport.js');

describe('CSV import field mapping (bulkImport.js)', () => {
    let source;
    beforeAll(() => {
        source = fs.readFileSync(BULK_IMPORT_PATH, 'utf8');
    });

    test('does not use obsolete lowercase-concatenated row accessors', () => {
        const obsoletePatterns = [
            'row.activitytype',
            'row.timespenttype',
            'row.timespentvalue',
            'row.internalactivityname',
            'row.internaltopic',
            'row.internaldescription',
            'row.salesrepname',
            'row.salesrepemail',
            'row.sfdclink',
            'row.usecases',
            'row.usecaseother',
            'row.productsother',
            'row.channelsother',
            'row.calltype',
            'row.pocaccesstype',
            'row.pocusecasedescription',
            'row.pocsandboxstartdate',
            'row.pocsandboxenddate',
            'row.pocdemoenvironment',
            'row.pocbottriggerurl',
            'row.sowlink',
            'row.rfxtype',
            'row.rfxdeadline',
            'row.rfxfolderlink',
            'row.rfxnotes'
        ];
        const hits = obsoletePatterns.filter((p) => source.includes(p));
        expect(hits).toEqual([]);
    });
});
