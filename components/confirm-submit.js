"use client";

export default function ConfirmSubmit({
  action,
  message = "Are you sure?",
  children,
  className = "btn btn-danger",
}) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!confirm(message)) e.preventDefault();
      }}
    >
      <button type="submit" className={className}>
        {children}
      </button>
    </form>
  );
}
