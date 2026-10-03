import type { Finding, Repo, Rule } from "../repo.ts";

/** Reports every `.json` file that `JSON.parse` rejects. */
export const jsonValid: Rule = {
  name: "json-valid",
  run(repo: Repo): Finding[] {
    const findings: Finding[] = [];
    for (const file of repo.listFiles()) {
      if (!file.endsWith(".json")) continue;
      try {
        JSON.parse(repo.readText(file));
      } catch (error) {
        findings.push({ file, rule: "json-valid", message: (error as Error).message });
      }
    }
    return findings;
  },
};
