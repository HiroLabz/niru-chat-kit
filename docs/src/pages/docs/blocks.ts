import type { BlockSlug } from "../../site/nav-data";
import { BLOCKS_A } from "./blocks-a";
import { BLOCKS_B } from "./blocks-b";
import { BLOCKS_CALL } from "./blocks-call";
import type { ComponentDoc } from "./types";

export const BLOCK_DOCS = { ...BLOCKS_A, ...BLOCKS_B, ...BLOCKS_CALL } as Record<BlockSlug, ComponentDoc>;
