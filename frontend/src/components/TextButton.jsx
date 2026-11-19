export function TextButton({ className = "", ...props }) {
  return (
    <button
      type="button"
      className={`shrink-0 cursor-pointer text-sm text-primary underline underline-offset-3 hover:text-primary-hover ${className}`}
      {...props}
    />
  );
}
