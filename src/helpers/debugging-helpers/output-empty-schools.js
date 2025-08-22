const fs = require('fs');
const csv = require("csv-parser");
const { roleNameMap } = require("../../../data/index");
const createCsvWriter = require('csv-writer').createObjectCsvWriter;

// test empty schools in scraper.js in batches of 5

/**
 *  extract schools that returned nothing (from 0-2 emails for example) - for debugging purposes
 * */
async function extractSchools(checkFor = 0) {
    return new Promise((resolve, reject) => {
        const schools = [];

        fs.createReadStream("final_with_filled_in.csv") // scraped_schools.csv // final.csv
            .pipe(csv())
            .on('data', (row) => {
                let pushSchool = !!row.Website; // skipping over schools which have no url
                let emailsInSchool = [];

                for (const key in roleNameMap) {
                    const headerName = roleNameMap[key];

                    // 0 email logic
                    if (row[headerName]) {
                        pushSchool = false;
                    }

                    // 1 email logic
                    const string = row[headerName];
                    if (string) emailsInSchool.push(...string.split(", "))
                }

                // 0 email logic
                if (pushSchool && checkFor === 0) schools.push({ name: row['School Name'] || '', url: row.Website || '' });

                // 1 email logic
                if (emailsInSchool.length === 1 && checkFor === 1) schools.push({ name: row['School Name'] || '', url: row.Website || '' })
            })
            .on('end', () => resolve(schools))
            .on('error', reject);
    });
}

const csvWriter = createCsvWriter({
    path: 'empty_schools.csv', // 1_email_schools.csv
    header: [
        { id: 'name', title: 'School Name' },
        { id: 'url', title: 'Website' }
    ]
});

(async () => {
    const schools = await extractSchools(0);
    await csvWriter.writeRecords(schools);
})();
