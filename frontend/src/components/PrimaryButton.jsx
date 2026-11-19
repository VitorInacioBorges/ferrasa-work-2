// Centraliza o estilo das ações e aceita outro elemento em as, como Link para navegação.
export function PrimaryButton({ as: Component = "button", variant = "primary", className = "", ...props }) {
  // Escolhe as cores para ações principais, alternativas com contorno e ações destrutivas.
  const colors = variant === "outline"
    ? "border-body/50 text-body hover:bg-divider"
    : variant === "danger"
      ? "border-red-800 bg-red-800 text-white hover:bg-red-900"
      : "border-primary bg-primary text-on-primary hover:bg-primary-hover";
  // Permite ajustar dimensões por className e repassa eventos, atributos e conteúdo ao elemento escolhido.
  return (
    <Component
      className={`inline-flex cursor-pointer items-center justify-center gap-2.5 rounded-[7px] border leading-[1.3] no-underline transition-colors duration-150 ${colors} ${className}`}
      {...props}
    />
  );
}
