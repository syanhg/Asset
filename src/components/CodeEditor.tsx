import Editor from '@monaco-editor/react';

export function CodeEditor({ code }: { code: string }) {
  return (
    <div className="win-sunken h-full min-h-0">
      <Editor
        height="100%"
        language="r"
        theme="light"
        value={code || '# Generated R code will appear here after you click Generate.'}
        options={{
          readOnly: true,
          domReadOnly: true,
          minimap: { enabled: false },
          fontFamily: 'IBM Plex Mono, JetBrains Mono, SF Mono, Menlo, monospace',
          fontSize: 12,
          lineNumbers: 'on',
          scrollBeyondLastLine: false,
          renderLineHighlight: 'none',
          wordWrap: 'on',
          padding: { top: 8, bottom: 8 },
        }}
      />
    </div>
  );
}
