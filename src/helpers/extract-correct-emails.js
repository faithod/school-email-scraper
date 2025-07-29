const cheerio = require('cheerio');
const { roleRegexMap } = require("../../data/index");
const validator = require('validator');

const isTheRelevantDeputyHead = (context) => {
    const roleMatches = ["pastor", "safeguarding"];
    return roleMatches.some(role => context.toLowerCase().includes(role)) || context.includes("DSL");
}

const emailDomainRegex = /@[^\.]+/;
const deputyDSLRegex = /Deputy\s+(?:Designated\s+)?Safeguarding\s+Lead|\bDeputy\s+DSL\b/i // think of other ways this is written
const deputyCPORegex = /deputy\s+(?:designated\s+)?safeguarding\s+officer|deputy\s+(?:designated\s+)?child\s+protection\s+officer/i // (?:designated\s+)? conditionally matches designated


// extract all emails from a page & return only the correct emails
async function extractCorrectEmails(link, html, result, isPDF, occurances) {
    const { default: chalk } = await import('chalk'); // temp

    // for each email, go abit backwards by some characters (decision -- only looking behind the email)
    // use this snippet - if there is a role match - push it inn?

    if (!html) return result;

    // this is so we can find internal links in a page with the format: <a href="javascript:mt('kaltmann','williamellis.camden.sch.uk','','')">Karl Altmann</a> // not tested 
    let modifiedHtml = html.replace(/<a\s+href=["']javascript:mt\(\s*'([^']+)'\s*,\s*'([^']+)'\s*,\s*'[^']*'\s*,\s*'[^']*'\s*\)["']\s*>(.*?)<\/a>/gi, (_, user, domain, name) => {
            const email = `${user}@${domain}`;
            return `${name} <a href="mailto:${email}">${email}</a>`;
        })

    // for: <a href="mailto:lsproat@thomastallis.org.uk"> (mailto)
    modifiedHtml = modifiedHtml.replace(/<a\s+href=["']mailto:([^"']+)["'][^>]*>(.*?)<\/a>/gi, (_, emailHref, linkText) => {
        return `email:${emailHref}`;
    });

    // add spaces where there is <br> (e.g. HEADTEACHERMr)
    modifiedHtml = modifiedHtml.replace(/<br>/g, " ");

    modifiedHtml = modifiedHtml.replace(/(?<=>)[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-z]{2,}(?=<)/g, m => ` ${m} `); // added; (?<=>), (?=<)
    // add space on each side of email
    // to avoid getting this in allText: Miss B DaviesSafeguarding (DSL)020 8498 1338safeguarding@kshsonline.ukdocument.getElementById > email becomes: 1338safeguarding@kshsonline.ukdocument.get
    // html was: `<span id="eeb-480794-390645">safeguarding@kshsonline.uk</span><script type="text/javascript">document.getElementById("eeb-480794-390645").innerHTML = eval(decodeURIComponent("%27%73%61%66%65%67%75%61%72%64%69%6e%67%40%6b%73%68%73%6f%6e%6c%69%6e%65%2e%75%6b%27"))</script><noscript>*protected email*</noscript></a>`
    // does this break anything?...

    // mt >>
    // replace js formatted 'mailto' emails with actual emails
    // const allText = body.replace(/mt\(\s*'([^']+)'\s*,\s*'([^']+)'\s*,\s*'[^']*'\s*,\s*'[^']*'\s*\)/g, (match, user, domain) => {
    //     console.log("match", match)
    //     return `${user}@${domain}`;
    // });

    // can do -> if theres a parenthesis directly after -> capture what's inside

    const $ = cheerio.load(modifiedHtml);
    const allText = isPDF ? html : $('body').text();

    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-z]{2,}/g;
    const emailMatches = [...allText.matchAll(emailRegex)]

    if (!emailMatches?.length) return result;

    console.log("emails:", emailMatches.map(e => e[0]));

    for (const match of emailMatches) {
        const email = match[0];
        const emailIndex = match.index;
        if (emailIndex === undefined) continue;

        // log email occurances
        const emailDomain = email.match(emailDomainRegex)?.[0];
        occurances[emailDomain] = occurances[emailDomain] === undefined ? 0 : occurances[emailDomain] + 1;

        const whereToStart = allText.slice(0, emailIndex).length <= 115 ? 0 : emailIndex - 115 // change num <<<*
        const context = allText.slice(whereToStart, emailIndex);

        // console.log("Current Email:", email);
        // console.log("context:", `(${context})`);
        // improvent: only get context after email if....it has a match and theres no email infront of that match?? <<<

        // find matches within the context
        for (const [roleKey, regex] of Object.entries(roleRegexMap)) {
            const altMatch = (roleKey === "dsl" && (email.toLowerCase().includes("safeguarding") || email.toLowerCase().startsWith("dsl@"))) || (roleKey === "pshe" && email.toLowerCase().includes(roleKey)) || (roleKey === "headteacher" && email.toLowerCase().match(/office@|admin|head/i) && !email.includes(".gov.uk") && result[roleKey]?.length === 0) || (roleKey === "safeguarding_officer" && email.toLowerCase().match(/childprotection@/i)) // is that accurate for headteachers...? 
            // remove dsl email if it includes the word 'govenor'?

            if (regex.test(context) || altMatch) {
                console.log("A match!");
                console.log("Current Email:", email);
                console.log("role:", roleKey);
                console.log("context with matches:", `(${context})`);
                console.log("match is from url:", link)

                // logic for matching 'DSL':
                // ADDD TO altMatch =>>>>>>>>>  || /DSL/.test(context)) 
                // uppercase so make sure we dont match random 'dsl' letters in words
                //     const regexToUse = role === "dsl" && !regex.test(context) ? otherRegex : regex


                if (roleKey === "deputy_head") {
                    if (!isTheRelevantDeputyHead(context)){
                        console.log("ignoreee")
                        continue;
                    }
                }
              

                //
                // make sure we arnt getting the wrong emails....?
                let push = true;


                const emailsWithinTheContext = [...context.matchAll(emailRegex)]
                if (emailsWithinTheContext.length) {
                    // console.log("actual email index", emailIndex);


                    // console.log("emailsWithinTheContext", emailsWithinTheContext.map(e => e[0]));

                    for (const match of emailsWithinTheContext) {
                        const matchedEmail = match[0];
                        // const index = match.index;
                        const matchedEmailIndex = emailMatches.find(m => m[0] === matchedEmail)?.index

                        if (matchedEmail !== email && matchedEmailIndex < emailIndex) {
                            const start = matchedEmailIndex + matchedEmail.length;
                            const relevantContext = allText.slice(start, emailIndex);

                            // console.log("emails within the context! >", emailsWithinTheContext.map(m => `${m[0]} - index: ${matchedEmailIndex}`));
                            // console.log("relevantContext", relevantContext);


                            /* ahh so is this turning: [random-texttt email@domain.com text-we're-looking-for email@domain.com]
                                into:  [email@domain.com text-we're-looking-for email@domain.com] (basically the text between emails...) 
                            */

                            if (!regex.test(relevantContext)) push = false;
                            if (altMatch) push = true;

                            // remember deputy head must include 'pastoral' etc.
                            if (roleKey === "deputy_head" && regex.test(relevantContext)) {
                                if (!isTheRelevantDeputyHead(relevantContext)) {
                                    push = false;
                                }
                            }
                        }
                    }
                }
                //

                /* edge case: wrong match purely due to the match being too close to a random email: */
                const actualRoleMatchIndex = context.match(regex)?.index;
                const newContextStart = context.match(/(?<=\bfor\b)(.*?)(?=\bcontact\b)|\bSENCo\b|\bdirector\s+of\b|\bchair\s+of\b/i); // KEEP ADDING TO THIS // matches: `for .... contact` - also other roles (that ill keep adding)
                // could this match twice?

                // basically if another role is in front, dont push

                if (newContextStart && actualRoleMatchIndex && (newContextStart.index > actualRoleMatchIndex)) {
                    push = false;
                    console.log(chalk.yellow("edge case: dont push in"))
                }
                /* */

                // 1 of the ways im tackling invalid emails from a pdf
                if (!validator.isEmail(email)) {
                    push = false;
                    console.log(chalk.red("invalid email!!"), email)
                }

                let emailToPush = email;

                const deputyDSLMatch = context.match(deputyDSLRegex);
                const deputyCPOMatch = context.match(deputyCPORegex);


                //
                // make sure there isnt another match with a higher index...
                for (const [key, otherRegex] of Object.entries(roleRegexMap)) {
                    // if there is another match in the context...
                    if (key !== roleKey && otherRegex.test(context)) {
                        const actualRoleMatch = context.match(regex); // should this be index in line?
                        const otherMatch = context.match(otherRegex); 

                        // check this when less tired // is this needed since its already true..?
                        // if (!actualRoleMatch && altMatch) {
                        //     push = true;
                        // }  // JUST COMMENTED OUT ^^^^...should i?

                        console.log("actualRoleMatch", actualRoleMatch);
                        console.log("otherMatch", otherMatch);


                        if (actualRoleMatch) {

                            // could this go wrong? // test...
                            // this is extra tbh...
                            if (roleKey === "dsl" && deputyDSLMatch && otherMatch.index < deputyDSLMatch.index) {
                                emailToPush = `${emailToPush} - (Deputy)`
                            }


                            // if the other match is greater/closer to the email, dont match??
                            if (otherMatch.index > actualRoleMatch.index) {
                            

                                /* looking at what exactly is between these matches */
                                const [startIdx, endIdx] = [actualRoleMatch.index + actualRoleMatch[0]?.length, otherMatch.index - 1]
                                const numOfCharsBetweenMatches = endIdx - startIdx;
                                const contextBetweenMatches = context.slice(startIdx, endIdx)
                                console.log("numOfCharsBetweenMatches", numOfCharsBetweenMatches);
                                console.log("whats between:", contextBetweenMatches);

                                const priority = ["dsl", "pastoral"];

                                if (numOfCharsBetweenMatches <= 4 & ["-", "&"].some(char => contextBetweenMatches.includes(char))) {
                                    /* 
                                        gonna be more specific so we don't break anything:
                                        so, the 2 things that can relate are => (DSL/Pastoral Lead) & deputy headteacher
                                        so if the current match is dsl/pastoral & the other match is deputy (& all these conditions are true) -> push it in!

                                        e.g. Designated Safeguarding Lead - Deputy Headteacher
                                     */
                                    if (priority.includes(roleKey) && key === "deputy_head") {
                                        console.log("still push in");
                                        continue; 
                                        // pushing for priority roles
                                        // not pushing for deputy_head but instead for priority, this works as it should right?
                                    }

                                }
                                /* */

                                push = false
                                console.log("don't push");
                                // fixes the wrong match in school 6
                            }

    
                        }
                        
                    }
                }
                //

                // i need to extensively check other matches in context (to make sure we're not matching wrong)...
                // this made sure a wrong headteacher email didnt slip through... (example is in index.js)
                if (!["dsl", "safeguarding_officer", "deputy_head"].includes(roleKey) && /\bDSL\b/.test(context)) push = false;


                // hmm we could also check for full stops..
                // const actualContext = context.match(/\./i)
                // const fullStop = context.match(/\./i) // if theres a full stop, cut whats before it?????  <<< consider it
                // .match(/(?<!\.)\.(?!\.)/)



                // don't save dupe values
                // also dont have the same email in 2 places?
                for (const resultKey in result) {
                    const emailArray = result[resultKey];

                    // make sure the added text doesnt affect identifying dupes
                    for (const e of emailArray) {
                        const indexBeforeRole = emailToPush.indexOf("- ");
                        const actualEmail = emailToPush.slice(0, indexBeforeRole)?.toLowerCase();
                        if (e.toLowerCase().startsWith(actualEmail)) {
                            push = false;
                        }
                    }
                    
                    if (emailArray.includes(emailToPush)) {
                        push = false;
                    }
                }
       


                if (roleKey === "headteacher") { 
                    // forget this for now... // need to fine tune it... // extra stufff
                    // if (context.toLowerCase().includes("headteacher's pa") || context.toLowerCase().includes("headteacher pa") || context.includes("PA")) { 'PA to the Headteacher'
                    //     emailToPush = `${emailToPush} - (PA)`
                    // }

                    // so, only allow 2 headteacher emails????

                    // removing PA emails for now...
                    if (context.match(/\bPA\b/)) {
                        push = false;
                    }

                    // headteacher(followed by 's) should no longer be matched! it's the best decision for now, for accuracy
                }

                if (roleKey === "mental_health") {
                    emailToPush = `${emailToPush} - (${context.match(regex)?.[0]})`
                }

                // add 'deputy' to make it distinct
                if (!emailToPush.includes("- (Deputy)") && roleKey === "dsl" && context.match(regex)?.length === 1 && deputyDSLMatch && !altMatch) {
                    emailToPush = `${emailToPush} - (Deputy)`
                }

                if (!emailToPush.includes("- (Deputy)") && roleKey === "safeguarding_officer" && deputyCPOMatch) {
                    emailToPush = `${emailToPush} - (Deputy)`
                }

                // improvement: >>>>>>>> (this shouldnt be matched now I think..)
                    ` Pastoral: pastoral@oaklandsschool.com

                    Premises: premises@oaklandsschool.com` // >> premises@oaklandsschool.com was matched for pastoral
                // suggestion: if theres an email after the match -> forget everything after it...
                // make a clear list & notes with these edge cases ^^ (inside the function)
                /// ^^^^^^^^^

                if (emailToPush.includes(" - (Deputy)") && result[roleKey]?.length > 2) push = false; // or > 3?
                if (result[roleKey]?.length >= 3) push = false; // in all cases, if theres more than 3, dont push?

                // stop random domains passing through... TEST WITH & WITHOUT THIS
                if (Object.keys(occurances).length > 1) {
                    const emailOccurances = occurances[emailDomain];

                    for (const domainKey in occurances) {
                        const num = occurances[domainKey];
                        if (num > emailOccurances) {
                            push = false;
                        }
                    }
                }

                if (!result[roleKey].includes(emailToPush) && push) {
                    result[roleKey].push(emailToPush);
                }             
            }
        }
    }
    
  return result;
}

module.exports = { extractCorrectEmails, isTheRelevantDeputyHead, emailDomainRegex, deputyCPORegex };
