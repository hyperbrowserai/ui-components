import { useEffect, useRef, useState } from "react";
import type * as MonacoEditor from "monaco-editor";
import { loadMonaco } from "./monaco-loader";
import type { FileDocument, ResolvedFileWorkspaceTheme } from "./types";

type CodeEditorPaneProps = {
  document: FileDocument | null;
  monacoVsPath?: string;
  onChange: (nextValue: string) => void;
  onSave?: () => void;
  theme: ResolvedFileWorkspaceTheme;
};

function ensureTheme(
  monaco: typeof MonacoEditor,
  theme: ResolvedFileWorkspaceTheme
): string {
  const themeName = `hb-filesystem-${theme.id}`;
  monaco.editor.defineTheme(themeName, {
    base: "vs",
    inherit: true,
    colors: {
      "editor.background": theme.chrome.editorBackground,
      "editor.foreground": theme.chrome.text,
      "editor.lineHighlightBackground": theme.chrome.rowHover,
      "editor.selectionBackground": theme.chrome.rowActive,
      "editorCursor.foreground": theme.chrome.accent,
      "editorIndentGuide.background1": theme.chrome.border,
      "editorLineNumber.foreground": theme.chrome.textMuted,
      "editorLineNumber.activeForeground": theme.chrome.text,
    },
    rules: [],
  });
  return themeName;
}

export function CodeEditorPane({
  document,
  onChange,
  onSave,
  theme,
}: CodeEditorPaneProps) {
  const changeHandlerRef = useRef(onChange);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const editorRef = useRef<MonacoEditor.editor.IStandaloneCodeEditor | null>(null);
  const modelsRef = useRef<Map<string, MonacoEditor.editor.ITextModel>>(new Map());
  const monacoRef = useRef<typeof MonacoEditor | null>(null);
  const saveHandlerRef = useRef(onSave);
  const syncRef = useRef(false);
  const viewStatesRef = useRef<
    Map<string, MonacoEditor.editor.ICodeEditorViewState | null>
  >(new Map());
  const visibleDocumentPathRef = useRef<string | null>(null);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">(
    "loading"
  );
  const [loadError, setLoadError] = useState<string | null>(null);

  changeHandlerRef.current = onChange;
  saveHandlerRef.current = onSave;

  useEffect(() => {
    let active = true;

    async function setupEditor() {
      if (!containerRef.current) {
        return;
      }

      try {
        const monaco = await loadMonaco();
        if (!active || !containerRef.current) {
          return;
        }

        monacoRef.current = monaco;
        const themeName = ensureTheme(monaco, theme);
        const editor = monaco.editor.create(containerRef.current, {
          automaticLayout: true,
          fontFamily: theme.editor.fontFamily,
          fontSize: theme.editor.fontSize,
          lineHeight: Math.round(theme.editor.fontSize * theme.editor.lineHeight),
          minimap: {
            enabled: false,
          },
          padding: {
            top: 18,
            bottom: 18,
          },
          readOnly: true,
          renderWhitespace: "selection",
          scrollBeyondLastLine: false,
          smoothScrolling: true,
          tabSize: 2,
          theme: themeName,
        });

        editor.onDidChangeModelContent(() => {
          if (syncRef.current) {
            return;
          }
          const currentModel = editor.getModel();
          if (!currentModel) {
            return;
          }
          changeHandlerRef.current(currentModel.getValue());
        });

        editor.onKeyDown((event) => {
          if (
            saveHandlerRef.current &&
            (event.metaKey || event.ctrlKey) &&
            event.keyCode === monaco.KeyCode.KeyS
          ) {
            event.preventDefault();
            event.stopPropagation();
            saveHandlerRef.current();
          }
        });

        editorRef.current = editor;
        setLoadState("ready");
        setLoadError(null);
      } catch (error) {
        if (!active) {
          return;
        }
        setLoadError(
          error instanceof Error ? error.message : "Failed to load Monaco editor."
        );
        setLoadState("error");
      }
    }

    void setupEditor();

    return () => {
      active = false;
      visibleDocumentPathRef.current = null;
      for (const model of modelsRef.current.values()) {
        model.dispose();
      }
      modelsRef.current.clear();
      viewStatesRef.current.clear();
      editorRef.current?.dispose();
      editorRef.current = null;
      monacoRef.current = null;
    };
  }, [theme]);

  useEffect(() => {
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    if (!editor || !monaco) {
      return;
    }

    const themeName = ensureTheme(monaco, theme);
    monaco.editor.setTheme(themeName);
    editor.updateOptions({
      fontFamily: theme.editor.fontFamily,
      fontSize: theme.editor.fontSize,
      lineHeight: Math.round(theme.editor.fontSize * theme.editor.lineHeight),
    });
  }, [theme]);

  useEffect(() => {
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    if (!editor || !monaco) {
      return;
    }

    const previousPath = visibleDocumentPathRef.current;
    if (previousPath && previousPath !== document?.path) {
      viewStatesRef.current.set(previousPath, editor.saveViewState());
    }

    if (!document) {
      visibleDocumentPathRef.current = null;
      editor.setModel(null);
      return;
    }

    let model = modelsRef.current.get(document.path);
    if (!model) {
      model = monaco.editor.createModel(
        document.contents,
        document.language,
        monaco.Uri.parse(`file://${document.path}`)
      );
      modelsRef.current.set(document.path, model);
    }

    if (model.getValue() !== document.contents) {
      syncRef.current = true;
      model.setValue(document.contents);
      syncRef.current = false;
    }

    if (document.language) {
      monaco.editor.setModelLanguage(model, document.language);
    }

    editor.setModel(model);
    editor.updateOptions({
      readOnly: document.readOnly === true,
    });
    const savedViewState = viewStatesRef.current.get(document.path);
    if (savedViewState) {
      editor.restoreViewState(savedViewState);
    }
    editor.focus();
    visibleDocumentPathRef.current = document.path;
  }, [document]);

  if (!document) {
    return (
      <div className="hb-filesystem__empty">
        <p className="hb-filesystem__emptyTitle">Choose a file to start editing</p>
        <p className="hb-filesystem__emptyMeta">
          Open a file from the explorer to inspect or edit its contents.
        </p>
      </div>
    );
  }

  if (loadState === "error") {
    return (
      <div className="hb-filesystem__editorFallback">
        <div className="hb-filesystem__editorBanner" data-tone="warning">
          {loadError}
        </div>
        <textarea
          className="hb-filesystem__editorTextarea"
          onChange={(event) => changeHandlerRef.current(event.target.value)}
          readOnly={document.readOnly === true}
          value={document.contents}
        />
      </div>
    );
  }

  return (
    <div className="hb-filesystem__editorSurface">
      {loadState === "loading" ? (
        <div className="hb-filesystem__overlay">
          <span>Loading editor…</span>
        </div>
      ) : null}
      {document.readOnlyReason ? (
        <div className="hb-filesystem__editorBanner" data-tone="warning">
          {document.readOnlyReason}
        </div>
      ) : null}
      <div className="hb-filesystem__editorHost" ref={containerRef} />
    </div>
  );
}
