import type { BlockSlug } from "../../site/nav-data";
import { BLOCKS_A } from "./blocks-a";
import { BLOCKS_B } from "./blocks-b";
import { BLOCKS_CALL } from "./blocks-call";
import { BLOCKS_HEADER } from "./blocks-header";
import { BLOCKS_MEDIA } from "./blocks-media";
import type { ComponentDoc } from "./types";

export const BLOCK_DOCS = { ...BLOCKS_A, ...BLOCKS_B, ...BLOCKS_CALL, ...BLOCKS_HEADER, ...BLOCKS_MEDIA } as Record<BlockSlug, ComponentDoc>;
