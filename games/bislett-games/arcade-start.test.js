"use strict";

const assert = require("node:assert/strict");
const {readFileSync} = require("node:fs");
const {join} = require("node:path");
const test = require("node:test");

test("Both Arcade starts use buttons that do not submit forms", () => {
  const html = readFileSync(join(__dirname, "index.html"), "utf8");
  for (const id of ["start", "throw-start"]) {
    const button = html.match(new RegExp(`<button\\b[^>]*\\bid="${id}"[^>]*>`));
    assert.ok(button, `Missing #${id}`);
    assert.match(button[0], /\btype="button"/);
  }
});
