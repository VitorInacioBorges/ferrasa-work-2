import { useId } from "react";
import { ChevronDown } from "lucide-react";
import FieldErrors from "./FieldErrors.jsx";

// Compartilha a apresentação de rótulo, controle, erros e orientação dos campos de formulário.
export default function FormField({ label, hint, errors, children, required, ...props }) {
  // Gera um identificador único para vincular o rótulo, a orientação e os erros ao controle.
  const id = useId();
  // Opções recebidas como children transformam o campo em select.
  const Control = children ? "select" : "input";

  return (
    <div className="min-w-0">
      <label htmlFor={id} className="mb-2 block text-base font-bold text-heading">
        {label} {required && <span aria-hidden="true" className="text-primary">*</span>}
      </label>
      <div className="relative">
        {/* Repassa atributos e eventos do formulário e associa os textos auxiliares via aria-describedby. */}
        <Control
          {...props}
          id={id}
          required={required}
          aria-invalid={errors?.length ? true : undefined}
          aria-describedby={[hint && `${id}-hint`, errors?.length && `${id}-errors`].filter(Boolean).join(" ") || undefined}
          className={`h-10 w-full rounded-md border border-body/40 bg-white/30 px-4 text-sm text-body placeholder:text-muted focus:outline-2 focus:outline-primary ${children ? "appearance-none pr-10 required:invalid:text-muted" : ""}`}
        >{children}</Control>
        {/* A seta é decorativa e deixa os cliques passarem para o select. */}
        {children && <ChevronDown aria-hidden="true" size={18} className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2" />}
      </div>
      <FieldErrors id={`${id}-errors`} messages={errors} />
      {hint && <p id={`${id}-hint`} className="mt-1.5 text-sm text-muted">{hint}</p>}
    </div>
  );
}
