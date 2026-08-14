// Schema linter for config + demo JSON (PLAN.md Phase 1 accept criteria).
// Validates demo/example-group.config.json against config/config.schema.json,
// and every demo/projects/*.json against config/project.schema.json.
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Ajv from "ajv";
import addFormats from "ajv-formats";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const readJson = (relPath) => JSON.parse(readFileSync(path.join(root, relPath), "utf8"));

const ajv = new Ajv({ allErrors: true, strict: true });
addFormats(ajv);

const validateConfig = ajv.compile(readJson("config/config.schema.json"));
const validateProject = ajv.compile(readJson("config/project.schema.json"));

let failures = 0;

function check(label, validate, data) {
  const valid = validate(data);
  if (valid) {
    console.log(`  OK  ${label}`);
  } else {
    failures += 1;
    console.error(`FAIL  ${label}`);
    for (const err of validate.errors) {
      console.error(`      ${err.instancePath || "/"} ${err.message}`);
    }
  }
}

console.log("Validating config files against config/config.schema.json");
check("demo/example-group.config.json", validateConfig, readJson("demo/example-group.config.json"));

console.log("Validating project snapshots against config/project.schema.json");
const projectsDir = path.join(root, "demo/projects");
for (const file of readdirSync(projectsDir).sort()) {
  if (!file.endsWith(".json")) continue;
  check(`demo/projects/${file}`, validateProject, readJson(`demo/projects/${file}`));
}

if (failures > 0) {
  console.error(`\n${failures} file(s) failed schema validation.`);
  process.exit(1);
}
console.log("\nAll demo JSON files are schema-valid.");
