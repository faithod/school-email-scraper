const fs = require('fs');
const csv = require("csv-parser");
const { roleNameMap } = require("../../../data/index");
const createCsvWriter = require('csv-writer').createObjectCsvWriter;

// NOT WORKING ‼️‼️
// SCRAPPED FOR NOW
// NEED UNIQUE KEYS IN DATA TBH

async function getFilledInSchools() {
    return new Promise((resolve, reject) => {
        const emptySchools = [];
        const final = [];


        fs.createReadStream("empty_schools.csv")
            .pipe(csv())
            .on('data', (row) => {
                emptySchools.push(row);
            })
            .on('end', () => {}) 
            .on('error', () => {});

        fs.createReadStream("final.csv") 
            .pipe(csv())
            .on('data', (row) => {
                if (!emptySchools.some(sch => sch.Website == row.Website && sch['School Name'] == row['School Name'])) final.push(row);
            })
            .on('end', () => resolve(final))
            .on('error', reject);
    });
}

const csvWriter = createCsvWriter({
    path: "final_without_emptyy.csv",
    header: [
        { id: 'LA (name)', title: 'LA (name)' },
        { id: 'School Name', title: 'School Name' },
        { id: 'Street', title: 'Street' },
        { id: 'Postcode', title: 'Postcode' },
        { id: 'Website', title: 'Website' },
        { id: 'TelephoneNum', title: 'TelephoneNum' },
        { id: 'HeadTitle (name)', title: 'HeadTitle (name)' },
        { id: 'HeadFirstName', title: 'HeadFirstName' },
        { id: 'HeadLastName', title: 'HeadLastName' },
        { id: 'GOR (name)', title: 'GOR (name)' },
        { id: 'DistrictAdministrative (name)', title: 'DistrictAdministrative (name)' },
        { id: roleNameMap.dsl, title: roleNameMap.dsl },
        { id: roleNameMap.pshe, title: roleNameMap.pshe },
        { id: roleNameMap.pastoral, title: roleNameMap.pastoral },
        { id: roleNameMap.mental_health, title: roleNameMap.mental_health },
        { id: roleNameMap.safeguarding_officer, title: roleNameMap.safeguarding_officer },
        { id: roleNameMap.deputy_head, title: roleNameMap.deputy_head },
        { id: roleNameMap.headteacher, title: roleNameMap.headteacher },
        { id: roleNameMap.head_of_year, title: roleNameMap.head_of_year },
        { id: roleNameMap.head_of_school, title: roleNameMap.head_of_school },
    ]
});

(async () => {
    const schools = await getFilledInSchools();
    await csvWriter.writeRecords(schools);
})();
