import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { ArrowLeft } from "lucide-react";
import FormField from "../components/FormField.jsx";
import { PrimaryButton } from "../components/PrimaryButton.jsx";
import { createAuthor } from "../services/api.js";
import { splitFieldErrors } from "../services/fieldErrors.js";

// Huehuller: Define os campos que podem receber erros individuais da API.
const authorFields = ["name", "nationality"];

// Huehuller: Exibe o formulário de autor e volta à lista depois de salvar.
export default function AuthorRegister() {
  const navigate = useNavigate();

  // Huehuller: Guarda o estado do envio e separa os erros gerais dos erros de cada campo.
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  // Huehuller: Valida os dados e envia o cadastro sem recarregar a página.
  async function handleSubmit(event) {
    event.preventDefault();
    if (saving) return;

    // Huehuller: Remove espaços das pontas antes de validar e enviar os valores.
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    const nationality = String(form.get("nationality") ?? "").trim();

    // Huehuller: Mostra o erro ao lado do campo e impede um envio inválido.
    const errors = {};
    if (!name || name.length > 150) {
      errors.name = ["Informe um nome de 1 a 150 caracteres."];
    }
    if (nationality.length < 2 || nationality.length > 100) {
      errors.nationality = ["Informe uma nacionalidade de 2 a 100 caracteres."];
    }

    setError("");
    setFieldErrors(errors);
    if (Object.keys(errors).length) {
      event.currentTarget.elements.namedItem(Object.keys(errors)[0])?.focus();
      return;
    }

    // Huehuller: Bloqueia outro envio enquanto a API salva o autor.
    setSaving(true);
    try {
      await createAuthor({ name, nationality });
      navigate("/autores", { replace: true });
    } catch (cause) {
      // Huehuller: Mostra a mensagem da API e mantém os dados digitados para correção.
      const apiError = cause.response?.data?.error;
      const { fields, general } = splitFieldErrors(apiError, authorFields);
      setFieldErrors(fields);
      if (general || !Object.keys(fields).length) {
        setError(general || apiError?.message || "Não foi possível cadastrar o autor. Tente novamente.");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-[calc(100vh-64px)] bg-background px-4 pb-6 pt-4 text-body sm:px-[3.5%]">
      {/* Huehuller: Apresenta o cadastro e oferece um caminho de volta à lista. */}
      <header className="text-center">
        <Link
          to="/autores"
          className="inline-flex items-center gap-2 text-sm text-primary hover:underline sm:text-base"
        >
          <ArrowLeft size={20} aria-hidden="true" />
          Voltar para autores
        </Link>
        <h1 className="mt-4 text-2xl font-bold tracking-tight text-heading sm:text-[28px] lg:text-[32px]">
          Cadastrar autor
        </h1>
        <p className="mt-2 text-sm italic text-muted sm:text-base">
          Adicione um novo autor à biblioteca.
        </p>
      </header>

      {/* Huehuller: Reutiliza os campos e os botões do projeto para manter o visual das telas de livros. */}
      <form
        noValidate
        onSubmit={handleSubmit}
        className="mx-auto mt-9 max-w-[1000px] rounded-xl border border-border bg-surface p-4 sm:p-8"
      >
        <fieldset disabled={saving} className="grid min-w-0 gap-6">
          <FormField
            label="Nome"
            name="name"
            type="text"
            required
            maxLength={150}
            placeholder="Ex.: Machado de Assis"
            errors={fieldErrors.name}
          />
          <FormField
            label="Nacionalidade"
            name="nationality"
            type="text"
            required
            minLength={2}
            maxLength={100}
            placeholder="Ex.: Brasileira"
            hint="Informe a nacionalidade do autor."
            errors={fieldErrors.nationality}
          />
        </fieldset>

        {/* Huehuller: Mostra falhas que não pertencem a nenhum campo específico. */}
        {error && <p role="alert" className="mt-4 text-sm text-red-800">{error}</p>}

        {/* Huehuller: Permite cancelar ou salvar e indica quando o envio está em andamento. */}
        <div className="mt-7 flex flex-wrap items-center gap-3 border-t border-divider pt-5">
          <p className="mr-auto text-sm text-muted">
            <span className="font-bold text-primary">*</span> Campos obrigatórios
          </p>
          <PrimaryButton as={Link} to="/autores" variant="outline" className="px-4 py-2">
            Cancelar
          </PrimaryButton>
          <PrimaryButton type="submit" disabled={saving} className="px-4 py-2 disabled:opacity-60">
            {saving ? "Cadastrando…" : "Cadastrar autor"}
          </PrimaryButton>
        </div>
      </form>
    </div>
  );
}