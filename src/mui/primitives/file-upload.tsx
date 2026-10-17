"use client";

/**
 * Drag-and-drop and picker for attachments, shaped like prompt-kit's: `FileUpload` holds the
 * hidden file input and the drag state, `FileUpload.Trigger` opens the picker, and
 * `FileUpload.Content` is the overlay shown while files are dragged over.
 *
 * `scope="window"` (the default) listens on the whole window and shows `Content` as a
 * full-screen layer. `scope="zone"` wraps its children in a positioned box, listens on that
 * box alone and shows `Content` inside it: a caller that wants a drop target around one
 * surface (the transcript, the composer, or both) uses it.
 */

import {
  Children,
  cloneElement,
  createContext,
  isValidElement,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type MouseEvent,
  type ReactElement,
  type ReactNode,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import Box from "@mui/material/Box";
import ButtonBase from "@mui/material/ButtonBase";
import { alpha } from "@mui/material/styles";
import type { BoxProps } from "@mui/material/Box";
import { useChatKitStyles } from "../theme";
import { sxArray } from "./sx";

type FileUploadContextValue = {
  isDragging: boolean;
  inputRef: RefObject<HTMLInputElement | null>;
  scope: FileUploadScope;
  disabled: boolean;
};

export type FileUploadScope = "window" | "zone";

const FileUploadContext = createContext<FileUploadContextValue | null>(null);

function matchesAccept(file: File, accept?: string): boolean {
  const patterns = (accept ?? "")
    .split(",")
    .map((pattern) => pattern.trim())
    .filter(Boolean);
  if (patterns.length === 0) return true;
  return patterns.some((pattern) => {
    if (pattern.startsWith(".")) {
      return file.name.toLowerCase().endsWith(pattern.toLowerCase());
    }
    if (pattern.endsWith("/*")) {
      return file.type.startsWith(pattern.slice(0, -1));
    }
    return file.type === pattern;
  });
}

export type FileUploadSlotProps = {
  root?: Partial<BoxProps>;
};

export type FileUploadProps = {
  onFilesAdded: (files: File[]) => void;
  accept?: string;
  multiple?: boolean;
  disabled?: boolean;
  scope?: FileUploadScope;
  children?: ReactNode;
  sx?: BoxProps["sx"];
  className?: string;
  slotProps?: FileUploadSlotProps;
};

export function FileUpload({
  onFilesAdded,
  accept,
  multiple = true,
  disabled = false,
  scope = "window",
  children,
  sx,
  className,
  slotProps,
}: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const dragCounter = useRef(0);
  const [isDragging, setDragging] = useState(false);

  const addFiles = useCallback(
    (list: FileList | File[]) => {
      const accepted = Array.from(list).filter((file) => matchesAccept(file, accept));
      const files = multiple ? accepted : accepted.slice(0, 1);
      if (files.length > 0) onFilesAdded(files);
    },
    [accept, multiple, onFilesAdded]
  );

  useEffect(() => {
    if (scope !== "window" || disabled) return;
    const swallow = (event: globalThis.DragEvent) => {
      event.preventDefault();
      event.stopPropagation();
    };
    const dragIn = (event: globalThis.DragEvent) => {
      swallow(event);
      dragCounter.current += 1;
      if (event.dataTransfer?.items.length) setDragging(true);
    };
    const dragOut = (event: globalThis.DragEvent) => {
      swallow(event);
      dragCounter.current -= 1;
      if (dragCounter.current <= 0) {
        dragCounter.current = 0;
        setDragging(false);
      }
    };
    const drop = (event: globalThis.DragEvent) => {
      swallow(event);
      setDragging(false);
      dragCounter.current = 0;
      if (event.dataTransfer?.files.length) addFiles(event.dataTransfer.files);
    };
    window.addEventListener("dragenter", dragIn);
    window.addEventListener("dragleave", dragOut);
    window.addEventListener("dragover", swallow);
    window.addEventListener("drop", drop);
    return () => {
      window.removeEventListener("dragenter", dragIn);
      window.removeEventListener("dragleave", dragOut);
      window.removeEventListener("dragover", swallow);
      window.removeEventListener("drop", drop);
    };
  }, [addFiles, disabled, scope]);

  const handlePick = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files?.length) {
      addFiles(event.target.files);
      event.target.value = "";
    }
  };

  const context: FileUploadContextValue = { isDragging: isDragging && !disabled, inputRef, scope, disabled };
  const input = (
    <input
      type="file"
      ref={inputRef}
      onChange={handlePick}
      style={{ display: "none" }}
      multiple={multiple}
      accept={accept}
      aria-hidden
      disabled={disabled}
    />
  );

  if (scope === "window") {
    return (
      <FileUploadContext.Provider value={context}>
        {input}
        {children}
      </FileUploadContext.Provider>
    );
  }

  // Entering a child fires dragenter on it before dragleave on the one left, so the zone counts
  // enters and leaves and is "over" while the count is above zero.
  function handleDragEnter(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    if (disabled) return;
    dragCounter.current += 1;
    setDragging(true);
  }

  function handleDragLeave(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    dragCounter.current = Math.max(0, dragCounter.current - 1);
    if (dragCounter.current === 0) setDragging(false);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    dragCounter.current = 0;
    setDragging(false);
    if (disabled) return;
    addFiles(event.dataTransfer?.files ?? []);
  }

  const { sx: rootSx, ...rootRest } = slotProps?.root ?? {};
  return (
    <FileUploadContext.Provider value={context}>
      <Box
        className={className}
        onDragEnter={handleDragEnter}
        onDragOver={(event: DragEvent<HTMLDivElement>) => event.preventDefault()}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        sx={[{ position: "relative" }, ...sxArray(sx), ...sxArray(rootSx)]}
        {...rootRest}
      >
        {input}
        {children}
      </Box>
    </FileUploadContext.Provider>
  );
}

