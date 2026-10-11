import Box from "@mui/material/Box";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import Typography from "@mui/material/Typography";
import { NavLink, useLocation } from "react-router-dom";
import { NAV } from "./nav-data";

/** The grouped page list. The current page carries `aria-current="page"`. */
export function SideNav({ onNavigate }: { onNavigate?: () => void }) {
  const { pathname } = useLocation();
  return (
    <Box>
      {NAV.map((group) => (
        <Box key={group.title} component="section" aria-labelledby={`nav-${group.title}`} sx={{ mb: 2 }}>
          <Typography id={`nav-${group.title}`} variant="overline" color="text.secondary" component="h2" sx={{ px: 1.5, display: "block" }}>
            {group.title}
          </Typography>
          <List dense disablePadding>
            {group.links.map((link) => (
              <ListItemButton
                key={link.path}
                component={NavLink}
                to={link.path}
                end
                selected={pathname === link.path}
                onClick={onNavigate}
                sx={{ borderRadius: 1.5 }}
              >
                <ListItemText primary={link.title} />
              </ListItemButton>
            ))}
          </List>
        </Box>
      ))}
    </Box>
  );
}
