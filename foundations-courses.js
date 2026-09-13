/* ============================================================
   AI FOUNDATIONS — the course register

   One definition per course, read by both the card grid on
   foundations.html and the course pages themselves, so a duration
   or a title can never say two different things in two places.

   Durations here are the verified ones from the dev lead. They are
   deliberately NOT taken from the API: the cohort record on dev
   still reports "3 Weeks 4 Days" for AI Automation against a
   verified six weeks, and the page should not repeat that.

   `programme` is matched against the live /programs list to find an
   id, which is what the cohort endpoint needs. A course with no
   backend record yet still renders; it just has no cohorts.

   `ready` says whether the course page itself has been built. A course
   without one still shows as a card, but points at the waitlist and
   says so rather than linking to a URL that 404s.

   window.FND = { COURSES, api, findProgramme, fetchCohorts, fmtDate }
   ============================================================ */
(function () {
  'use strict';

  var COURSES = [
    {
      slug: 'ai-automation',
      page: 'foundations-ai-automation.html',
      ready: true,
      title: 'AI Automation',
      weeks: 6,
      art: 'assets/fnd/automations.jpg',
      accent: '#FF5748',
      match: ['automation'],
      tagline: 'Make the repetitive work run itself.',
      blurb: 'Build the automations that take repetitive work off your desk, from the first trigger to something running on its own.',
      outcome: 'You leave with working automations you built, running against your own tasks.'
    },
    {
      slug: 'data-analytics',
      page: 'foundations-data-analytics.html',
      ready: true,
      title: 'Data Analytics',
      weeks: 8,
      art: 'assets/fnd/data.jpg',
      accent: '#FF294E',
      match: ['analytic'],
      tagline: 'Turn a spreadsheet into an answer.',
      blurb: 'Read data properly, question it, and turn it into something a room full of people will act on rather than argue with.',
      outcome: 'You leave able to take a raw dataset and defend the conclusion you draw from it.'
    },
    {
      slug: 'data-science',
      page: 'foundations-data-science.html',
      ready: true,
      title: 'Data Science',
      weeks: 16,
      art: 'assets/fnd/datascience.jpg',
      accent: '#C4173A',
      match: ['data science', 'data-science'],
      tagline: 'The long road, walked properly.',
      blurb: 'The deepest course we run. Statistics, modelling and machine learning from the ground floor, at a pace that assumes you have never done any of it.',
      outcome: 'You leave with a trained model, the reasoning behind it, and the judgement to know what it cannot do.'
    },
    {
      slug: 'cyber-security',
      page: 'foundations-cyber-security.html',
      ready: true,
      title: 'Cyber Security',
      weeks: 16,
      art: 'assets/fnd/security.jpg',
      accent: '#9A2335',
      match: ['cyber', 'security'],
      tagline: 'Learn to defend before you specialise.',
      blurb: 'How attacks actually work, how defences are built, and where AI helps or quietly makes things worse. No prior security background assumed.',
      outcome: 'You leave able to read an incident, reason about it, and say what you would do next.'
    },
    {
      slug: 'business-analysis',
      page: 'foundations-business-analysis.html',
      ready: true,
      title: 'Business Analysis',
      weeks: 12,
      art: 'assets/fnd/business.jpg',
      accent: '#FF294E',
      match: ['business analysis', 'business-analysis'],
      tagline: 'Find the real problem before anyone builds.',
      blurb: 'Gather what people actually need rather than what they first ask for, write it down so it survives contact with a delivery team, and use AI to do it faster.',
      outcome: 'You leave with a full requirements pack for a real problem, written the way a delivery team can use.'
    },
    {
      slug: 'project-management',
      page: 'foundations-project-management.html',
      ready: true,
      title: 'Project Management',
      weeks: 12,
      art: 'assets/fnd/project.jpg',
      accent: '#FF5748',
      match: ['project management', 'project-management'],
      tagline: 'Ship things on time, with the receipts.',
      blurb: 'Plan work that survives reality, keep it moving when it slips, and use AI for the reporting and tracking that usually eats the week.',
      outcome: 'You leave having planned and run a project end to end, with the artefacts to show for it.'
    }
  ];

  var api = (location.hostname === 'brixgate.com' || location.hostname === 'www.brixgate.com')
    ? 'https://api.brixgate.com'
    : 'https://dev.api.brixgate.com';

  var programmesPromise = null;
  function programmes() {
    if (!programmesPromise) {
      programmesPromise = fetch(api + '/api/v1/programs?level=BEGINNER')
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (j) { return (j && j.data && j.data.programs) || []; })
        .catch(function () { return []; });
    }
    return programmesPromise;
  }

  /* Name match, not slug: the backend slugs drift between
     environments and new courses arrive named by a human. */
  function findProgramme(course, list) {
    for (var i = 0; i < list.length; i++) {
      var hay = ((list[i].title || '') + ' ' + (list[i].slug || '')).toLowerCase().replace(/[-_]+/g, ' ');
      for (var j = 0; j < course.match.length; j++) {
        if (hay.indexOf(course.match[j].replace(/-/g, ' ')) !== -1) return list[i];
      }
    }
    return null;
  }

  /* Cohorts hang off the programme id, so this is a two step lookup:
     name to id, then id to cohorts. Resolves to [] rather than
     rejecting, because an empty cohort list is a normal state here. */
  function fetchCohorts(course) {
    return programmes().then(function (list) {
      var p = findProgramme(course, list);
      if (!p) return { programme: null, cohorts: [] };
      return fetch(api + '/api/v1/programs/' + p.id + '/cohorts')
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (j) {
          return { programme: p, cohorts: (j && j.data && j.data.cohorts) || [] };
        })
        .catch(function () { return { programme: p, cohorts: [] }; });
    });
  }

  function fmtDate(iso) {
    if (!iso) return null;
    var d = new Date(iso);
    if (isNaN(d)) return null;
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  window.FND = {
    COURSES: COURSES,
    api: api,
    programmes: programmes,
    findProgramme: findProgramme,
    fetchCohorts: fetchCohorts,
    fmtDate: fmtDate
  };
})();
