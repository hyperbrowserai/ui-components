import React from "react";

import type { CSSProperties } from "react";
import { formatFileSize } from "./filePreview";
import type { FilePreview, ResolvedFileWorkspaceTheme } from "./types";

type CodeEditorPaneProps = {
  document: FilePreview | null;
  theme: ResolvedFileWorkspaceTheme;
};

function toLineCount(contents: string): number {
  if (!contents) {
    return 1;
  }
  return contents.split("\n").length;
}

export function CodeEditorPane({ document, theme }: CodeEditorPaneProps) {
  if (!document) {
    return (
      <div className="hb-filesystem__empty">
        <p className="hb-filesystem__emptyTitle">Choose a file to preview</p>
        <p className="hb-filesystem__emptyMeta">
          Open a file from the explorer to inspect its contents. This workspace is
          currently focused on browsing and read-only previews.
        </p>
      </div>
    );
  }

  const codeStyle = {
    "--hb-filesystem-code-font-family": theme.editor.fontFamily,
    "--hb-filesystem-code-font-size": `${theme.editor.fontSize}px`,
    "--hb-filesystem-code-line-height": String(theme.editor.lineHeight),
  } as CSSProperties;
  const previewMeta = [document.contentType, formatFileSize(document.size)]
    .filter(Boolean)
    .join(" • ");

  switch (document.kind) {
    case "text": {
      const lineCount = toLineCount(document.contents);

      return (
        <div className="hb-filesystem__preview" style={codeStyle}>
          {document.readOnlyReason ? (
            <div className="hb-filesystem__editorBanner" data-tone="warning">
              {document.readOnlyReason}
            </div>
          ) : null}

          <div className="hb-filesystem__codeFrame">
            <pre
              aria-hidden="true"
              className="hb-filesystem__codeGutter"
            >{Array.from({ length: lineCount }, (_, index) => String(index + 1)).join("\n")}</pre>
            <pre className="hb-filesystem__codeContent">{document.contents}</pre>
          </div>
        </div>
      );
    }
    case "image":
      return (
        <div className="hb-filesystem__preview" style={codeStyle}>
          <div className="hb-filesystem__assetFrame">
            <img
              alt={document.name ?? document.path}
              className="hb-filesystem__imagePreview"
              src={document.url}
            />
            {previewMeta ? <p className="hb-filesystem__assetMeta">{previewMeta}</p> : null}
          </div>
        </div>
      );
    case "audio":
      return (
        <div className="hb-filesystem__preview" style={codeStyle}>
          <div className="hb-filesystem__assetFrame">
            <audio
              className="hb-filesystem__mediaPlayer"
              controls
              preload="metadata"
              src={document.url}
            />
            {previewMeta ? <p className="hb-filesystem__assetMeta">{previewMeta}</p> : null}
          </div>
        </div>
      );
    case "video":
      return (
        <div className="hb-filesystem__preview" style={codeStyle}>
          <div className="hb-filesystem__assetFrame">
            <video
              className="hb-filesystem__videoPlayer"
              controls
              preload="metadata"
              src={document.url}
            />
            {previewMeta ? <p className="hb-filesystem__assetMeta">{previewMeta}</p> : null}
          </div>
        </div>
      );
    case "pdf":
      return (
        <div className="hb-filesystem__preview" style={codeStyle}>
          <div className="hb-filesystem__assetFrame hb-filesystem__assetFrame--pdf">
            <iframe
              className="hb-filesystem__pdfFrame"
              src={document.url}
              title={document.name ?? document.path}
            />
            {previewMeta ? <p className="hb-filesystem__assetMeta">{previewMeta}</p> : null}
          </div>
        </div>
      );
    case "binary":
    default:
      return (
        <div className="hb-filesystem__preview" style={codeStyle}>
          {document.readOnlyReason || document.reason ? (
            <div className="hb-filesystem__editorBanner" data-tone="warning">
              {document.readOnlyReason ?? document.reason}
            </div>
          ) : null}
          <div className="hb-filesystem__binaryState">
            <div className="hb-filesystem__binaryIcon" aria-hidden="true">
              <svg viewBox="0 0 16 16" fill="none">
                <path
                  d="M4 2.5h5l3 3V13a1 1 0 0 1-1 1H4.999A1 1 0 0 1 4 13V2.5Z"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.2"
                />
                <path
                  d="M9 2.5V6h3"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.2"
                />
              </svg>
            </div>
            <p className="hb-filesystem__binaryTitle">
              This file does not have an inline preview.
            </p>
            <p className="hb-filesystem__binaryMeta">
              {document.reason ??
                document.readOnlyReason ??
                "Binary and unsupported files are surfaced as metadata-only fallbacks."}
            </p>
            {previewMeta ? <p className="hb-filesystem__assetMeta">{previewMeta}</p> : null}
          </div>
        </div>
      );
  }
}
