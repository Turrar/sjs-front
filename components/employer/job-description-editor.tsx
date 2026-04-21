"use client";

import { useEffect, useState } from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Quote,
  Redo2,
  Undo2,
} from "lucide-react";
import { cn } from "@/lib/cn";

const editorShell =
  "rounded-xl border border-border bg-card shadow-sm transition-[border-color,box-shadow] focus-within:border-accent/60 focus-within:ring-2 focus-within:ring-ring/25";

const editorContentClass =
  "min-h-[220px] max-w-none px-3.5 py-3 text-sm leading-relaxed text-card-foreground outline-none " +
  "[&_p]:my-2 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0 " +
  "[&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5 " +
  "[&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 " +
  "[&_blockquote]:my-2 [&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-3 [&_blockquote]:italic [&_blockquote]:text-muted-foreground " +
  "[&_h2]:mt-4 [&_h2]:mb-2 [&_h2]:text-base [&_h2]:font-semibold " +
  "[&_h3]:mt-3 [&_h3]:mb-1.5 [&_h3]:text-sm [&_h3]:font-semibold";

function Toolbar({ editor }: { editor: Editor | null }) {
  const [, tick] = useState(0);
  useEffect(() => {
    if (!editor) return;
    const fn = () => tick((n) => n + 1);
    editor.on("selectionUpdate", fn);
    editor.on("transaction", fn);
    return () => {
      editor.off("selectionUpdate", fn);
      editor.off("transaction", fn);
    };
  }, [editor]);

  if (!editor) return null;

  const btn =
    "rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-40";
  const active = "bg-muted text-foreground";

  return (
    <div
      className="flex flex-wrap gap-0.5 border-b border-border/80 bg-muted/30 px-2 py-1.5"
      role="toolbar"
      aria-label="Форматирование описания"
    >
      <button
        type="button"
        className={cn(btn, editor.isActive("bold") && active)}
        onClick={() => editor.chain().focus().toggleBold().run()}
        aria-label="Жирный"
      >
        <Bold className="h-4 w-4" />
      </button>
      <button
        type="button"
        className={cn(btn, editor.isActive("italic") && active)}
        onClick={() => editor.chain().focus().toggleItalic().run()}
        aria-label="Курсив"
      >
        <Italic className="h-4 w-4" />
      </button>
      <button
        type="button"
        className={cn(btn, editor.isActive("bulletList") && active)}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        aria-label="Маркированный список"
      >
        <List className="h-4 w-4" />
      </button>
      <button
        type="button"
        className={cn(btn, editor.isActive("orderedList") && active)}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        aria-label="Нумерованный список"
      >
        <ListOrdered className="h-4 w-4" />
      </button>
      <button
        type="button"
        className={cn(btn, editor.isActive("blockquote") && active)}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        aria-label="Цитата"
      >
        <Quote className="h-4 w-4" />
      </button>
      <span className="mx-1 w-px self-stretch bg-border/80" aria-hidden />
      <button
        type="button"
        className={btn}
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().undo()}
        aria-label="Отменить"
      >
        <Undo2 className="h-4 w-4" />
      </button>
      <button
        type="button"
        className={btn}
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().redo()}
        aria-label="Повторить"
      >
        <Redo2 className="h-4 w-4" />
      </button>
    </div>
  );
}

export type JobDescriptionEditorProps = {
  label: string;
  value: string;
  onChange: (html: string) => void;
  /** Ограничение длины сохранённой строки (HTML), по умолчанию 20000 */
  maxLength?: number;
  required?: boolean;
  disabled?: boolean;
};

export function JobDescriptionEditor({
  label,
  value,
  onChange,
  maxLength = 20000,
  required,
  disabled,
}: JobDescriptionEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
      }),
      Placeholder.configure({
        placeholder: "Опишите вакансию: задачи, требования, условия, формат работы…",
      }),
    ],
    content: value || "<p></p>",
    editable: !disabled,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: editorContentClass,
        "aria-label": label,
      },
    },
    onUpdate: ({ editor: ed }) => {
      onChange(ed.getHTML());
    },
  });

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(!disabled);
  }, [editor, disabled]);

  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    if (value !== current) {
      editor.commands.setContent(value || "<p></p>", { emitUpdate: false });
    }
  }, [editor, value]);

  const length = editor?.getHTML().length ?? value.length;

  return (
    <div className="flex flex-col gap-2">
      {label ? (
        <span className="text-sm font-medium text-foreground">
          {label}
          {required ? (
            <span className="text-danger" aria-hidden>
              {" "}
              *
            </span>
          ) : null}
        </span>
      ) : null}
      <div className={cn(editorShell, disabled && "pointer-events-none opacity-60")}>
        <Toolbar editor={editor} />
        <EditorContent editor={editor} />
      </div>
      <p className="text-xs text-muted-foreground">
        {length.toLocaleString("ru-RU")} / {maxLength.toLocaleString("ru-RU")}{" "}
        символов (HTML). Горячие клавиши: Ctrl+B / Ctrl+I.
      </p>
    </div>
  );
}
