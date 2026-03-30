import { useTerminal } from "./useTerminal";
import type { BaseTerminalProps } from "./types";

export function BaseTerminal({
  className,
  style,
  ...options
}: BaseTerminalProps) {
  const { status, viewportRef } = useTerminal(options);
  const rootClassName = ["hb-terminal-base", className]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className={rootClassName}
      data-status={status}
      ref={viewportRef}
      style={style}
    />
  );
}
