const cheerio = require('cheerio');
const { roleRegexMap } = require("../../data/index");
const validator = require('validator');

const isTheRelevantDeputyHead = (context) => {
    const roleMatches = ["pastor", "safeguarding", "child protection"]; // randomly added 'child protection'????
    return roleMatches.some(role => context.toLowerCase().includes(role)) || context.includes("DSL");
}

const emailDomainRegex = /@[a-zA-Z0-9.-]+\.[a-z]{2,}/; // change to match the whole end, another way to tackle malkformed emails from pdfs..
const deputyDSLRegex = /Deputy\s+(?:Designated\s+)?Safeguarding\s+Lead|\bDeputy\s+DSL\b/i // think of other ways this is written
const deputyCPORegex = /deputy\s+(?:designated\s+)?safeguarding\s+officer|deputy\s+(?:designated\s+)?child\s+protection\s+officer/i // (?:designated\s+)? conditionally matches designated

// temp workaround😭
const invalid = ['acresswell@summerhill.dudley.sch.uk', "cholden@summerhill.dudley.sch.uk", "info@beck.uk.com", "safeguardinggovernor@hampsteadschool.org.uk", "Oamei@thomastallis.org.uk", "Gamei@thomastallis.org.uk"]

// get latest match in a context, incase it appears twice in 1 place
const getLatestMatch = (context, regex, pattern = "gi") => {
    let currentMatch = context.match(regex); 

    if (currentMatch) {
        const globalRegex = new RegExp(regex, pattern);
        const allMatches = [...context.matchAll(globalRegex)];

        for (const match of allMatches) {
            if (match?.index > currentMatch.index) currentMatch = match;
        }
    }

    return currentMatch;
}

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

    // modifiedHtml = modifiedHtml.replace(/mailto:/g, m => `${m} `); // was getting `7MsLauraHall3348l.hall@bremer.waltham.sch.uk` instead of `l.hall@bremer.waltham.sch.uk` in pdfs
    // ^ fix aint working

    // if (link == "https://bremer.org.uk/wp-content/uploads/2023/07/Parent-Handbook.pdf") console.log(chalk.yellow(">>>"), modifiedHtml);

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
    const emailMatches = [...allText.matchAll(emailRegex)].filter(email => !email[0]?.includes(".wixpress.") && !email.includes("recruitment@")); // remov wix emails // like: 2062d0a4929b45348643784b5cb39c36@sentry.wixpress.com

    if (!emailMatches?.length) return result;

    console.log("emails:", emailMatches.map(e => e[0]));

    for (const match of emailMatches) {
        const email = match[0];
        const emailIndex = match.index;
        if (emailIndex === undefined) continue;

        // log email occurances
        const emailDomain = email.match(emailDomainRegex)?.[0];
        occurances[emailDomain] = occurances[emailDomain] === undefined ? 0 : occurances[emailDomain] + 1;

        const whereToStart = allText.slice(0, emailIndex).length <= 116 ? 0 : emailIndex - 116 // change num <<<*
        const context = allText.slice(whereToStart, emailIndex);

        // console.log("Current Email:", email);
        // improvent: only get context after email if....it has a match and theres no email infront of that match?? <<<

        // find matches within the context
        for (const [roleKey, regex] of Object.entries(roleRegexMap)) {
            const altMatch = (roleKey === "dsl" && (email.toLowerCase().includes("safeguarding") || email.toLowerCase().startsWith("dsl@"))) || (roleKey === "pshe" && email.toLowerCase().includes(roleKey)) || (roleKey === "headteacher" && email.toLowerCase().match(/office@|admin|head@|headmaster@/i) && !email.includes(".gov.uk") && result[roleKey]?.length === 0) || (roleKey === "safeguarding_officer" && email.toLowerCase().match(/childprotection@/i)) || (roleKey === "pastoral" && email.toLowerCase().match(/\bpastoral@/i))// is that accurate for headteachers...?  // |\benquiry@|\benquiries@/
            // remove dsl email if it includes the word 'govenor'?

            if (regex.test(context) || altMatch) {
                console.log("A match!");
                console.log("Current Email:", email);
                console.log("role:", roleKey);
                console.log("context with matches:", `(${context})`); // .replace(/\s*/g, "")
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

                            if (!regex.test(relevantContext)) {
                                push = false;
                                console.log("dont-push-a");
                            }
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

                // 
                // actual role match:
                const actualRoleMatch = getLatestMatch(context, regex);
                    /* it may match twice in 1 place
                        e.g. `nt Head Teacher 
                            email:lbeavan@cardinalwiseman.net
                            Rob 
                            Swanwick
                            Deputy DSL 
                            Head Teacher 
                            email:`
                    *
                //


                /* edge case: wrong match purely due to the match being too close to a random email: */
                const newContextRegex = /(?<=\bfor\b)(.*?)(?=\bcontact\b)|\bSENCo\b|\bdirector\s+of\b|\bchair\s+of\b|\bgovernor\b|\bAttendance\s+Officer\b|\balternatively\b|(?<!Ms|Mrs|Mr)\.\s+/i; // KEEP ADDING TO THIS // matches: `for .... contact` - also other roles (that ill keep adding)
                const newContextRegex2 = /\bSEND|\u2022|\x2A/;
                const newContextRegex3 = /\s+or\s+/; // ' or ' could be directly after...

                // dont skip when its >> ':' plus the match after???<<<<

                const newContextMatch = getLatestMatch(context, newContextRegex);
                const newContextMatch2 = getLatestMatch(context, newContextRegex2, "g");
                const newContextMatch3 = getLatestMatch(context, newContextRegex3);


                /*  new content may match twice in 1 place?
                    e.g.
                    `chair of ... safegaurding officer SEND`
                */




                // basically if another role is in front, dont push
                if ((newContextMatch || newContextMatch2 || newContextMatch3) && actualRoleMatch) {
                    console.log(chalk.yellow("actualRoleMatch index:"), actualRoleMatch?.index);
                    console.log(chalk.yellow("newContextMatch:"), newContextMatch || newContextMatch2 || newContextMatch3);

                    const newContextIndexes = [newContextMatch?.index || -1, newContextMatch2?.index || -1, newContextMatch3?.index || -1]
                    const newContextIdx = Math.max(...newContextIndexes);
                    const newContextIsCloserToEmail = newContextIdx > actualRoleMatch.index;
                    const charsInbetween = newContextIdx - actualRoleMatch.index;

                    if (newContextIsCloserToEmail && (charsInbetween > 2 || newContextMatch3)) { // make sure they acc arnt both together
                        push = false;
                        console.log(chalk.yellow("edge case: dont push in"))
                    }
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
                        const otherMatch = getLatestMatch(context, otherRegex); 
                        /* incase it matches twice in 1 place
                           e.g. `headteacher mental health lead headteacher` (made up)
                        */

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

                                if (numOfCharsBetweenMatches <= 4 & ["-", "&"].some(char => contextBetweenMatches.includes(char))) { // also ' and ' // also '/'
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

                                // sometimes theres just a linebreak between them...
                                /* e.g.
                                    Deputy DSL
                                    Head Teacher 
                                */
                                // if (numOfCharsBetweenMatches <= 2) {
                                //     continue;
                                // }

                                push = false;
                                console.log("don't push");
                                // fixes the wrong match in school 6
                            }

    
                        }
                        
                    }
                }
                //

                // i need to extensively check other matches in context (to make sure we're not matching wrong)...
                // this made sure a wrong headteacher email didnt slip through... (example is in index.js)
                if (!["dsl", "safeguarding_officer", "deputy_head"].includes(roleKey) && /\bDSL\b/.test(context.slice(actualRoleMatch?.index || 0))) {
                    push = false;
                    console.log("dont-push-b");
                }


                // hmm we could also check for full stops..
                // const actualContext = context.match(/\./i)
                // const fullStop = context.match(/\./i) // if theres a full stop, cut whats before it?????  <<< consider it
                // .match(/(?<!\.)\.(?!\.)/)


                let emailsFound = 0;

                // don't save dupe values
                // also dont have the same email in 2 places?
                for (const resultKey in result) {
                    const emailArray = result[resultKey];
                    emailsFound += emailArray.length;

                    // make sure the added text doesnt affect identifying dupes
                    for (const e of emailArray) {
                        const indexBeforeRole = emailToPush.indexOf("- ");
                        const actualEmail = emailToPush.slice(0, indexBeforeRole)?.toLowerCase();
                        if (e.toLowerCase().startsWith(actualEmail)) {
                            push = false;
                            console.log("dont-push-c");
                        }
                    }
                    
                    if (emailArray.includes(emailToPush)) {
                        push = false;
                        console.log("dont-push-d");
                    }

                    // only push enquiry/enquiries email if nothing is found
                }





                // if (roleKey === "headteacher" && emailsFound !== 0 && email.startsWith("enquir") && !regex.test(context)) push = false;

                // if (email.startsWith("enquiry")) {
                //     console.log("ENQUIRYY");
                //     console.log("context", context);
                //     console.log("emailsFound", emailsFound);
                //     console.log("startsWith", email.startsWith("enquir"));

                // }
                // enquiry@stpaulgl.bham.sch.uk


                if (roleKey === "headteacher") { 
                    // forget this for now... // need to fine tune it... // extra stufff
                    // if (context.toLowerCase().includes("headteacher's pa") || context.toLowerCase().includes("headteacher pa") || context.includes("PA")) { 'PA to the Headteacher'
                    //     emailToPush = `${emailToPush} - (PA)`
                    // }

                    // so, only allow 2 headteacher emails????
                   
                    // removing PA emails for now...
                    if (context.match(/\bPA\b/)) {
                        push = false;
                        console.log("dont-push-e");
                    }

                    // headteacher(followed by 's) should no longer be matched! it's the best decision for now, for accuracy
                }

                if (roleKey === "dsl" && emailToPush.includes("enquir")) { 
                    push = false;
                }

                if (roleKey === "mental_health") {
                    emailToPush = `${emailToPush} - (${actualRoleMatch?.[0]})`
                }

                // const regexWithGlobalPattern = new RegExp(regex, "gi");

                // add 'deputy' to make it distinct
                if (!emailToPush.includes("- (Deputy)") && roleKey === "dsl" && deputyDSLMatch && !altMatch) { // remove: && context.match(regexWithGlobalPattern)?.length === 1  ??
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
                if (roleKey === "headteacher" && result[roleKey]?.length >= 2) push = false; // headteacher can be matched a lot...


                // if theres absolutely nothing & email is enquiry@ -> push in..

                // stop random domains passing through... TEST WITH & WITHOUT THIS
                if (Object.keys(occurances).length > 1) {
                    const emailOccurances = occurances[emailDomain];

                    for (const domainKey in occurances) {
                        const num = occurances[domainKey];
                        if (num > emailOccurances) {
                            push = false;
                            console.log("dont-push-f");
                        }
                    }
                }

                // something to add: if its in deputy head or headteacher, but a match is found for
                // the same email but for a higher priority role, swap it...
                // >>>> 
                // err idk, i still need to consider 'push'
                // const lowerPriorityRoles = ["deputy_head", "headteacher"];
                // const emailIsInLowerPriority = lowerPriorityRoles.some(role => result[role].includes(emailToPush));

                // if (!lowerPriorityRoles.includes(roleKey) && emailIsInLowerPriority) {
                //     console.log(chalk.blue("switcheroo"));
                //     for (const role of lowerPriorityRoles) {
                //         result[role] = result[role].filter(email => email !== emailToPush);
                //     }
                //     if (!result[roleKey].includes(emailToPush)) result[roleKey].push(emailToPush);
                // }
                // parking for now bc tired

                if (!result[roleKey].includes(emailToPush) && push && !invalid.includes(emailToPush) && !emailToPush.includes("SENC") && !emailToPush.includes("SEND")) {
                    // push in
                    result[roleKey].push(emailToPush);
                }             
            }
        }
    }
    
  return result;
}

module.exports = { extractCorrectEmails, isTheRelevantDeputyHead, emailDomainRegex, deputyCPORegex };

// add wholeee of the end of emailll...