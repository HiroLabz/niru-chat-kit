import { useEffect, useRef, useState } from "react";
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Drawer from "@mui/material/Drawer";
import IconButton from "@mui/material/IconButton";
import Link from "@mui/material/Link";
import Stack from "@mui/material/Stack";
import Toolbar from "@mui/material/Toolbar";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";
import DarkModeOutlined from "@mui/icons-material/DarkModeOutlined";
import LightModeOutlined from "@mui/icons-material/LightModeOutlined";
import MenuIcon from "@mui/icons-material/Menu";
import { Link as RouterLink, Outlet, useLocation } from "react-router-dom";
import { SideNav } from "./SideNav";
import { OnThisPage } from "./OnThisPage";
import { useMode } from "./mode";

const NAV_WIDTH = 264;
const REPO = "https://github.com/HiroLabz/niru-chat-kit";

/** The docs frame: skip link, header, side navigation, the page and a table of contents. */
export function Shell() {
  const theme = useTheme();
  const wide = useMediaQuery(theme.breakpoints.up("md"));
  const extraWide = useMediaQuery(theme.breakpoints.up("xl"));
  // On a phone the Live demo and GitHub links move into the navigation drawer.
  const roomy = useMediaQuery(theme.breakpoints.up("sm"));
  const [open, setOpen] = useState(false);
  const { mode, toggle } = useMode();
  const { pathname } = useLocation();
  const main = useRef<HTMLElement>(null);
  const first = useRef(true);

  // A new page starts at the top and moves keyboard focus to it, so a screen reader
  // announces the change and the next Tab begins inside the page.
  useEffect(() => {
    window.scrollTo(0, 0);
    setOpen(false);
    if (first.current) {
      first.current = false;
      return;
    }
    main.current?.focus({ preventScroll: true });
  }, [pathname]);

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default", color: "text.primary" }}>
      <Link
        href={`#${pathname}`}
        onClick={(event) => {
          event.preventDefault();
          main.current?.focus();
        }}
        sx={{
          position: "absolute",
          left: 8,
          top: -64,
          zIndex: theme.zIndex.tooltip + 1,
          bgcolor: "background.paper",
          px: 2,
          py: 1,
          borderRadius: 1,
          "&:focus": { top: 8 },
        }}
      >
        Skip to content
      </Link>
      <AppBar position="sticky" color="inherit" elevation={0} component="header" sx={{ borderBottom: 1, borderColor: "divider", bgcolor: "background.paper" }}>
        <Toolbar sx={{ gap: 1, minWidth: 0 }}>
          {!wide ? (
            <IconButton edge="start" aria-label="Open navigation" onClick={() => setOpen(true)}>
              <MenuIcon />
            </IconButton>
          ) : null}
          <Typography component={RouterLink} to="/" variant="h6" noWrap sx={{ color: "inherit", textDecoration: "none", fontWeight: 700, mr: "auto", minWidth: 0 }}>
            niru-chat-kit
          </Typography>
          {roomy ? (
            <>
              <Button component={RouterLink} to="/demo" variant="contained" size="small">
                Live demo
              </Button>
              <Button component="a" href={REPO} target="_blank" rel="noopener noreferrer" size="small" color="inherit">
                GitHub
              </Button>
            </>
          ) : null}
          <Tooltip title={mode === "dark" ? "Switch to light mode" : "Switch to dark mode"}>
            <IconButton onClick={toggle} aria-label={mode === "dark" ? "Switch to light mode" : "Switch to dark mode"}>
              {mode === "dark" ? <LightModeOutlined /> : <DarkModeOutlined />}
            </IconButton>
          </Tooltip>
        </Toolbar>
      </AppBar>
      <Box sx={{ display: "flex", alignItems: "flex-start" }}>
        {wide ? (
          <Box
            component="nav"
            aria-label="Documentation"
            sx={{ width: NAV_WIDTH, flexShrink: 0, position: "sticky", top: 64, height: "calc(100vh - 64px)", overflowY: "auto", borderRight: 1, borderColor: "divider", p: 2 }}
          >
            <SideNav />
          </Box>
        ) : (
          <Drawer open={open} onClose={() => setOpen(false)}>
            <Box component="nav" aria-label="Documentation" sx={{ width: NAV_WIDTH, p: 2 }}>
              {roomy ? null : (
                <Stack spacing={1} sx={{ mb: 2 }}>
                  <Button component={RouterLink} to="/demo" variant="contained" size="small" onClick={() => setOpen(false)}>
                    Live demo
                  </Button>
                  <Button component="a" href={REPO} target="_blank" rel="noopener noreferrer" size="small" color="inherit" variant="outlined">
                    GitHub
                  </Button>
                </Stack>
              )}
              <SideNav onNavigate={() => setOpen(false)} />
            </Box>
          </Drawer>
        )}
        <Box component="main" id="main" ref={main} tabIndex={-1} sx={{ flex: 1, minWidth: 0, outline: "none", px: { xs: 2, md: 5 }, py: 4 }}>
          <Box sx={{ maxWidth: 860, mx: "auto" }}>
            <Outlet />
            <Box component="footer" sx={{ mt: 8, pt: 3, borderTop: 1, borderColor: "divider", color: "text.secondary", fontSize: 14 }}>
              MIT licence. Many component names and shapes follow{" "}
              <Link href="https://github.com/ibelick/prompt-kit" target="_blank" rel="noopener noreferrer">
                prompt-kit
              </Link>
              . The demo runs in your browser and makes no network calls. AI tools can read these plain-text summaries of the kit:{" "}
              <Link href={`${import.meta.env.BASE_URL}llms.txt`}>llms.txt</Link>, <Link href={`${import.meta.env.BASE_URL}llms-full.txt`}>llms-full.txt</Link>.
            </Box>
          </Box>
        </Box>
        {extraWide ? (
          <Box component="aside" aria-label="On this page" sx={{ width: 220, flexShrink: 0, position: "sticky", top: 64, p: 2, pt: 4 }}>
            <OnThisPage key={pathname} />
          </Box>
        ) : null}
      </Box>
    </Box>
  );
}
