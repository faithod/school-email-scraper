const fs = require('fs');
const csv = require('csv-parser');

async function loadExistingSchools(csvPath) {
    const alreadyProcessed = [];

    return new Promise((resolve, reject) => {
        if (!fs.existsSync(csvPath)) return resolve(alreadyProcessed);

        fs.createReadStream(csvPath)
            .pipe(csv())
            .on('data', (row) => {
                if (row['School Name']) {
                    alreadyProcessed.push({ name: row['School Name'] || '', url: row.Website || '' });
                }
            })
            .on('end', () => {
                console.log(`✅ Loaded ${alreadyProcessed.length} previously processed schools.`);
                resolve(alreadyProcessed);
            })
            .on('error', reject);
    });
}

module.exports = loadExistingSchools;