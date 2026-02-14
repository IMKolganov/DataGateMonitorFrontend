/**
 * Syntax highlighting for OpenVPN Management Interface output.
 * Based on: https://openvpn.net/community-docs/management-interface.html
 */
import React from "react";

export type HighlightSegment = { text: string; cls: string };

const RECORD_TYPES = new Set([
  "TITLE",
  "TIME",
  "HEADER",
  "CLIENT_LIST",
  "ROUTING_TABLE",
  "GLOBAL_STATS",
  "END",
]);

function parseSegments(line: string): { text: string; cls: string }[] {
  const result: { text: string; cls: string }[] = [];

  // User command echo: > cmd
  if (line.startsWith("> ")) {
    result.push({ text: "> ", cls: "ovp-prompt" });
    const rest = line.slice(2);
    const firstWord = rest.split(/\s/)[0] ?? "";
    if (firstWord) {
      result.push({ text: firstWord, cls: "ovp-command" });
      const remainder = rest.slice(firstWord.length);
      if (remainder) result.push({ text: remainder, cls: "" });
    } else {
      result.push({ text: rest, cls: "" });
    }
    return result;
  }

  // Real-time: >TYPE:data
  const rtMatch = line.match(/^>(STATE|LOG|INFO|PASSWORD|CLIENT|ECHO|FATAL|HOLD|BYTECOUNT_CLI?|NEED-OK|NEED-STR|REMOTE|PROXY|RSA_SIGN|PK_SIGN)(:.*)?/);
  if (rtMatch) {
    result.push({ text: `>${rtMatch[1]}`, cls: "ovp-realtime" });
    if (rtMatch[2]) result.push({ text: rtMatch[2], cls: "ovp-realtime-data" });
    return result;
  }

  // SUCCESS: / ERROR:
  if (line.startsWith("SUCCESS:")) {
    result.push({ text: "SUCCESS:", cls: "ovp-success" });
    result.push({ text: line.slice(7), cls: "" });
    return result;
  }
  if (line.startsWith("ERROR:")) {
    result.push({ text: "ERROR:", cls: "ovp-error" });
    result.push({ text: line.slice(6), cls: "" });
    return result;
  }

  // Tab-separated: KEYWORD\tvalue
  const tabIdx = line.indexOf("\t");
  if (tabIdx >= 0) {
    const keyword = line.slice(0, tabIdx).trim();
    const value = line.slice(tabIdx);
    if (RECORD_TYPES.has(keyword)) {
      result.push({ text: keyword, cls: "ovp-keyword" });
      result.push({ text: value, cls: "ovp-value" });
      return result;
    }
  }

  // Generic: highlight inline patterns (IPs, timestamps, brackets, record types, UPPERCASE identifiers)
  const parts: { text: string; cls: string }[] = [];
  const re = /(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}|\b\d{10}\b|\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}\b|\[[^\]]+\]|CLIENT_LIST|ROUTING_TABLE|GLOBAL_STATS|TITLE|TIME|HEADER|END|\b[A-Z][A-Z0-9_-]*\b)/g;
  let lastEnd = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(line)) !== null) {
    if (m.index > lastEnd) {
      parts.push({ text: line.slice(lastEnd, m.index), cls: "" });
    }
    const t = m[1];
    let cls = "";
    if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(t)) cls = "ovp-ip";
    else if (/^\d{10}$/.test(t)) cls = "ovp-timestamp";
    else if (/^\d{4}-\d{2}-\d{2}/.test(t)) cls = "ovp-datetime";
    else if (/^\[.+\]$/.test(t)) cls = "ovp-bracket";
    else if (RECORD_TYPES.has(t)) cls = "ovp-keyword";
    else if (/^[A-Z][A-Z0-9_-]*$/.test(t)) cls = "ovp-identifier";
    parts.push({ text: t, cls });
    lastEnd = m.index + t.length;
  }
  if (lastEnd < line.length) parts.push({ text: line.slice(lastEnd), cls: "" });
  return parts.length > 0 ? parts : [{ text: line, cls: "" }];
}

export function highlightOvpMgmtLine(line: string): React.ReactNode {
  const lines = line.split("\n");
  if (lines.length === 1) {
    const segments = parseSegments(line);
    const needsHighlight = segments.some((s) => s.cls !== "");
    if (!needsHighlight) return line;
    return (
      <>
        {segments.map((seg, i) =>
          seg.cls ? (
            <span key={i} className={seg.cls}>
              {seg.text}
            </span>
          ) : (
            seg.text
          ),
        )}
      </>
    );
  }
  return (
    <>
      {lines.map((ln, i) => (
        <React.Fragment key={i}>
          {i > 0 && "\n"}
          {highlightOvpMgmtLine(ln)}
        </React.Fragment>
      ))}
    </>
  );
}
