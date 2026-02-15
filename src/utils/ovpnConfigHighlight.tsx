/**
 * Syntax highlighting for OpenVPN config template (directives, placeholders {{ }}, tags <ca> etc.)
 */
import React from "react";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

type Segment = { text: string; type: "directive" | "placeholder" | "tag" | "raw" };

function tokenizeLine(line: string): Segment[] {
  const segments: Segment[] = [];
  let rest = line;
  let onlyWhitespaceSoFar = true;

  while (rest.length > 0) {
    // Placeholder {{ ... }}
    const placeholderMatch = rest.match(/^\{\{[^}]*\}\}/);
    if (placeholderMatch) {
      segments.push({ text: placeholderMatch[0], type: "placeholder" });
      rest = rest.slice(placeholderMatch[0].length);
      onlyWhitespaceSoFar = false;
      continue;
    }

    // Tag </...> or <...>
    const tagMatch = rest.match(/^<\/?[a-z][a-z0-9-]*>/i);
    if (tagMatch) {
      segments.push({ text: tagMatch[0], type: "tag" });
      rest = rest.slice(tagMatch[0].length);
      onlyWhitespaceSoFar = false;
      continue;
    }

    // Directive: only the first word on the line (after optional spaces)
    if (onlyWhitespaceSoFar) {
      const directiveMatch = rest.match(/^([a-z][a-z0-9-]*)(?=\s|$)/i);
      if (directiveMatch) {
        segments.push({ text: directiveMatch[1], type: "directive" });
        rest = rest.slice(directiveMatch[1].length);
        onlyWhitespaceSoFar = false;
        continue;
      }
    }

    // One character of raw
    if (rest[0] !== " " && rest[0] !== "\t") onlyWhitespaceSoFar = false;
    segments.push({ text: rest[0], type: "raw" });
    rest = rest.slice(1);
  }

  return segments;
}

export function highlightOvpnConfig(text: string): React.ReactNode {
  const lines = text.split("\n");
  return (
    <>
      {lines.map((line, lineIdx) => {
        const segments = tokenizeLine(line);
        return (
          <React.Fragment key={lineIdx}>
            {segments.map((seg, segIdx) => {
              const cls =
                seg.type === "directive"
                  ? "ovpn-directive"
                  : seg.type === "placeholder"
                    ? "ovpn-placeholder"
                    : seg.type === "tag"
                      ? "ovpn-tag"
                      : "";
              const content = escapeHtml(seg.text);
              if (!cls) return <span key={segIdx} dangerouslySetInnerHTML={{ __html: content }} />;
              return (
                <span key={segIdx} className={cls} dangerouslySetInnerHTML={{ __html: content }} />
              );
            })}
            {lineIdx < lines.length - 1 ? "\n" : null}
          </React.Fragment>
        );
      })}
    </>
  );
}
