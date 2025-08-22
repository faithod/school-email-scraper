const { roleRegexMap } = require("../../data/index");


/* TODO: 
  - extend these further? (making the role-matching test more extensive ==> THE MOST IMPORTANT FOR ACCURACY!)
  - make tests for all regex thoughout app
*/

const validRoleMap = {
  dsl: [
    "Designated Safeguarding Lead", "Safeguarding Lead", "designated safeguarding lead", "safeguarding lead", "lead  for  safeguarding", "Safeguarding Team",
    "Deputy  DSL", "Lead DSL", "dsl team",
    // new lines:
    "designated \nsafeguarding \nlead", "designated\nsafeguarding\nlead"
  ],
  pshe: ["pshe lead", "pshe teacher", "pshce lead", "pshre lead", "personal, social", "personal social health", "lead for PSHE", "lead for PSHRE", "lead for PSHCE"],
  pastoral: ["head of  pastoral care", "pastoral lead", "Pastoral Support Officer" ,"Pastoral Team", "PASTORAL MANAGER", "For enquiries  related to pastoral care:", "Pastoral Support Officer", "Pastoral Care Officer",
    "Pastoral & inclusion Manager", "pastoral & wellbeing manager", "For issues related to pastoral care"
  ],
  mental_health: ["mental health lead", "school  counsellor", "wellbeing lead", "counsellor", "wellbeing mentor"],
  safeguarding_officer: ["safeguarding officer", "child protection officer", "DCPO", "CPO", "safeguarding   officer", "child   protection   officer", "SAFEGUARDING OFFICERS", "Lead Person for Child Protection"],
  deputy_head: ["deputy headteacher", "assistant headteacher", "Assistant Head Teacher", "Deputy Head Teacher", "assistant head", "deputy head"],
  headteacher: ["Headteacher", "headteacher", "Principal", "principal", "principal name@koinoniafederation.com", "headteacher name@koinoniafederation.com", " headteacher name@koinoniafederation.com", "co-principals", "co-headteachers", "co-principal name@koinoniafederation.com", "co-headteacher", "head teacher",
    "Assistant word Headteacher", "or Ms Emma Hillman (Head \nteacher) o", "or Ms Emma Hillman (Head\n teacher) o",
    "head master", "headmaster", "Head/Head Teacher", "Headmaster’s Office", "executive headteacher"
  ],
  head_of_year: ["Head of Year", "(Head of Year)", "Head of Year  ", "Head of Year:"],
  head_of_school: ["head of school", "head of school:"]
};

// first 2 need extending
const invalidRoleMap = {
  dsl: ["DSL", "heydsl", "HEYDSL", "DSLO", "Deputy  DSLi", "deputy", "designatedsafeguardinglead", "Pastoral ok Manager"],
  pastoral: ["pastoral care", "pastoral career", "pshelead", "PSHCE"],
  safeguarding_officer: ["safeguarding", "DCPOw", "wDCPO", "CPOw", "safeguarding Lead Person for Child Protection", "protection officer", "Child Protection"],
  deputy_head: ["executive headteacher",  "head teacher", "headteacher",
    // bc of malformed pdfs:
    "DeputyHeadteacher"
  ],
  headteacher: ["Assistant Headteacher", "Headteachers", "Headteachers ", "principals name@koinoniafederation.com", "Assistant\nHeadteacher", "Assistant \nHeadteacher", "Deputy \nHeadteacher", "Headteacher's", "Head Teacher's",
    "Assistant Headmaster", "Deputy Headmaster", "Assistant Head master", "Assistant\nHeadmaster",
    "DeputyHeadteacher", "Teacher", "eputy headteacher", "sistant headteacher", // don't match when theres no spaces...
    "headteacher'", "headteacher's", "Assistant Principal", "Deputy Principal", "Vice Principal", "about the headteacher", // shouldnt match: "Vice Principal- "
    "Asst Headteacher", "ssociate Headteacher", "Headteacher's PA"
  ],
  head_of_year: ["Head of Year 9", "Head of Year11"],
  head_of_school: ["head of schools", "xhead of school"]

};

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
      email:`.matchAll(/regex/gi)]*/
});
