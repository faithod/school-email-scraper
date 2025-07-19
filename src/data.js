// ohh they show based on priority...
const roleRegexMap = {
  dsl: /designated safeguarding lead|safeguarding lead/i, // DOES ADDING JUST 'SAFEGAURDING' CHANGE THINGS?? // adding dsl...
  pshe: /pshe lead|pshe teacher|personal, social/i, // Personal, Social, Health hmmm
  pastoral: /head of pastoral care|pastoral lead|pastoral care|pastoral/i,
  mental_health: /mental health lead|school counsellor|wellbeing lead|counsellor|Counselling/i, // Wellbeing Practitioner?
  safeguarding_officer: /safeguarding officer|child protection officer/i,
  deputy_head: /deputy headteacher|assistant headteacher/i, 
  headteacher: /(?<!deputy\s|assistant\s)headteacher|principal/i, // Executive Headteacher << put this first? // if 'headteacher' - `find the mainn headteacher not assistant headteacher`
  head_of_year: /\bHead of Year\b(?!\s*(\d|or\b))/i, // was: /head of year/i
  head_of_school: /head of school/i
  // add new 1 -> Headteacher's PA??
};
// update this as you come accross websites^^
// checked: 1
// others found: head of inclusion // todo: on other websites find if theyre worded differently & add here...
// 'assistant headteacher' can be followed by the specific role... 

// {} another object to get other alternatives of the name?

module.exports = roleRegexMap;