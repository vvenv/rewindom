import { thingPath } from "../../shared/useless-section-context.js";

import type { Thing } from "../../shared/thing.js";
import type { UselessThingView } from "../../shared/useless-section-context.js";

export function toUselessThingView(thing: Thing): UselessThingView {
  return {
    kind: thing.kind,
    slug: thing.slug,
    href: thingPath(thing.slug),
    title: thing.title,
    text: thing.text,
    html: thing.html,
    thumbnail: thing.thumbnail,
  };
}
