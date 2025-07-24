const { describe, expect, test } = require('@jest/globals');
const { emailRegex, emailDomainRegex } = require('../helpers/extract-correct-emails'); 

// skip for now >
// match actual emails
// const validEmails = [
//     "admin@thomastallis.org.uk", "fkamei@thomastallis.org.uk", "valid-email@thomastallis.com", "valid_email@thomastallis.com",
//     ":valid-email@thomastallis.com"
// ]

// describe.skip('make sure only valid emails are matched', () => {
    
//     test("matches the correct emails in a string", () => {
//     });

//     test("doesn't match when the email is invalid", () => {
//     });
// });



// match email domain
const emails = [
    'postbox@beaconhigh.org', 'adam.harris@beaconhigh.org', 'tierney.gilbert@beaconhigh.org', 'advice@beaconhigh.org', 'ask@beaconhigh.org',
    'jo@samaritans.org', 'grieftalk@griefencounter.org.uk', 
    'random-email@griefencounter.org.uk', 'random_email@griefencounter.org.uk', 'random.email3@griefencounter.org.uk'
];

const emailDomains = [
    '@beaconhigh', '@beaconhigh', '@beaconhigh', '@beaconhigh', '@beaconhigh',
    '@samaritans', '@griefencounter', 
    '@griefencounter', '@griefencounter', '@griefencounter'
]

describe('make sure to only match the email domain', () => {
    test("should match correctly", () => {
        for (const i in emails) {
            const email = emails[i];
            const domain = emailDomains[i];
            const match = email.match(emailDomainRegex)?.[0];
            
            try {
                expect(match).toBe(domain);
            } catch (err) {
                console.error(`❌ Failed get domain from email "${email}", match found: "${match}"`);
                throw err;
            }
        }
    });

    // test("shouldn't match these strings", () => {
    // });
});