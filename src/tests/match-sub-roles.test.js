const { deputyCPORegex } = require('../helpers/extract-correct-emails'); 


// come back to the commented out bits

// const deputyDSL = [
// ];

// Deputy Designated Safeguarding Lead, Deputy Safeguarding Lead, Deputy DSL `Deputy\nDesignated\nSafeguarding\nLead` `Deputy \n Designated \n Safeguarding\nLead`

// const invalidDeputyDSL = [
// ];

const deputyCPO = ["Deputy Designated Child Protection Officer", "Deputy Child Protection Officer", "Deputy \nDesignated\n Child Protection Officer",
    "deputy safeguarding \nofficer"
]

// const invalidDeputyCPO = [
//     " Child Protection Officer"
// ]

// match subroles
describe('match sub roles', () => {
    test("should match correctly", () => {
        for (const i in deputyCPO) {
            const str = deputyCPO[i];
            
            try {
                expect(deputyCPORegex.test(str)).toBe(true);
            } catch (err) {
                console.error(`❌ Failed to match sub role (DPCO) for "${str}"`);
                throw err;
            }
        }
    });

    // test("shouldn't match these strings", () => {
    // });
});