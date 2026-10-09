import type { SxProps, Theme } from "@mui/material/styles";

/** An `sx` prop as the array MUI accepts, so a component can put its own styles first. */
export function sxArray(sx?: SxProps<Theme>): ReadonlyArray<boolean | object | ((theme: Theme) => object)> {
  if (!sx) return [];
  return (Array.isArray(sx) ? sx : [sx]) as ReadonlyArray<boolean | object | ((theme: Theme) => object)>;
}
