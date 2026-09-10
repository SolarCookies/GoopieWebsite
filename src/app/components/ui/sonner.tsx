import { Toaster as Sonner, ToasterProps } from "sonner";

/// App-wide toast host. Styled off the launcher's own `--theme-*` variables
/// rather than shadcn's `--popover`/`--border` defaults (which this app never
/// defines) so toasts inherit whatever skin the user picked, and mounted with
/// an explicit `theme="dark"` because the palette is always dark-on-light-text
/// regardless of OS preference.
const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="dark"
      position="bottom-right"
      className="toaster group"
      style={
        {
          "--normal-bg": "var(--theme-card-bg)",
          "--normal-text": "var(--theme-text-primary)",
          "--normal-border": "var(--theme-border)",
        } as React.CSSProperties
      }
      {...props}
    />
  );
};

export { Toaster };
