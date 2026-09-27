import type { Locator as PwLocator, Page } from "@playwright/test";

import type { Locator } from "./types.ts";

type Root = Page | PwLocator;

/** SCHEMA.md locator table: role > label > testid, text only to read messages; no CSS/XPath. */
export function build(root: Page, loc: Locator): PwLocator {
  const scope: Root = loc.within ? build(root, loc.within) : root;
  let l: PwLocator;
  switch (loc.by) {
    case "role":
      l = scope.getByRole(loc.role as Parameters<Page["getByRole"]>[0], {
        ...(loc.name !== undefined ? { name: loc.name } : {}),
        ...(loc.exact !== undefined ? { exact: loc.exact } : {}),
        ...(loc.level !== undefined ? { level: loc.level } : {}),
      });
      break;
    case "label":
      l = scope.getByLabel(loc.value!, loc.exact !== undefined ? { exact: loc.exact } : {});
      break;
    case "testid":
      l = scope.getByTestId(loc.value!);
      break;
    case "text":
      l = scope.getByText(loc.value!, loc.exact !== undefined ? { exact: loc.exact } : {});
      break;
  }
  return loc.nth !== undefined ? l.nth(loc.nth) : l;
}

export function describe(loc: Locator): string {
  const self =
    loc.by === "role"
      ? `role=${loc.role}${loc.name ? ` "${loc.name}"` : ""}`
      : `${loc.by}="${loc.value}"`;
  return `${loc.within ? `${describe(loc.within)} >> ` : ""}${self}${loc.nth !== undefined ? ` [${loc.nth}]` : ""}`;
}
