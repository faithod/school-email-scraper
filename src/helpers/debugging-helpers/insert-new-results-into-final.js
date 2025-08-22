const fs = require('fs');
const csv = require("csv-parser");
const { roleNameMap } = require("../../../../data/index");
const createCsvWriter = require('csv-writer').createObjectCsvWriter;


/**
 * seems to work - takes the file of new results for the empty schools & inserts them into the final file
 */
async function outputNewFinal() {
    return new Promise((resolve, reject) => {
        const newlyFilledSchools = [];
        const finalSchools = [];

        fs.createReadStream("") // add newest file you have just created e.g. rerun_of_empty_schools/empty_schools_new_results etc. // newest so far which I havent gone through: RERUN2
            .pipe(csv())
            .on('data', (row) => {
                newlyFilledSchools.push(row);
            })
            .on('end', () => {}) 
            .on('error', () => {});

        fs.createReadStream("final.csv") // 
            .pipe(csv())
            .on('data', (row) => {
                const matchedSchool = newlyFilledSchools.find(school => school.Website === row.Website && school['School Name'] === row['School Name']);
                finalSchools.push(matchedSchool ? { ...row, 
                    [roleNameMap.dsl]: matchedSchool[roleNameMap.dsl],
                    [roleNameMap.pshe]: matchedSchool[roleNameMap.pshe],
                    [roleNameMap.pastoral]: matchedSchool[roleNameMap.pastoral],
                    [roleNameMap.mental_health]: matchedSchool[roleNameMap.mental_health],
                    [roleNameMap.safeguarding_officer]: matchedSchool[roleNameMap.safeguarding_officer],
                    [roleNameMap.deputy_head]: matchedSchool[roleNameMap.deputy_head],
                    [roleNameMap.headteacher]: matchedSchool[roleNameMap.headteacher],
                    [roleNameMap.head_of_year]: matchedSchool[roleNameMap.head_of_year],
                    [roleNameMap.head_of_school]: matchedSchool[roleNameMap.head_of_school],
                } : row) 
            })
            .on('end', () => resolve(finalSchools))
            .on('error', reject);
    });
}

const csvWriter = createCsvWriter({
    path: "final_with_filled_in.csv", //
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
    const schools = await outputNewFinal();
    await csvWriter.writeRecords(schools);
})();
