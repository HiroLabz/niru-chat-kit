import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import { Link as RouterLink } from "react-router-dom";
import { usePageTitle } from "../site/use-page-title";

export function NotFound() {
  usePageTitle("Page not found");
  return (
    <>
      <Typography variant="h1" gutterBottom>
        Page not found
      </Typography>
      <Typography sx={{ mb: 2 }}>There is no page at this address. Pick one from the menu, or go back to the introduction.</Typography>
      <Button component={RouterLink} to="/" variant="contained">
        Introduction
      </Button>
    </>
  );
}
