const { roleRegexMap } = require("../../data/index");

const validRoleMap = {
  dsl: ["Designated Safeguarding Lead", "Safeguarding Lead", "designated safeguarding lead", "safeguarding lead", "lead  for  safeguarding",
    // new lines:
    "designated \nsafeguarding \nlead", "designated\nsafeguarding\nlead", "Safeguarding Team", 
  ], // "DSL", "    DSL   "

/* extend later */
  pshe: ["pshe lead", "pshe teacher","pshce lead","pshre lead", "personal, social", "lead for PSHE", "lead for PSHRE", "lead for PSHCE"],
  pastoral: ["head of pastoral care", "pastoral lead", "Pastoral Support Officer" ,"Pastoral Team", "PASTORAL MANAGER"],
//   mental_health: /mental health lead|school counsellor|wellbeing lead|counsellor|Counselling/i,
  safeguarding_officer: ["safeguarding officer", "child protection officer", "DCPO", "CPO", "safeguarding   officer", "child   protection   officer", "SAFEGUARDING OFFICERS", "Lead Person for Child Protection"],
  deputy_head: ["deputy headteacher", "assistant headteacher", "Assistant Head Teacher", "Deputy Head Teacher", "assistant head"],
  headteacher: ["Headteacher", "headteacher", "Principal", "principal", "principal name@koinoniafederation.com", "headteacher name@koinoniafederation.com", " headteacher name@koinoniafederation.com", "co-principals", "co-headteachers", "co-principal name@koinoniafederation.com", "co-headteacher", "head teacher",
    "Assistant word Headteacher", "or Ms Emma Hillman (Head \nteacher) o", "or Ms Emma Hillman (Head\n teacher) o",
    "head master", "headmaster", "Head/Head Teacher", "Headmaster’s Office"
  ],
  head_of_year: ["Head of Year", "(Head of Year)"]
//   head_of_school: /head of school/i
};

// random strings, valid/invalidStrings
const invalidRoleMap = {
  dsl: ["heydsl", "HEYDSL", "DSLO"],
  safeguarding_officer: ["safeguarding", "DCPOw", "wDCPO", "CPOw", "safeguarding Lead Person for Child Protection"],
  deputy_head: ["executive headteacher", 
    // bc of malformed pdfs...
    "DeputyHeadteacher"
  ],
  headteacher: ["Assistant Headteacher", "Headteachers", "Headteachers ", "principals name@koinoniafederation.com", "Assistant\nHeadteacher", "Assistant \nHeadteacher", "Headteacher's", "Head Teacher's",
    "Assistant Headmaster", "Deputy Headmaster", "Assistant Head master", "Assistant\nHeadmaster",
    "DeputyHeadteacher", "Teacher", "eputy headteacher", "sistant headteacher", //dont match when theres no spaces...
    "headteacher'", "headteacher's"
  ],
  head_of_year: ["Head of Year 9"]
};

    // `Assistant
    // Headteacher`, // next 1 has space after....
    // `Deputy 
    // Headteacher` // failing for these for some reason... just use caracters like \n in test?

// a decision: not matching 'headteacher/principleS' but matching 'co-headteacher/principle(s)' 

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


    // // test using 'match' - l8rs
    //     test("make sure 'match' has the expected output", () => {
    //     for (const role in roleRegexMap) {
    //         const regex = roleRegexMap[role];
            
    //         if (validRoleMap[role] && role === "headteacher") {
   
                
    //         }
    //     }
    // });

    /* should give array w 2 elements:
    
    [...`nt Head Teacher 
      email:lbeavan@cardinalwiseman.net
      Rob 
      Swanwick 
      Deputy DSL
      Head Teacher 
      email:`.matchAll(/(?<!deputy\s*|assistant\s*)(head\s*teacher|head\s*master)(?!['’]s)\b|(?<![-\w])principal\b|co-(principal|headteacher)s?/gi)]*/

});

// also make tests for every regex I used...