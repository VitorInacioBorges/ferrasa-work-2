export function PrimaryButton({ as: Component = "button", className = "", ...props }) {
  return (
    <Component
      className={`inline-flex cursor-pointer items-center justify-center gap-2.5 rounded-[7px] border border-primary bg-primary leading-[1.3] text-on-primary no-underline transition-colors duration-150 hover:bg-primary-hover ${className}`}
      {...props}
    />
  );
}
