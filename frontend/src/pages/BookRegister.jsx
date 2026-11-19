import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { ArrowLeft } from "lucide-react";
import FormField from "../components/FormField.jsx";
import ImageFileInput from "../components/ImageFileInput.jsx";
import { PrimaryButton } from "../components/PrimaryButton.jsx";
import { TextButton } from "../components/TextButton.jsx";
import { listAuthors, createBook, getBook, updateBook, uploadBookCover } from "../services/api.js";
import { splitFieldErrors } from "../services/fieldErrors.js";

const bookFields = ["title", "authorId", "isbn", "genre", "publicationYear", "pageCount"];
const errorField = {
  ISBN_ALREADY_EXISTS: "isbn",
  AUTHOR_NOT_FOUND: "authorId",
  INVALID_FILE: "cover",
  FILE_TOO_LARGE: "cover",
};

export default function BookRegister() {
  const { id } = useParams();
  const [result, setResult] = useState(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!id) return;
    const controller = new AbortController();
    getBook(id, controller.signal)
      .then((book) => {
        if (!controller.signal.aborted) setResult({ id, book });
      })
      .catch((cause) => {
        if (!controller.signal.aborted) setResult({
          id, error: cause.response?.data?.error?.message || "Não foi possível carregar o livro.",
        });
      });
    return () => controller.abort();
  }, [id, attempt]);

  if (!id) return <BookForm />;
  if (result?.id !== id) return <p role="status" className="p-8 text-center">Carregando livro…</p>;
  if (result.error) return (
    <div className="p-8 text-center">
      <p role="alert">{result.error}</p>
      <TextButton onClick={() => { setResult(null); setAttempt((value) => value + 1); }}>Tentar novamente</TextButton>
      <Link to="/" className="ml-4 text-primary underline">Voltar ao acervo</Link>
    </div>
  );
  return <BookForm key={id} initialBook={result.book} />;
}

