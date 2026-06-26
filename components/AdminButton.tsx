import type { ButtonHTMLAttributes, ReactNode } from "react";

type AdminButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "toolbar";
type AdminButtonSize = "default" | "compact" | "icon";

export function AdminButton({
  children,
  className,
  icon,
  size = "default",
  variant = "primary",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  icon?: ReactNode;
  size?: AdminButtonSize;
  variant?: AdminButtonVariant;
}) {
  const classes = ["button", variant !== "primary" ? variant : "", size !== "default" ? size : "", className ?? ""].filter(Boolean).join(" ");

  return (
    <button className={classes} {...props}>
      {icon}
      {children}
    </button>
  );
}
