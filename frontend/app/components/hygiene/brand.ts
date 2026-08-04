/**
 * Dyzah Hygiene brand constants.
 *
 * Copy and positioning are drawn from the company profile the client supplied.
 * Colours are sampled from the company logo and live as CSS variables under
 * `.theme-hygiene` in globals.css — see HYGIENE_COLORS below for the raw values.
 *
 * CONTACT DETAILS are intentionally environment-driven and default to empty.
 * The profile document carries no published phone/email/address, so nothing is
 * hardcoded here and nothing is invented: any block that would render a missing
 * detail hides itself instead. Set these in the deployment environment when the
 * client confirms what may be published.
 */

export const HYGIENE = {
  name: "Dyzah Hygiene",
  basePath: "/hygiene",
  /** Logo lockup: navy "DYZAH", green "HYGIENE". */
  wordmark: { primary: "DYZAH", secondary: "HYGIENE" },
  tagline: "Promoting Health. Empowering Communities.",
  strapline: "Clean Spaces. Healthy Lives. Empowered Communities.",
  promise: "Creating Cleaner Spaces. Promoting Health. Empowering Communities.",
  serving: "Serving homes, businesses, institutions and communities across Kenya",
} as const;

/** Straight from the logo. Mirrored by `.theme-hygiene` in globals.css. */
export const HYGIENE_COLORS = {
  navy: "#032657",
  green: "#59A740",
} as const;

/**
 * Published contact details. Empty unless configured — never guess these.
 * Consumers must treat "" as "do not render".
 */
export const HYGIENE_CONTACT = {
  email: process.env.NEXT_PUBLIC_HYGIENE_EMAIL ?? "",
  phone: process.env.NEXT_PUBLIC_HYGIENE_PHONE ?? "",
  address: process.env.NEXT_PUBLIC_HYGIENE_ADDRESS ?? "",
};

export const hasContactDetails = () =>
  Boolean(HYGIENE_CONTACT.email || HYGIENE_CONTACT.phone || HYGIENE_CONTACT.address);

/** Core values, from the profile's "Our Core Values" section. */
export const CORE_VALUES: [string, string, string][] = [
  [
    "shield-check",
    "Integrity",
    "Honesty, transparency and ethical responsibility in every engagement. We honour our commitments and protect client confidentiality.",
  ],
  [
    "star",
    "Excellence",
    "From planning to delivery and quality assurance, we work to exceed expectations and hold the highest professional standards.",
  ],
  [
    "badge-check",
    "Professionalism",
    "Discipline, respect, accountability and technical competence — backed by continuous training and best practice.",
  ],
  [
    "user",
    "Customer Focus",
    "We listen, design solutions around your needs, respond promptly to feedback and keep improving.",
  ],
  [
    "sparkles",
    "Innovation",
    "Modern equipment, improved methods and new technology applied wherever they raise service quality.",
  ],
  [
    "droplet",
    "Sustainability",
    "Environmentally responsible products, careful resource use and proper waste management.",
  ],
  [
    "heart-pulse",
    "Community Impact",
    "Hygiene education, menstrual health initiatives, employment and outreach that strengthen communities.",
  ],
  [
    "message-circle",
    "Teamwork",
    "Collaboration and shared responsibility with our people, clients, suppliers and partners.",
  ],
];

/** Sectors served — from the profile. Deliberately generic: no client names. */
export const SECTORS: string[] = [
  "Corporate organisations",
  "Educational institutions",
  "Healthcare facilities",
  "Hospitality establishments",
  "Manufacturing & industry",
  "Retail businesses",
  "Financial institutions",
  "Religious organisations",
  "Residential developments",
  "Government agencies",
  "Non-governmental organisations",
];

/** "Why organisations choose Dyzah Hygiene" — from the profile. */
export const WHY_US: string[] = [
  "Customised hygiene solutions tailored to specific industries.",
  "Professionally trained and experienced personnel.",
  "Modern cleaning equipment and environmentally responsible products.",
  "Flexible service schedules that minimise operational disruption.",
  "Reliable supply of quality hygiene products and sanitary solutions.",
  "Strict adherence to health, safety and quality standards.",
  "Responsive customer support and continuous quality monitoring.",
  "Transparent communication and dependable service delivery.",
];

/** Sector options offered on the B2B supply enquiry form. */
export const ENQUIRY_SECTORS: string[] = [
  "School / educational institution",
  "County government",
  "National government agency",
  "Healthcare facility",
  "NGO / humanitarian agency",
  "Corporate organisation",
  "Development partner",
  "Faith-based organisation",
  "Community-based initiative",
  "Other",
];

export const ENQUIRY_FREQUENCIES: string[] = [
  "One-off order",
  "Monthly",
  "Quarterly",
  "Termly",
  "Annually / on tender",
];
