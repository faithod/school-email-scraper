const fs = require('fs');
const csv = require("csv-parser");

// extract school urls from csv file
async function extractURLs() {
    return new Promise((resolve, reject) => {
        const schools = [];

        fs.createReadStream("data/list-of-schools.csv")
            .pipe(csv())
            .on('data', (row) => {
                // if (row.Website) {
                    schools.push({ name: row['School Name'] || '', url: row.Website || '' });
                // }
                // row.Website can be empty
            })
            .on('end', () => resolve(schools))
            .on('error', reject);
    });
}

module.exports = extractURLs