function BookForm({ initialBook }) {
  const editing = Boolean(initialBook);
  const navigate = useNavigate();
  const [authors, setAuthors] = useState([]);
  const [authorsStatus, setAuthorsStatus] = useState("loading");
  const [attempt, setAttempt] = useState(0);
  const [cover, setCover] = useState(null);
  const [bookId, setBookId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    const controller = new AbortController();
    listAuthors(controller.signal)
      .then((items) => {
        if (controller.signal.aborted) return;
        setAuthors(items);
        setAuthorsStatus("ready");
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setAuthorsStatus("error");
      });
    return () => controller.abort();
  }, [attempt]);

  async function submit(event) {
    event.preventDefault();
    if (saving) return;
    const form = event.currentTarget;
    const invalid = Array.from(form.elements).filter((field) => field.willValidate && !field.validity.valid);
    if (invalid.length) {
      setFieldErrors((previous) => ({
        ...previous,
        ...Object.fromEntries(invalid.map((field) => [field.name, [field.validationMessage]])),
      }));
      invalid[0].focus();
      return;
    }
    const data = new FormData(form);
    setSaving(true);
    setError("");
    setFieldErrors({});
    let id = bookId;
    try {
      if (!id) {
        const values = {
          title: data.get("title").trim(),
          authorId: Number(data.get("authorId")),
          isbn: data.get("isbn"),
          genre: data.get("genre").trim(),
          publicationYear: Number(data.get("publicationYear")),
          pageCount: Number(data.get("pageCount")),
        };
        const book = editing
          ? await updateBook(initialBook.id, values)
          : await createBook(values);
        id = book.id;
        setBookId(id);
      }
      if (cover)
        await uploadBookCover(id, cover);
      navigate("/");
    } catch (cause) {
      const apiError = cause.response?.data?.error;
      const { fields, general } = splitFieldErrors(apiError, bookFields);
      const field = errorField[apiError?.code];
      if (field) fields[field] = [apiError.message];
      setFieldErrors(fields);
      if (general || !Object.keys(fields).length) {
        setError(general || (id
          ? "Dados do livro salvos. O envio da capa falhou. Tente novamente ou volte ao acervo."
          : apiError?.message || "Não foi possível salvar o livro. Tente novamente."));
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-[calc(100vh-64px)] bg-background px-4 pt-4 pb-6 text-body sm:px-[3.5%]">
      <header className="text-center">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-primary hover:underline sm:text-base"
        >
          <ArrowLeft aria-hidden="true" /> Voltar ao acervo
        </Link>
        <h1 className="mt-4 text-2xl font-bold tracking-[-0.035em] text-heading sm:text-[28px] lg:text-[32px]">
          {editing ? "Editar livro" : "Cadastrar livro"}
        </h1>
        <p className="mt-2 text-sm text-muted italic sm:text-base">
          {editing ? "Atualize as informações e a capa do livro." : "Preencha as informações para adicionar um livro ao acervo."}
        </p>
      </header>
      <form
        noValidate
        onSubmit={submit}
        className="mx-auto mt-9 max-w-[1294px] rounded-xl border border-border bg-surface p-4 sm:px-7 sm:pt-8 sm:pb-5"
      >
        <div className="grid gap-7 md:grid-cols-[minmax(200px,27%)_1fr] md:gap-10">
          <div className="md:border-r md:border-border md:pr-7">
            <ImageFileInput
              label="Capa do livro"
              prompt="Adicionar capa"
              file={cover}
              previewUrl={initialBook?.coverUrl}
              errors={fieldErrors.cover}
              onChange={(file, message) => {
                setCover(file);
                setFieldErrors((previous) => ({ ...previous, cover: message ? [message] : undefined }));
              }}
              disabled={saving}
            />
          </div>
          <fieldset
            onChange={({ target }) => {
              const { name, validationMessage } = target;
              if (fieldErrors[name]) {
                setFieldErrors((previous) => ({
                  ...previous, [name]: validationMessage ? [validationMessage] : undefined,
                }));
              }
            }}
            disabled={saving || Boolean(bookId)}
            className="grid min-w-0 content-start gap-y-6 sm:grid-cols-2 sm:gap-x-8 sm:gap-y-7"
          >
            <div className="sm:col-span-2">
              <FormField
                label="Título"
                name="title"
                defaultValue={initialBook?.title}
                errors={fieldErrors.title}
                required
                maxLength={255}
                pattern={".*\\S.*"}
                placeholder="Ex.: Dom Casmurro"
              />
            </div>
            <div className="sm:col-span-2">
              <FormField
                label="Autor"
                name="authorId"
                errors={fieldErrors.authorId}
                required
                defaultValue={initialBook?.author.id ?? ""}
                disabled={!authors.length}
              >
                <option value="" disabled>
                  {authorsStatus === "loading"
                    ? "Carregando autores…"
                    : authorsStatus === "error"
                      ? "Autores indisponíveis"
                      : authors.length
                        ? "Selecione um autor"
                        : "Nenhum autor cadastrado"}
                </option>
                {authors.map((author) => (
                  <option key={author.id} value={author.id}>
                    {author.name}
                  </option>
                ))}
              </FormField>
              <Link
                to="/autores/cadastrar"
                className="mt-1 inline-block text-sm text-primary underline sm:text-base"
              >
                Cadastrar autor
              </Link>
              {authorsStatus === "error" && (
                <p role="alert">
                  Não foi possível carregar os autores.{" "}
                  <TextButton
                    onClick={() => {
                      setAuthorsStatus("loading");
                      setAttempt(attempt + 1);
                    }}
                  >
                    Tentar novamente
                  </TextButton>
                </p>
              )}
            </div>
            <FormField
              label="ISBN"
              name="isbn"
              defaultValue={initialBook?.isbn}
              errors={fieldErrors.isbn}
              required
              placeholder="Ex.: 9788535910663"
              onChange={({ target }) => {
                const isbn = target.value.replace(/[-\s]/g, "").toUpperCase();
                target.setCustomValidity(
                  !target.value || /^(\d{9}[\dX]|\d{13})$/.test(isbn)
                    ? ""
                    : "Informe um ISBN de 10 ou 13 caracteres.",
                );
              }}
              hint="Informe 10 ou 13 caracteres."
            />
            <FormField
              label="Gênero"
              name="genre"
              defaultValue={initialBook?.genre}
              errors={fieldErrors.genre}
              required
              maxLength={100}
              pattern={".*\\S.*"}
              placeholder="Ex.: Romance"
            />
            <FormField
              label="Ano de publicação"
              name="publicationYear"
              defaultValue={initialBook?.publicationYear}
              errors={fieldErrors.publicationYear}
              type="number"
              min={1450}
              max={new Date().getFullYear()}
              required
              placeholder="Ex.: 1899"
            />
            <FormField
              label="Número de páginas"
              name="pageCount"
              defaultValue={initialBook?.pageCount}
              errors={fieldErrors.pageCount}
              type="number"
              min={1}
              max={10000}
              required
              placeholder="Ex.: 256"
            />
          </fieldset>
        </div>
        {bookId && (
          <p role="status" className="mt-5 text-sm text-primary">
            Dados do livro salvos. Você pode tentar enviar a capa novamente ou voltar ao acervo.
          </p>
        )}
        {error && (
          <p role="alert" className="mt-5 text-red-800">
            {error}
          </p>
        )}
        <div className="mt-8 flex flex-wrap items-center gap-3 border-t border-border pt-5 sm:gap-5">
          <p className="w-full text-sm sm:mr-auto sm:w-auto">
            <b className="text-primary">*</b> Campos obrigatórios
          </p>
          <PrimaryButton
            variant="outline"
            type="button"
            disabled={saving}
            onClick={() => navigate("/")}
            className="px-5 py-2.5 text-sm sm:px-8 sm:text-base"
          >
            {bookId ? "Voltar ao acervo" : "Cancelar"}
          </PrimaryButton>
          <PrimaryButton
            type="submit"
            disabled={saving || !authors.length}
            className="px-5 py-2.5 text-sm disabled:opacity-60 sm:px-8 sm:text-base"
          >
            {saving ? "Salvando…" : bookId ? "Enviar capa" : editing ? "Salvar alterações" : "Cadastrar livro"}
          </PrimaryButton>
        </div>
      </form>
      <footer className="mx-auto mt-8 border-t border-border pt-4 text-center text-sm text-muted italic">
        Biblioteca · Histórias que conectam.
      </footer>
    </div>
  );
}
