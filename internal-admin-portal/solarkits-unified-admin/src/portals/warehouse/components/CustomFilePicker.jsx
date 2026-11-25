import React, { useState } from "react";

export default function CustomFilePicker({
  name,
  label,
  onChange,
  multiple = false,
  accept = "*",
  className = "",
  disabled = false,
  files = [],
}) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = (e) => {
    e.preventDefault();
    if (!disabled) setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (disabled) return;

    setIsDragging(false);

    const droppedFiles = e.dataTransfer.files;

    // Wrap dropped files into same format as input's onChange
    const syntheticEvent = {
      target: {
        name,
        files: multiple ? droppedFiles : [droppedFiles[0]],
      },
    };

    onChange(syntheticEvent);
  };

  return (
    <div className={`flex flex-col w-full ${className}`}>
      {label && (
        <label htmlFor={name} className="text-text-primary font-medium mb-1">
          {label}
        </label>
      )}

      <label
        htmlFor={name}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          border-2 border-dashed rounded-lg px-3 py-6
          flex flex-col items-center justify-center gap-2
          transition-all cursor-pointer bg-surface
          ${isDragging ? "border-primary bg-primary/10" : "border-border"}
          ${disabled ? "opacity-50 cursor-not-allowed bg-surface-hover" : "hover:border-primary hover:bg-surface-hover"}
        `}
      >
        <span className="text-text-secondary text-sm">
          {isDragging ? "Drop files here..." : "Drag & drop or click to browse"}
        </span>

        <span className="text-primary font-medium">Browse Files</span>

        <input
          id={name}
          name={name}
          type="file"
          accept={accept}
          multiple={multiple}
          disabled={disabled}
          onChange={onChange}
          className="hidden"
        />
      </label>

      {files.length > 0 && (
        <div className="mt-3 space-y-1 bg-surface-hover p-2 rounded-md border border-border">
          {Array.from(files).map((file, i) => (
            <p key={i} className="text-sm text-text-secondary truncate">
              • {file.name}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}