export type FileUploadTriggerProps = {
  /** Make the single child the trigger instead of rendering a button around it. */
  asChild?: boolean;
  children?: ReactNode;
  sx?: BoxProps["sx"];
  className?: string;
  "aria-label"?: string;
};

/** Opens the file picker. With `asChild` the child element is the control and gains the click. */
function FileUploadTrigger({
  asChild = false,
  children,
  sx,
  className,
  "aria-label": ariaLabel,
}: FileUploadTriggerProps) {
  const context = useContext(FileUploadContext);
  const open = () => {
    if (!context?.disabled) context?.inputRef.current?.click();
  };

  if (asChild) {
    const child = Children.only(children) as ReactElement<{
      onClick?: (event: MouseEvent<HTMLElement>) => void;
    }>;
    if (!isValidElement(child)) return null;
    return cloneElement(child, {
      onClick: (event: MouseEvent<HTMLElement>) => {
        event.stopPropagation();
        open();
        child.props.onClick?.(event);
      },
    });
  }

  return (
    <ButtonBase
      aria-label={ariaLabel}
      className={className}
      disabled={context?.disabled}
      onClick={open}
      sx={sx}
    >
      {children}
    </ButtonBase>
  );
}

/** The layer shown while files are dragged over: full screen for a window scope, filling the box for a zone. */
function FileUploadContent({
  children,
  sx,
  className,
}: {
  children?: ReactNode;
  sx?: BoxProps["sx"];
  className?: string;
}) {
  const context = useContext(FileUploadContext);
  const { scheme } = useChatKitStyles();
  if (!context?.isDragging || context.disabled) return null;

  const zone = context.scope === "zone";
  const layer = (
    <Box
      className={className}
      sx={[
        scheme((c, all) => ({
          position: zone ? "absolute" : "fixed",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: zone ? 10 : 1300,
          pointerEvents: "none",
          color: c.accent,
          fontWeight: 600,
          bgcolor: alpha(zone ? c.accent : c.surface, zone ? 0.08 : 0.8),
          ...(zone
            ? { border: 2, borderStyle: "dashed", borderColor: c.accent, borderRadius: `${all.radius}px` }
            : { backdropFilter: "blur(4px)" }),
        })),
        ...sxArray(sx),
      ]}
    >
      {children}
    </Box>
  );

  if (zone) return layer;
  return createPortal(layer, document.body);
}

FileUpload.Trigger = FileUploadTrigger;
FileUpload.Content = FileUploadContent;

export { FileUploadTrigger, FileUploadContent };
