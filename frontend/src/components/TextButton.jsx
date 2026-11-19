// Apresenta ações secundárias como texto sublinhado, mantendo o comportamento de um botão.
export function TextButton({ className = "", ...props }) {
  // Evita enviar o formulário ao usar ações como limpar filtros ou tentar novamente.
  return (
    <button
      type="button"
      className={`shrink-0 cursor-pointer text-sm text-primary underline underline-offset-3 hover:text-primary-hover ${className}`}
      {...props}
    />
  );
}
