import { parseFrontmatter } from "../frontmatter.ts";
import type { Finding, Repo, Rule } from "../repo.ts";

const RULE = "agent-bodies";

const AGENT_FILE = /^plugin\/agents\/([^/]+)\.md$/;

/** The `##` sections every agent body has, in this order (plan 03). */
export const BODY_SECTIONS = ["Inputs", "Steps", "Output", "Stop", "Result line"];

/** The board guide the board agents read by path, because supporting files are not preloaded. */
export const BOARD_GUIDE = "${CLAUDE_PLUGIN_ROOT}/skills/lesson-conventions/board.md";

const BOARD_AGENTS = new Set(["board-author", "board-reviewer"]);

/** The two files every agent reads first, in this order. */
const FIRST_FILES = ["schulkontext.md", "kriterien.md"];

/**
 * Working-folder file names other than the first two. Versioned names are prefixes, so that
 * `planung_vN.md` and `planung_v2.md` both count.
 */
const OTHER_FOLDER_FILES = [
  "CLAUDE.md",
  "onenote.md",
  "stunde.md",
  "material/",
  "planung_v",
  "review_v",
  "rueckmeldung_v",
  "tafelbild_v",
  "tafelbild-review_v",
  "tafelbild-rueckmeldung_v",
];

const RESULT_TOKENS = ["DONE", "FAILED"];

/** Checks the body structure of each existing agent definition. */
export const agentBodies: Rule = {
  name: RULE,
  run(repo: Repo): Finding[] {
    const findings: Finding[] = [];
    for (const file of repo.listFiles()) {
      const match = AGENT_FILE.exec(file);
      if (match === null) continue;
      for (const message of bodyProblems(match[1], repo.readText(file))) {
        findings.push({ file, rule: RULE, message });
      }
    }
    return findings;
  },
};

/** Lists what is wrong with the body of the agent definition `text`, stored as `<fileName>.md`. */
function bodyProblems(fileName: string, text: string): string[] {
  const parsed = parseFrontmatter(text);
  if (!parsed.ok) return [parsed.error];
  const { body } = parsed;
  const problems = [...sectionProblems(body), ...readOrderProblems(body)];
  for (const token of RESULT_TOKENS) {
    if (!new RegExp(`\\b${token}\\b`).test(body)) problems.push(`body lacks the result token ${token}`);
  }
  if (BOARD_AGENTS.has(fileName) && !body.includes(BOARD_GUIDE)) {
    problems.push(`body lacks the board.md path ${BOARD_GUIDE}`);
  }
  return problems;
}

/** Checks that every section heading exists and that they appear in the required order. */
function sectionProblems(body: string): string[] {
  const lines = body.split("\n").map((line) => line.trimEnd());
  const problems: string[] = [];
  const positions: number[] = [];
  for (const section of BODY_SECTIONS) {
    const index = lines.indexOf(`## ${section}`);
    if (index === -1) problems.push(`section "${section}" missing`);
    else positions.push(index);
  }
  if (positions.some((position, index) => index > 0 && position < positions[index - 1])) {
    problems.push(`sections must be in the order ${BODY_SECTIONS.join(", ")}`);
  }
  return problems;
}

/** Checks that `schulkontext.md` comes first, then `kriterien.md`, then any other folder file. */
function readOrderProblems(body: string): string[] {
  const [context, criteria] = FIRST_FILES.map((name) => body.indexOf(name));
  if (context === -1) return ["body never mentions schulkontext.md"];
  if (criteria === -1) return ["body never mentions kriterien.md"];
  if (criteria < context) return ["schulkontext.md must be mentioned before kriterien.md"];
  // One finding for the earliest offender: `tafelbild-review_v` also contains `review_v`.
  const early = OTHER_FOLDER_FILES.map((name) => ({ name, index: body.indexOf(name) }))
    .filter(({ index }) => index !== -1 && index < criteria)
    .sort((a, b) => a.index - b.index || b.name.length - a.name.length);
  if (early.length === 0) return [];
  return [`${early[0].name} is mentioned before schulkontext.md and kriterien.md`];
}
