const fs = require('fs');
const csv = require("csv-parser");
const { roleNameMap } = require("../data/index");
const createCsvWriter = require('csv-writer').createObjectCsvWriter;

// extract schools that returned nothing - for debugging purposes
async function extractSchools() {
    return new Promise((resolve, reject) => {
        const schools = [];

        fs.createReadStream("scraped_schools.csv")
            .pipe(csv())
            .on('data', (row) => {
                let pushSchool = true;

                for (const key in roleNameMap) {
                    const headerName = roleNameMap[key];

                    if (row[headerName]) {
                        pushSchool = false;
                    }
                }

                if (pushSchool) schools.push({ name: row['School Name'] || '', url: row.Website || '' });
            })
            .on('end', () => resolve(schools))
            .on('error', reject);
    });
}

const csvWriter = createCsvWriter({
    path: 'empty_schools.csv',
    header: [
        { id: 'name', title: 'School Name' },
        { id: 'url', title: 'Website' }
    ]
});

(async () => {
    const schools = await extractSchools();
    await csvWriter.writeRecords(schools);
})();