import type { Finding, Repo, Rule } from "../repo.ts";

/** File types that hold prose or config a person or Claude reads. */
const CHECKED_EXTENSIONS = [".md", ".json", ".ts", ".yml", ".yaml", ".txt"];

const DASHES = /[\u2013\u2014]/;

/** Reports every line containing an em dash (U+2014) or en dash (U+2013). */
export const noDashes: Rule = {
  name: "no-dashes",
  run(repo: Repo): Finding[] {
    const findings: Finding[] = [];
    for (const file of repo.listFiles()) {
      if (!CHECKED_EXTENSIONS.some((ext) => file.endsWith(ext))) continue;
      repo
        .readText(file)
        .split(/\r?\n/)
        .forEach((line, index) => {
          if (DASHES.test(line)) {
            findings.push({
              file,
              rule: "no-dashes",
              message: `line ${index + 1}: em or en dash, use a comma, colon, or parentheses instead`,
            });
          }
        });
    }
    return findings;
  },
};
