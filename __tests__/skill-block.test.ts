import assert from "node:assert/strict";
import test from "node:test";

import type { PromptHistoryEntry } from "../src/db";
import { searchPrompts } from "../src/search";
import { collapseSkillBlock } from "../src/skill-block";

const skillBlock = (name: string, body: string) =>
  `<skill name="${name}" location="/home/u/.pi/agent/skills/${name}/SKILL.md">\nReferences are relative to /home/u/.pi/agent/skills/${name}.\n\n${body}\n</skill>`;

test("collapseSkillBlock turns an expanded skill with args back into the slash command", () => {
  const text = `${skillBlock("wayfinder", "# Wayfinder\n\nlong body")}\n\nfind the auth flow`;
  assert.equal(collapseSkillBlock(text), "/skill:wayfinder find the auth flow");
});

test("collapseSkillBlock handles a skill invoked without args", () => {
  assert.equal(collapseSkillBlock(skillBlock("tdd", "body")), "/skill:tdd");
});

test("collapseSkillBlock keeps multi-line args intact", () => {
  const text = `${skillBlock("grilling", "body")}\n\nline one\nline two`;
  assert.equal(collapseSkillBlock(text), "/skill:grilling line one\nline two");
});

test("collapseSkillBlock leaves ordinary prompts and mid-text tags alone", () => {
  assert.equal(collapseSkillBlock("hello world"), "hello world");
  const embedded = `see this: ${skillBlock("tdd", "body")}`;
  assert.equal(collapseSkillBlock(embedded), embedded);
});

const entry = (id: string, text: string): PromptHistoryEntry => ({
  id,
  sessionFile: "/tmp/s.jsonl",
  sessionName: "",
  cwd: "/tmp",
  text,
  preview: text.replace(/\s+/g, " "),
  timestampMs: Number(id),
});

const fakeDb = (entries: PromptHistoryEntry[]) => ({
  listRecentPrompts: () => entries,
  listPromptCandidates: () => entries,
});

test("searchPrompts collapses skill blocks in text and preview when enabled", async () => {
  const raw = `${skillBlock("wayfinder", "Mentions authentication in the body")}\n\ngo`;
  const db = fakeDb([entry("1", raw)]);

  const [recent] = await searchPrompts(db, {
    scope: "local",
    cwd: "/tmp",
    query: "",
    collapseSkillBlocks: true,
  });
  assert.equal(recent?.text, "/skill:wayfinder go");
  assert.equal(recent?.preview, "/skill:wayfinder go");

  const nameHits = await searchPrompts(db, {
    scope: "local",
    cwd: "/tmp",
    query: "skill:wayfinder",
    collapseSkillBlocks: true,
  });
  assert.equal(nameHits[0]?.text, "/skill:wayfinder go");
});

test("searchPrompts does not match skill body text once skill blocks are collapsed", async () => {
  const raw = `${skillBlock("wayfinder", "Mentions authentication in the body")}\n\ngo`;
  const hits = await searchPrompts(fakeDb([entry("1", raw)]), {
    scope: "local",
    cwd: "/tmp",
    query: "authentication",
    collapseSkillBlocks: true,
  });
  assert.equal(hits.length, 0);
});

test("searchPrompts keeps raw skill blocks when the option is off", async () => {
  const raw = `${skillBlock("wayfinder", "body")}\n\ngo`;
  const [result] = await searchPrompts(fakeDb([entry("1", raw)]), {
    scope: "local",
    cwd: "/tmp",
    query: "",
  });
  assert.equal(result?.text, raw);
});
