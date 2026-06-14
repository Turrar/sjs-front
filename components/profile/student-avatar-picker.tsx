"use client";

import { useId, useRef } from "react";
import { Camera } from "lucide-react";
import { cn } from "@/lib/cn";

type StudentAvatarPickerProps = {
  avatarUrl?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  email: string;
  uploading?: boolean;
  onFileSelect: (file: File) => void;
  className?: string;
};

function avatarInitials(
  firstName: string | null | undefined,
  lastName: string | null | undefined,
  email: string,
): string {
  const first = firstName?.trim()?.[0];
  const last = lastName?.trim()?.[0];
  if (first && last) return `${first}${last}`.toUpperCase();
  if (first) return first.toUpperCase();
  return (email[0] ?? "?").toUpperCase();
}

export function StudentAvatarPicker({
  avatarUrl,
  firstName,
  lastName,
  email,
  uploading = false,
  onFileSelect,
  className,
}: StudentAvatarPickerProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const initials = avatarInitials(firstName, lastName, email);

  return (
    <div className={cn("relative shrink-0", className)}>
      <label
        htmlFor={inputId}
        className={cn(
          "group relative flex h-24 w-24 cursor-pointer items-center justify-center overflow-hidden rounded-2xl ring-2 ring-border transition-[box-shadow,transform] hover:ring-accent/40 active:scale-[0.98] sm:h-28 sm:w-28",
          uploading && "pointer-events-none opacity-70",
        )}
        title="Изменить аватар"
      >
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt="Аватар"
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="flex h-full w-full items-center justify-center bg-accent/15 text-2xl font-bold text-accent sm:text-3xl">
            {initials}
          </span>
        )}

        <span
          className={cn(
            "absolute inset-0 flex flex-col items-center justify-center gap-1 bg-gradient-to-t from-black/75 via-black/45 to-black/20 text-white opacity-0 transition-opacity group-hover:opacity-100",
            uploading && "opacity-100",
          )}
          aria-hidden
        >
          {uploading ? (
            <span className="inline-flex h-6 w-6 animate-spin rounded-full border-2 border-white/30 border-t-white" />
          ) : (
            <Camera className="h-5 w-5 drop-shadow-sm" strokeWidth={2} />
          )}
          <span className="text-[11px] font-medium tracking-wide">
            {uploading ? "Загрузка…" : "Изменить"}
          </span>
        </span>
      </label>

      <input
        ref={inputRef}
        id={inputId}
        type="file"
        className="sr-only"
        accept="image/png,image/jpeg,image/webp"
        disabled={uploading}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFileSelect(file);
          e.target.value = "";
        }}
      />
    </div>
  );
}
