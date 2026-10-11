import type { PrimitiveSlug } from "../../site/nav-data";
import { PRIM_FLOW } from "./prim-flow";
import { PRIM_INPUT } from "./prim-input";
import { PRIM_TEXT } from "./prim-text";
import type { ComponentDoc } from "./types";

// Typed against the slug list, so a page missing from the menu's list (or the reverse) fails the build.
export const PRIMITIVE_DOCS = { ...PRIM_TEXT, ...PRIM_FLOW, ...PRIM_INPUT } as Record<PrimitiveSlug, ComponentDoc>;
