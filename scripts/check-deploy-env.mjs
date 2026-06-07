const required = [
  "TMDB_API_KEY",
  "OMDB_API_KEY",
  "OPENAI_API_KEY",
  "FIREBASE_PROJECT_ID",
  "CLOUDFLARE_ACCOUNT_ID",
  "CLOUDFLARE_ZONE_ID",
  "CLOUDFLARE_API_TOKEN"
];

const optionalButRecommended = [
  "OPENAI_RANKING_ENABLED",
  "OPENAI_RANKING_MONTHLY_BUDGET_USD",
  "OPENAI_RANKING_MODEL",
  "FIRESTORE_COLLECTION"
];

const missing = required.filter((name) => !process.env[name]);
const missingOptional = optionalButRecommended.filter((name) => !process.env[name]);

if (missing.length > 0) {
  console.error(`Missing required deploy env vars:\n${missing.map((name) => `- ${name}`).join("\n")}`);
  process.exit(1);
}

if (missingOptional.length > 0) {
  console.warn(`Missing optional deploy env vars:\n${missingOptional.map((name) => `- ${name}`).join("\n")}`);
}

console.log("Deploy environment variables are present.");
