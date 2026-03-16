/** Links for notable list participants.
 *  wikipedia: Wikipedia page
 *  url: personal site or best reference */
export interface AuthorLinks {
  wikipedia?: string
  url?: string
}

export const AUTHOR_LINKS: Record<string, AuthorLinks> = {
  'Eliezer Yudkowsky': {
    wikipedia: 'https://en.wikipedia.org/wiki/Eliezer_Yudkowsky',
    url: 'https://www.yudkowsky.net/',
  },
  'Robin Hanson': {
    wikipedia: 'https://en.wikipedia.org/wiki/Robin_Hanson',
    url: 'https://www.overcomingbias.com/',
  },
  'Hal Finney': {
    wikipedia: 'https://en.wikipedia.org/wiki/Hal_Finney_(computer_scientist)',
  },
  'Nick Bostrom': {
    wikipedia: 'https://en.wikipedia.org/wiki/Nick_Bostrom',
    url: 'https://nickbostrom.com/',
  },
  'Max More': {
    wikipedia: 'https://en.wikipedia.org/wiki/Max_More',
  },
  'Anders Sandberg': {
    wikipedia: 'https://en.wikipedia.org/wiki/Anders_Sandberg',
    url: 'https://www.aleph.se/Trans/',
  },
  'Damien Broderick': {
    wikipedia: 'https://en.wikipedia.org/wiki/Damien_Broderick',
  },
  'Lee Daniel Crocker': {
    wikipedia: 'https://en.wikipedia.org/wiki/Lee_Daniel_Crocker',
    url: 'https://github.com/lcrocker',
  },
  'Amara Graps': {
    wikipedia: 'https://en.wikipedia.org/wiki/Amara_Graps',
    url: 'https://www.psi.edu/staff/profile/amara-graps/professional-history/',
  },
  'Nick Szabo': {
    wikipedia: 'https://en.wikipedia.org/wiki/Nick_Szabo',
  },
  'Wei Dai': {
    wikipedia: 'https://en.wikipedia.org/wiki/Wei_Dai',
  },
  'David Friedman': {
    wikipedia: 'https://en.wikipedia.org/wiki/David_D._Friedman',
  },
  'Natasha Vita-More': {
    wikipedia: 'https://en.wikipedia.org/wiki/Natasha_Vita-More',
  },
  'Ralph Merkle': {
    wikipedia: 'https://en.wikipedia.org/wiki/Ralph_Merkle',
  },
  'Eric Drexler': {
    wikipedia: 'https://en.wikipedia.org/wiki/K._Eric_Drexler',
  },
  'Hans Moravec': {
    wikipedia: 'https://en.wikipedia.org/wiki/Hans_Moravec',
  },
  'Gregory Benford': {
    wikipedia: 'https://en.wikipedia.org/wiki/Gregory_Benford',
  },
  'Vernor Vinge': {
    wikipedia: 'https://en.wikipedia.org/wiki/Vernor_Vinge',
  },
  'Sasha Chislenko': {
    url: 'https://hpluspedia.org/wiki/Alexander_Chislenko',
  },
  'Perry Metzger': {
    wikipedia: 'https://en.wikipedia.org/wiki/Perry_E._Metzger',
  },
  'Curt Adams': {
    wikipedia: 'https://en.wikipedia.org/wiki/Curt_Adams',
  },
  'Julian Assange': {
    wikipedia: 'https://en.wikipedia.org/wiki/Julian_Assange',
  },
  'Charlie Stross': {
    wikipedia: 'https://en.wikipedia.org/wiki/Charles_Stross',
    url: 'https://www.antipope.org/charlie/',
  },
  'Ramez Naam': {
    wikipedia: 'https://en.wikipedia.org/wiki/Ramez_Naam',
    url: 'https://rameznaam.com/',
  },
  'Ben Goertzel': {
    wikipedia: 'https://en.wikipedia.org/wiki/Ben_Goertzel',
  },
  'Robert Bradbury': {
    url: 'https://en.wikipedia.org/wiki/Matrioshka_brain',
  },
  'Harvey Newstrom': {
    url: 'https://www.harveynewstrom.com/',
  },
  'Greg Burch': {
    url: 'https://kurzweilai-brain.gothdyke.mom/entries/burch_entry.html',
  },
  'Brian Atkins': {
    url: 'https://intelligence.org/about/',
  },
  'Peter C. Mccluskey': {
    url: 'https://bayesianinvestor.com/',
  },
  'Doug Jones': {
    url: 'https://yarchive.net/space/launchers/roton.html',
  },
}

/** Backward-compat: return the best single link (Wikipedia preferred) */
export const WIKIPEDIA_LINKS: Record<string, string> = Object.fromEntries(
  Object.entries(AUTHOR_LINKS)
    .filter(([, v]) => v.wikipedia || v.url)
    .map(([k, v]) => [k, v.wikipedia || v.url!])
)
