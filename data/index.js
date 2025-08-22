/* updating this as I come accross websites >>  */
const roleRegexMap = {
  dsl: /designated\s+safeguarding\s+lead|safeguarding\s+lead|\bDeputy\s+DSL\b|lead\s+for\s+safeguarding\b|\bSafeguarding\s+Team\b|\bLead\s+DSL\b|\bDSL\s+team\b/i, // Head of Safeguarding // Secondary Safeguarding Lead
  pshe: /pshr?c?e\s+(lead|teacher|coordinator)|personal,\s+social|personal\s+social\s+health|lead\s+for\s+P?SHR?C?E/i, // psce
  pastoral: /head\s+of\s+pastoral\s+care|pastoral\s+lead\b|Pastoral\s+Support\s+Officer|Pastoral\s+Team\b|PASTORAL\s+MANAGER|\bFor\s+(enquiries|issues)\s+related\s+to\s+pastoral\s+care\b|\bPastoral\s+Care\s+Officer\b|Pastoral(?:\s+&\s+([^\s]{1,12}))?\s+Manager/i, // (?: ... )? = optional non-capturing group  // Pastoral Support (and Guidance)? Manager // removing for now: pastoral care|pastoral (was matching Liz.Grimes@plumsteadmanor.com wrong in plumsteadmanor) // 'For pastoral issues'
  mental_health: /mental\s+health\s+lead|school\s+counsellor|wellbeing\s+lead|counsellor|wellbeing\s+mentor/i, // Wellbeing Practitioner? // removed: Counselling // check the results of this... // make this stricter
  safeguarding_officer: /safeguarding\s+officer|child\s+protection\s+officer|\bD?CPO\b|(?<!safeguarding\s*)Lead\s+(?:Person\s+)?for\s+Child\s+Protection/i,
  deputy_head: /deputy\s+head\s*teacher|assistant\s+head\s*teacher|\b(assistant|deputy)\s+head\b/i, 
  headteacher: /(?<!eputy\s*|sistant\s*|Asst\s*|ssociate\s*|\babout\s+the\s+)(head\s*teacher|head\s*master)(?!['’]s?)\b|(?<![-\w]|sistant\s*|eputy\s*|vice\s*)principal\b|co-(principal|headteacher)s?|\bHeadmaster’s\s+Office\b|\bHeadteacher’s\s+Office\b/i, // could do \s?\r?\n? bc pdfs can contain them (they arnt always \n in pdfs...) // go over this 1 again // some reasonings: don't wanna match Headteacher's PA
  head_of_year: /Head\s+of\s+Year(?!\s*\d)/i, // was: /head of year/i
  head_of_school: /\bhead\s+of\s+school\b/i // inspect the output for this... (just added the \b's)
};

// others roles found: head of inclusion (need to know this so I don't wrongly match them)
// things to think about: 'assistant headteacher' can be followed by the specific role..., need to match " \n " (therefore doing \s+)


// decisions: 
// no longer putting '*' everywhere (\s*), to reduce the chances of malformed emails getting through


// random:
// found => Deputy Safeguarding Person (DDSP) (st-michaels.sandwell)


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


module.exports = { roleRegexMap, roleNameMap } ;


/*  WRONG MATCHES: 

// random contexts/wrong matches:

`ron (Deputy Headteacher & Safeguarding Officer) on; 020 7791 4969
For any SENDCo related enquiries, please contact `
matches both deputy_head & safegaurding officer....

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
(^from table)(email is below the wrong thing...)
(don't think I've put in a fix for this one yet...)
*/
