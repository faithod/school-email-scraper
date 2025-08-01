// ohh they show based on priority...
const roleRegexMap = {
  dsl: /designated\s+safeguarding\s+lead|safeguarding\s+lead|\bDeputy\s+DSL\b|lead\s+for\s+safeguarding\b|\bSafeguarding\s+Team\b|\bLead\s+DSL\b/i,
  pshe: /pshr?c?e\s+(lead|teacher|coordinator)|personal,\s+social|personal\s+social\s+health|lead\s+for\s+P?SHR?C?E/i, //psce
  pastoral: /head\s+of\s+pastoral\s+care|pastoral\s+lead\b|Pastoral\s+Support\s+Officer|Pastoral\s+Team\b|PASTORAL\s+MANAGER/i, // removing for now: pastoral care|pastoral (was matching Liz.Grimes@plumsteadmanor.com wrong in plumsteadmanor) // 'For pastoral issues'
  mental_health: /mental\s+health\s+lead|school\s+counsellor|wellbeing\s+lead|counsellor|Counselling|wellbeing\s+mentor/i, // Wellbeing Practitioner?
  safeguarding_officer: /safeguarding\s+officer|child\s+protection\s+officer|\bD?CPO\b|(?<!safeguarding\s*)Lead\s+(?:Person\s+)?for\s+Child\s+Protection/i, // 
  deputy_head: /deputy\s+head\s*teacher|assistant\s+head\s*teacher|\b(assistant|deputy)\s+head\b/i, 
  headteacher: /(?<!eputy\s*|sistant\s*|Asst\s*)(head\s*teacher|head\s*master)(?!['’]s?)\b|(?<![-\w])principal\b|co-(principal|headteacher)s?|\bHeadmaster’s\s+Office\b|\bHeadteacher’s\s+Office\b/i, // could do \s?\r?\n? bc pdfs can contain them (they arnt always \n in pdfs...) // also do * instead of '?'? // umm go over this again // Executive Headteacher << put this first?  // Headteacher's PA is still being matched... // eputy headteacher was being matched
  head_of_year: /Head\s+of\s+Year(?!\s*\d)/i, // was: /head of year/i
  head_of_school: /head\s+of\s+school/i
  // add new 1 -> Headteacher's PA??
};
// update this as you come accross websites^^ (find if theyre worded differently & add here...)
// others found: head of inclusion 
// 'assistant headteacher' can be followed by the specific role... 

// \n?\s?\n? -> actually just: \s+ -> actually (*) => to match " \n " (\s? doesn't suffice)
// * => matches zero or more...

// incase of DeputyHeadteacher 
// ^^ no longer putting '*' everywhere, to reduce the chances of malformed emails getting through...


// "DSLi".match(/DSL?!\w/) >> check/add to this

// found: Deputy Safeguarding Person (DDSP) (st-michaels.sandwell)

// make the role-matching test more extensive --> THE MOST IMPORTANT FOR ACCURACY!

// file headers:
const roleNameMap = {
  dsl: "Designated Safeguarding Lead / Safeguarding lead / DSL",
  pshe: "PSHE Lead / PSHE Teacher",
  pastoral: "Head of Pastoral Care / Pastoral Lead",
  mental_health: "Mental Health Lead / School Counsellor / Wellbeing Lead",
  safeguarding_officer: "Safeguarding Officer / Child Protection Officer",
  deputy_head: "Deputy Headteacher / Assistant Headteacher (pastoral / safeguarding remit)",
  headteacher: "Headteacher / Principal", 
  head_of_year: "Head of Year",
  head_of_school: "Head of School"
};

// when back from lunch: fix regex matching! (all of them!!)


module.exports = { roleRegexMap, roleNameMap } ;

// FIX L8R ==>>>
// WRONG MATCHES: 
// 
/*

--> "Childrens-LADO@royalgreenwich.gov.uk" in plumsteadmanor: https://www.plumsteadmanor.com/docs/policies/Safeguarding_and_Child_Protection_Policy_2024_2025a.pdf
// either filter out by: only using emails with @maindomain.com OR filter out .gov.uk (strike 1)

--> `X to 85258
One to one chat/counselling on website
themix.org.uk
 

Supporting bereavement
Call 0808 802 0111
Email https://www.griefencounter.org.uk/`


^^ my domain logging may fix this...

some new ones:
`ron (Deputy Headteacher & Safeguarding Officer) on; 020 7791 4969
For any SENDCo related enquiries, please contact `
matches both deputy_head & safegaurding oddicer....

`• Form tutor  
• Head of year  
• SENCo Paula Carlin  `

take out full stops ?? -->
`not fully resolved, then please contact the Head of Year. Head of Year 7 & Primary Liaison Mr L. O’Donoghue: email:`

` DSL you should contact  
Mr Laing, the Headteacher 
 
Students can report concerns 
confidentially to the DSL at 
`
^^ wrongly matches headteacher, did a lil workaround for it

`nt Head Teacher 
email:lbeavan@cardinalwiseman.net
 

        Rob 
Swanwick
Deputy DSL 
Head Teacher 
email:`
(2 headteachers)


>>> this is cray:
`n.net

Dominic
Kerr
DeputyDSL
Headof
Emmaus
Centre

Emma
Buckle
DeputyDSL
Assistant
Headteacher

dkerr@cardinalwiseman.net
`
(from table)(email is below the wrong thing...)
*/

// consider adding? >>
// pastoral care
