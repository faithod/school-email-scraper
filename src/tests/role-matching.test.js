const { describe, expect, test } = require('@jest/globals');
const { roleRegexMap } = require("../../data/index");

const validRoleMap = {
  dsl: ["Designated Safeguarding Lead", "Safeguarding Lead", "designated safeguarding lead", "safeguarding lead"], // "DSL", "    DSL   "

/* extend later */
//   pshe: /pshe lead|pshe teacher|personal, social/i,
//   pastoral: /head of pastoral care|pastoral lead|pastoral care|pastoral/i,
//   mental_health: /mental health lead|school counsellor|wellbeing lead|counsellor|Counselling/i,
//   safeguarding_officer: /safeguarding officer|child protection officer/i,
//   deputy_head: /deputy headteacher|assistant headteacher/i,
//   headteacher: /(?<!deputy\s|assistant\s)headteacher|principal/i,
//   head_of_year: /\bHead of Year\b(?!\s*(\d|or\b))/i,
//   head_of_school: /head of school/i
};

// random strings, valid/invalidStrings
const invalidRoleMap = {
  dsl: ["heydsl", "HEYDSL", "DSLO"]
};


describe('make sure roleRegexMap is actually matching the correct roles', () => {
    
    test("matches the correct roles in a string", () => {
        for (const role in roleRegexMap) {
            const regex = roleRegexMap[role];
            
            if (validRoleMap[role]) { // delete later
                const validRoleStrings = validRoleMap[role];
                
                for (const str of validRoleStrings) {
                    try {
                        expect(regex.test(str)).toBe(true);
                    } catch (err) {
                        console.error(`❌ Failed for role "${role}" with string: "${str}"`);
                        throw err; // re-throw so the test still fails
                    }
                }
            }
        }
    });

    test("doesn't match when a role isn't present in a string", () => {
        for (const role in roleRegexMap) {
            const regex = roleRegexMap[role];
            
            if (invalidRoleMap[role]) {
                const invalidStrings = invalidRoleMap[role];
                
                for (const str of invalidStrings) {
                    try {
                        expect(regex.test(str)).toBe(false);
                    } catch (err) {
                        console.error(`‼️ string: "${str}" was wrongly matched for role: "${role}"`);
                        throw err;
                    }
                }
            }
        }
    });
});

// also make tests for every regex I used...