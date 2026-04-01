"use client";

export default function CaseNoteEditor() {
  return (
    <div className="space-y-2 rounded-lg border p-4">
      <p className="text-sm font-medium">Case Note Editor</p>
      <textarea
        className="min-h-32 w-full rounded-md border p-2 text-sm"
        placeholder="Write encrypted note content..."
      />
    </div>
  );
}
