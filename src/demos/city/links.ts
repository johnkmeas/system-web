/**
 * Ops City config: one district (building) per domain of work.
 *
 * Fill in the constants below and the links pick them up. Any link marked
 * `todo: true` shows a "needs URL" badge until you replace it with the real one.
 */

/** Shopify store handle: the part after admin.shopify.com/store/ */
export const SHOP = "your-store";
/** Theme IDs for preview links (Online Store → Themes → … → copy ID). */
export const THEMES = { dev: "000000000001", staging: "000000000002" };
/** Custom storefront domains, if any. */
export const DOMAINS = { prod: "https://www.example.com", staging: "https://staging.example.com", dev: "http://127.0.0.1:9292" };
export const GITHUB_ORG = "your-org";

export type Env = "prod" | "staging" | "dev";
export type Form = "stepped" | "spire" | "cylinder" | "datacenter" | "twist" | "hub";

export interface CityLink {
  label: string;
  url: string;
  note?: string;
  env?: Env;
  /** Placeholder URL that still needs the real value. */
  todo?: boolean;
}

export interface LinkGroup {
  title: string;
  links: CityLink[];
}

export interface District {
  id: string;
  name: string;
  kicker: string;
  blurb: string;
  color: string;
  form: Form;
  /** Block position on the city grid (world units, 20 per block). */
  pos: [number, number];
  height: number;
  groups: LinkGroup[];
}

const admin = (path = "") => `https://admin.shopify.com/store/${SHOP}${path}`;
const preview = (id: string) => `https://${SHOP}.myshopify.com/?preview_theme_id=${id}`;
const repo = (name: string) => `https://github.com/${GITHUB_ORG}/${name}`;

