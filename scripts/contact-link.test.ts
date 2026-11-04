import assert from "node:assert/strict";
import test from "node:test";
import { getContactLink } from "../src/utils/contact-link";

test("GitHub profile links use the username from the destination", () => {
  for (const href of [
    "https://github.com/hanlife02",
    "https://github.com/hanlife02/",
    "http://github.com/hanlife02?tab=repositories#readme",
  ]) {
    assert.deepEqual(getContactLink(href), {
      kind: "github",
      label: "hanlife02",
    });
  }
});

test("repository, site, and unrelated links keep their original content", () => {
  for (const href of [
    "https://github.com/hanlife02/Astro-star",
    "https://github.com/",
    "https://github.com/features",
    "https://github.com/login",
    "https://github.com/invalid--name",
    "https://github.com/-invalid",
    "https://github.com/" + "a".repeat(40),
    "https://github.com.evil.example/user",
    "https://github.com@evil.example/user",
    "https://user@github.com/profile",
    "https://github.com:8080/user",
    "ftp://github.com/user",
    "https://example.com/user",
    "/about/",
    "#contact",
    "not a URL",
  ]) {
    assert.equal(getContactLink(href), null, href);
  }
});

test("mail links display the decoded address while retaining the destination", () => {
  for (const href of [
    "mailto:ethan@hanlife02.com",
    "mailto:ethan%40hanlife02.com?subject=Hello&body=Hi",
  ]) {
    assert.deepEqual(getContactLink(href), {
      kind: "mail",
      label: "ethan@hanlife02.com",
    });
  }
});

test("empty, malformed, and multiple-recipient mail links stay ordinary links", () => {
  for (const href of [
    "mailto:",
    "mailto:not-an-email",
    "mailto:a@example.com,b@example.com",
    "mailto:a@example.com;b@example.com",
    "mailto:a%0Ab@example.com",
    "mailto:a%ZZ@example.com",
  ]) {
    assert.equal(getContactLink(href), null, href);
  }
});
