// ohh they show based on priority...
const roleRegexMap = {
  dsl: /designated safeguarding lead|safeguarding lead/i, // DOES ADDING JUST 'SAFEGAURDING' CHANGE THINGS??
  pshe: /pshe lead|pshe teacher|personal, social|personal social health/i,
  pastoral: /head of pastoral care|pastoral lead|pastoral care|pastoral/i,
  mental_health: /mental health lead|school counsellor|wellbeing lead|counsellor|Counselling/i, // Wellbeing Practitioner?
  safeguarding_officer: /safeguarding officer|child protection officer/i,
  deputy_head: /deputy headteacher|assistant headteacher/i, 
  headteacher: /(?<!deputy\s|assistant\s)headteacher|principal/i, // Executive Headteacher << put this first? // if 'headteacher' - `find the mainn headteacher not assistant headteacher`
  head_of_year: /\bHead of Year\b(?!\s*(\d|or\b))/i, // was: /head of year/i
  head_of_school: /head of school/i
  // add new 1 -> Headteacher's PA??
};
// update this as you come accross websites^^ (find if theyre worded differently & add here...)
// others found: head of inclusion 
// 'assistant headteacher' can be followed by the specific role... 


// "DSLi".match(/DSL?!\w/) >> check/add to this


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