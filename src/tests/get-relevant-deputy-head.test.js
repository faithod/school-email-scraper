const { isTheRelevantDeputyHead } = require('../helpers/extract-correct-emails'); 

const correctStrings = ["Deputy Head Teacher Pastoral Care and Inclusion", "Assistant Head Teacher Pastoral"];
const incorrectStrings = ["Deputy Head Teacher Key Stage 3", "Assistant Head Teacher Raising Standards"];

describe('make sure string includes certian key words for a deputy_head match', () => {
    test("matches the correct key words in a string", () => {
        for (const string of correctStrings) {
            try {
                expect(isTheRelevantDeputyHead(string)).toBe(true);
            } catch (err) {
                console.error(`❌ Failed for string: "${string}", err: ${err?.message}`);
                throw err;
            }
        }
    });

    test("should return false if key words arnt in string", () => {
        for (const string of incorrectStrings) {
            try {
                expect(isTheRelevantDeputyHead(string)).toBe(false);
            } catch (err) {
                console.error(`❌ Failed for string: "${string}", err: ${err?.message}`);
                throw err;
            }
        }
    });
});