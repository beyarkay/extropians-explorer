/** Glossary of terms, acronyms, and jargon used on the Extropians list.
 *  Terms are matched case-insensitively in message bodies. */

export interface GlossaryEntry {
  term: string;
  aka?: string[]; // alternate forms that should also match
  definition: string;
  category?: string;
}

export const GLOSSARY: GlossaryEntry[] = [
  // Boyd added these
  {
    term: "xox",
    definition:
      "Damien Boderick: \"And I do wish people would stop using the term `clone' to mean `exact duplicate', which a clone isn't. The convenient >H term is `xox' (from `xerox')\"., see /message/22933",
    category: "economics",
  },
  {
    term: "SHRDLU",
    definition:
      "An early natural language understanding program (1968-1970) by Terry Winograd. It could converse about and manipulate a simulated block world. Often cited in AI discussions as an example of early promise and limitations.",
    category: "ai",
  },
  {
    term: "ELIZA",
    definition:
      "An early natural language processing program (1966) by Joseph Weizenbaum at MIT. Simulated a Rogerian psychotherapist by pattern-matching user input. Often cited in discussions of the Turing test and AI consciousness.",
    category: "ai",
  },
  {
    term: "duck",
    definition:
      'From the duck test: "if it walks like a duck and quacks like a duck, it must be a duck." Used in debates about identity, cloning, and xox — if an emulation of you looks and acts like you, is it you? See /message/65039 and /message/66330.',
    aka: ["duck me"],
    category: "consciousness",
  },
  // Acronyms
  {
    term: "GMI",
    definition:
      "Guaranteed Minimum Income — a proposed policy where every citizen receives a basic stipend from the government",
    category: "economics",
  },
  {
    term: "GAI",
    definition: "Guaranteed Annual Income — variant of GMI/UBI",
    category: "economics",
  },
  {
    term: "AGI",
    definition:
      "Artificial General Intelligence — AI with human-level cognitive ability across all domains",
    category: "ai",
  },
  {
    term: "FAI",
    definition:
      "Friendly AI — Yudkowsky's term for an AI system designed to be beneficial to humanity",
    category: "ai",
  },
  {
    term: "UFAI",
    definition:
      "Unfriendly AI — an AGI whose goals are misaligned with human values",
    category: "ai",
  },
  {
    term: "SI",
    definition:
      "Superintelligence — intelligence far surpassing the best human minds in every domain",
    aka: ["superintelligence"],
    category: "ai",
  },
  {
    term: "SL4",
    definition:
      'Shock Level 4 — Yudkowsky\'s mailing list for discussion of the Singularity and AGI. "Shock levels" described how radical a future scenario was',
    category: "community",
  },
  {
    term: "SL3",
    definition:
      "Shock Level 3 — nanotechnology, human-equivalent AI, major life extension",
    category: "community",
  },
  {
    term: "SL2",
    definition:
      "Shock Level 2 — the internet, genetic engineering, moderate life extension",
    category: "community",
  },
  {
    term: "SL1",
    definition:
      "Shock Level 1 — personal computers, mobile phones, the World Wide Web",
    category: "community",
  },
  {
    term: "MNT",
    definition:
      "Molecular Nanotechnology — manufacturing at the atomic/molecular scale, as proposed by Drexler",
    category: "nanotech",
  },
  {
    term: "SIAI",
    definition:
      "Singularity Institute for Artificial Intelligence — Yudkowsky's organization, later renamed MIRI",
    aka: ["SingInst"],
    category: "organizations",
  },
  {
    term: "MIRI",
    definition:
      "Machine Intelligence Research Institute — AI safety research org, formerly SIAI",
    category: "organizations",
  },
  {
    term: "ExI",
    definition:
      "Extropy Institute — the organization that ran the Extropians mailing list, founded by Max More",
    category: "organizations",
  },
  {
    term: "FHI",
    definition:
      "Future of Humanity Institute — Oxford research center founded by Nick Bostrom",
    category: "organizations",
  },
  {
    term: "WTA",
    definition:
      "World Transhumanist Association — international transhumanist org, later renamed Humanity+",
    category: "organizations",
  },
  {
    term: "LEF",
    definition:
      "Life Extension Foundation — organization promoting anti-aging research and supplements",
    category: "organizations",
  },
  {
    term: "PGP",
    definition:
      "Pretty Good Privacy — encryption software for email, widely used by cypherpunks",
    category: "crypto",
  },
  {
    term: "RSA",
    definition: "Rivest-Shamir-Adleman — a public-key cryptography algorithm",
    category: "crypto",
  },
  {
    term: "CA",
    definition:
      "Cellular Automaton — a discrete model of computation (also sometimes Certificate Authority in crypto context)",
    category: "computing",
  },
  {
    term: "GA",
    definition:
      "Genetic Algorithm — optimization technique inspired by biological evolution",
    category: "computing",
  },
  {
    term: "GP",
    definition:
      "Genetic Programming — evolving computer programs using genetic algorithms",
    category: "computing",
  },
  {
    term: "IA",
    definition:
      "Intelligence Amplification — enhancing human intelligence through technology, as opposed to creating AI",
    category: "ai",
  },
  {
    term: "BCI",
    definition:
      "Brain-Computer Interface — direct communication between the brain and a computer",
    category: "biology",
  },
  {
    term: "CR",
    definition:
      "Caloric Restriction — reducing calorie intake to extend lifespan, widely discussed as a life extension strategy",
    category: "biology",
  },
  {
    term: "LEV",
    definition:
      "Longevity Escape Velocity — the point at which life extension technology advances faster than aging",
    category: "biology",
  },
  {
    term: "SENS",
    definition:
      "Strategies for Engineered Negligible Senescence — Aubrey de Grey's framework for defeating aging",
    category: "biology",
  },
  { term: "QM", definition: "Quantum Mechanics", category: "physics" },
  {
    term: "MWI",
    definition:
      "Many-Worlds Interpretation — the interpretation of quantum mechanics where all outcomes occur in branching universes",
    category: "physics",
  },
  {
    term: "GUT",
    definition:
      "Grand Unified Theory — a theoretical framework unifying the electromagnetic, weak, and strong forces",
    category: "physics",
  },
  {
    term: "ZPE",
    definition:
      "Zero-Point Energy — the lowest possible energy state of a quantum system, sometimes invoked in speculative physics discussions",
    category: "physics",
  },

  // Jargon and concepts
  {
    term: "Singularity",
    definition:
      "The hypothetical future point at which technological growth becomes uncontrollable and irreversible, especially due to superintelligent AI. Term popularized by Vernor Vinge",
    aka: ["the Singularity"],
    category: "ai",
  },
  {
    term: "uploading",
    definition:
      "Transferring a human mind to a computer by scanning and emulating the brain's neural structure",
    aka: ["mind uploading", "upload"],
    category: "consciousness",
  },
  {
    term: "extropy",
    definition:
      "The extent of a system's intelligence, information, order, vitality, and capacity for improvement. Coined by Max More as the opposite of entropy",
    category: "philosophy",
  },
  {
    term: "transhumanism",
    definition:
      "The intellectual movement advocating the use of technology to enhance human physical and cognitive abilities",
    aka: ["transhuman", "transhumanist"],
    category: "philosophy",
  },
  {
    term: "posthuman",
    definition:
      "A being whose basic capacities so radically exceed those of present humans as to no longer be unambiguously human",
    aka: ["post-human"],
    category: "philosophy",
  },
  {
    term: "cryonics",
    definition:
      "The practice of preserving the body (or head) at very low temperatures after legal death, with the hope of future revival",
    category: "cryonics",
  },
  {
    term: "vitrification",
    definition:
      "A cryopreservation technique that converts tissue to a glass-like state without forming ice crystals",
    category: "cryonics",
  },
  {
    term: "neuropreservation",
    definition:
      "Cryopreserving only the head/brain, under the assumption that the body can be regrown or replaced",
    aka: ["neuro"],
    category: "cryonics",
  },
  {
    term: "grey goo",
    definition:
      "A hypothetical scenario where self-replicating nanobots consume all matter on Earth. Coined by Eric Drexler",
    aka: ["gray goo"],
    category: "nanotech",
  },
  {
    term: "assembler",
    definition:
      "A proposed nanoscale device that can build structures atom by atom, as described by Drexler",
    aka: ["molecular assembler"],
    category: "nanotech",
  },
  {
    term: "Dyson sphere",
    definition:
      "A hypothetical megastructure enclosing a star to capture most of its energy output",
    aka: ["Dyson Sphere"],
    category: "space",
  },
  {
    term: "O'Neill colony",
    definition:
      "A space habitat design by Gerard K. O'Neill — a large rotating cylinder in space",
    aka: ["O'Neill habitat", "O'Neill cylinder"],
    category: "space",
  },
  {
    term: "Fermi paradox",
    definition:
      "The apparent contradiction between the high probability of extraterrestrial civilizations and the lack of evidence for them",
    category: "philosophy",
  },
  {
    term: "Great Filter",
    definition:
      "A hypothetical barrier in the development of civilizations that prevents them from becoming spacefaring — explains the Fermi paradox",
    category: "philosophy",
  },
  {
    term: "qualia",
    definition:
      'Individual instances of subjective, conscious experience — "what it is like" to perceive something',
    category: "consciousness",
  },
  {
    term: "p-zombie",
    definition:
      "Philosophical zombie — a hypothetical being physically identical to a human but lacking consciousness",
    aka: ["philosophical zombie"],
    category: "consciousness",
  },
  {
    term: "Bayesian",
    definition:
      "Relating to Bayesian probability — updating beliefs based on evidence. A core epistemological framework in this community",
    aka: ["Bayesianism"],
    category: "philosophy",
  },
  {
    term: "utility function",
    definition:
      "A mathematical function representing an agent's preferences, used in decision theory and AI alignment discussions",
    category: "ai",
  },
  {
    term: "paperclip maximizer",
    definition:
      "A thought experiment about an AI tasked with making paperclips that converts all available matter into paperclips — illustrating alignment failure",
    category: "ai",
  },
  {
    term: "morphological freedom",
    definition:
      "The right to modify one's own body in any way, a key transhumanist principle",
    category: "philosophy",
  },
  {
    term: "nootropics",
    definition:
      'Substances claimed to enhance cognitive function — "smart drugs"',
    aka: ["nootropic", "smart drugs"],
    category: "biology",
  },
  {
    term: "cypherpunk",
    definition:
      "An activist advocating widespread use of strong cryptography and privacy-enhancing technologies as a route to social and political change",
    aka: ["cypherpunks"],
    category: "crypto",
  },
  {
    term: "digital cash",
    definition:
      "Electronic currency systems designed to replicate the anonymity of physical cash — predecessors to Bitcoin",
    aka: ["e-cash", "ecash"],
    category: "crypto",
  },
  {
    term: "prediction market",
    definition:
      "A market where participants trade contracts on the outcomes of future events, used as a forecasting tool",
    aka: ["prediction markets", "idea futures"],
    category: "economics",
  },
  {
    term: "PPL",
    definition:
      "Personal Private Law — a libertarian concept where individuals choose their own legal frameworks",
    category: "economics",
  },
  {
    term: "PPAs",
    definition:
      "Private Protection Agencies — hypothetical private alternatives to police in anarcho-capitalist theory",
    category: "economics",
  },
  {
    term: "Alcor",
    definition:
      "Alcor Life Extension Foundation — a cryonics organization in Scottsdale, Arizona",
    category: "organizations",
  },
  {
    term: "CI",
    definition:
      "Cryonics Institute — a cryonics organization in Michigan, generally lower-cost than Alcor",
    category: "organizations",
  },
  {
    term: "drexlerian",
    definition: "Relating to Eric Drexler's vision of molecular nanotechnology",
    aka: ["Drexlerian"],
    category: "nanotech",
  },
  {
    term: "TANSTAAFL",
    definition:
      "There Ain't No Such Thing As A Free Lunch — a libertarian/economics maxim, from Heinlein's \"The Moon Is a Harsh Mistress\"",
    category: "economics",
  },
  {
    term: "meme",
    definition:
      "In this era, used in the original Dawkins sense: a unit of cultural information that spreads between minds — not an internet image macro",
    aka: ["memes", "memetic"],
    category: "philosophy",
  },
  {
    term: "ROTFL",
    definition:
      "Rolling On The Floor Laughing — common internet abbreviation of the era",
    category: "internet",
  },
  { term: "IMHO", definition: "In My Humble Opinion", category: "internet" },
  { term: "IIRC", definition: "If I Recall Correctly", category: "internet" },
  { term: "FWIW", definition: "For What It's Worth", category: "internet" },
  { term: "OTOH", definition: "On The Other Hand", category: "internet" },
  { term: "AFAIK", definition: "As Far As I Know", category: "internet" },
  { term: "WRT", definition: "With Respect To", category: "internet" },
];

// Build a lookup map: lowercase term/aka -> entry
const _lookup = new Map<string, GlossaryEntry>();
for (const entry of GLOSSARY) {
  _lookup.set(entry.term.toLowerCase(), entry);
  for (const aka of entry.aka || []) {
    _lookup.set(aka.toLowerCase(), entry);
  }
}

export function lookupTerm(term: string): GlossaryEntry | undefined {
  return _lookup.get(term.toLowerCase());
}

/** Build a regex that matches any glossary term as a whole word.
 *  Sorted longest-first to avoid partial matches. */
export const GLOSSARY_RE = new RegExp(
  "\\b(" +
    [..._lookup.keys()]
      .sort((a, b) => b.length - a.length)
      .map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
      .join("|") +
    ")\\b",
  "gi",
);