export const DISTRICTS: District[] = [
  {
    id: "storefront", name: "Storefront", kicker: "Shopify",
    blurb: "Admin, environment previews, the dev dashboard, source and design systems.",
    color: "#FF6A3D", form: "stepped", pos: [-60, -20], height: 46,
    groups: [
      {
        title: "Shopify admin",
        links: [
          { label: "Store admin", url: admin(), env: "prod", todo: true },
          { label: "Products", url: admin("/products"), env: "prod", todo: true },
          { label: "Themes", url: admin("/themes"), env: "prod", todo: true },
          { label: "Files", url: admin("/content/files"), env: "prod", todo: true },
          { label: "Metaobjects", url: admin("/content/metaobjects"), env: "prod", todo: true },
          { label: "Apps", url: admin("/apps"), env: "prod", todo: true },
        ],
      },
      {
        title: "Previews",
        links: [
          { label: "Production", url: DOMAINS.prod, env: "prod", todo: true },
          { label: "Staging theme", url: preview(THEMES.staging), env: "staging", todo: true },
          { label: "Staging domain", url: DOMAINS.staging, env: "staging", todo: true },
          { label: "Dev theme", url: preview(THEMES.dev), env: "dev", todo: true },
          { label: "Local theme dev", url: DOMAINS.dev, env: "dev", note: "shopify theme dev" },
        ],
      },
      {
        title: "Developer",
        links: [
          { label: "Dev Dashboard", url: "https://dev.shopify.com/dashboard", note: "Apps, dev stores" },
          { label: "Partners", url: "https://partners.shopify.com" },
          { label: "Shopify.dev docs", url: "https://shopify.dev/docs" },
          { label: "GraphiQL explorer", url: "https://shopify.dev/docs/api/usage/api-exploration/admin-graphiql-explorer" },
        ],
      },
      {
        title: "GitHub",
        links: [
          { label: "Organization", url: `https://github.com/${GITHUB_ORG}`, todo: true },
          { label: "Theme repo", url: repo("theme"), todo: true },
          { label: "Storefront app", url: repo("storefront"), todo: true },
          { label: "Pull requests", url: `https://github.com/pulls?q=is%3Aopen+org%3A${GITHUB_ORG}`, todo: true },
        ],
      },
      {
        title: "Figma",
        links: [
          { label: "Design system", url: "https://www.figma.com/files", todo: true },
          { label: "Storefront designs", url: "https://www.figma.com/files", todo: true },
          { label: "Email templates", url: "https://www.figma.com/files", todo: true },
        ],
      },
    ],
  },
  {
    id: "email", name: "Email", kicker: "Lifecycle",
    blurb: "Iterable and Klaviyo admin, list hygiene with ZeroBounce, and API docs.",
    color: "#FFC83D", form: "spire", pos: [-40, 40], height: 54,
    groups: [
      {
        title: "Iterable",
        links: [
          { label: "Dashboard", url: "https://app.iterable.com" },
          { label: "Campaigns", url: "https://app.iterable.com/campaigns" },
          { label: "Templates", url: "https://app.iterable.com/templates" },
          { label: "Journeys", url: "https://app.iterable.com/workflows" },
        ],
      },
      {
        title: "Klaviyo",
        links: [
          { label: "Dashboard", url: "https://www.klaviyo.com/dashboard" },
          { label: "Flows", url: "https://www.klaviyo.com/flows" },
          { label: "Campaigns", url: "https://www.klaviyo.com/campaigns" },
          { label: "Lists & segments", url: "https://www.klaviyo.com/lists" },
        ],
      },
      {
        title: "Deliverability",
        links: [
          { label: "ZeroBounce", url: "https://www.zerobounce.net/members/", note: "Validation & credits" },
        ],
      },
      {
        title: "Docs",
        links: [
          { label: "Iterable API", url: "https://api.iterable.com/api/docs" },
          { label: "Iterable support", url: "https://support.iterable.com" },
          { label: "Klaviyo developers", url: "https://developers.klaviyo.com" },
          { label: "ZeroBounce API", url: "https://www.zerobounce.net/docs/" },
        ],
      },
    ],
  },
  {
    id: "telehealth", name: "Telehealth", kicker: "Care",
    blurb: "Patient operations in Tellescope and clinical services through OpenLoop.",
    color: "#4FD8C4", form: "cylinder", pos: [40, 40], height: 40,
    groups: [
      {
        title: "Tellescope",
        links: [
          { label: "App", url: "https://app.tellescope.com" },
          { label: "Developer docs", url: "https://developers.tellescope.com" },
        ],
      },
      {
        title: "OpenLoop",
        links: [
          { label: "Partner portal", url: "https://openloophealth.com", todo: true },
          { label: "Website", url: "https://openloophealth.com" },
        ],
      },
    ],
  },
  {
    id: "backend", name: "Backend", kicker: "Infra",
    blurb: "Hosting, edge, DNS and functions across Vercel and Cloudflare.",
    color: "#8C9BFF", form: "datacenter", pos: [60, -20], height: 30,
    groups: [
      {
        title: "Vercel",
        links: [
          { label: "Dashboard", url: "https://vercel.com/dashboard" },
          { label: "Deployments", url: "https://vercel.com/dashboard/deployments" },
          { label: "Docs", url: "https://vercel.com/docs" },
          { label: "Status", url: "https://www.vercel-status.com" },
        ],
      },
      {
        title: "Cloudflare",
        links: [
          { label: "Dashboard", url: "https://dash.cloudflare.com" },
          { label: "Developer docs", url: "https://developers.cloudflare.com" },
          { label: "Status", url: "https://www.cloudflarestatus.com" },
        ],
      },
    ],
  },
  {
    id: "test", name: "Test", kicker: "QA",
    blurb: "Cross-browser and device testing.",
    color: "#FF5FA2", form: "twist", pos: [0, -60], height: 44,
    groups: [
      {
        title: "BrowserStack",
        links: [
          { label: "Live", url: "https://live.browserstack.com/dashboard", note: "Manual browser testing" },
          { label: "App Live", url: "https://app-live.browserstack.com/dashboard", note: "Real devices" },
          { label: "Automate", url: "https://automate.browserstack.com/dashboard" },
          { label: "Percy", url: "https://percy.io", note: "Visual review" },
          { label: "Docs", url: "https://www.browserstack.com/docs" },
        ],
      },
    ],
  },
  {
    id: "products", name: "Product hub", kicker: "Catalog",
    blurb: "Every product's admin metadata, images, metafields and metaobjects, visualizer, PDFs and certificates of analysis.",
    color: "#B6F03C", form: "hub", pos: [0, 0], height: 72,
    groups: [],
  },
];

export const districtById = (id: string | undefined) => DISTRICTS.find(d => d.id === id);
export const adminUrl = admin;
