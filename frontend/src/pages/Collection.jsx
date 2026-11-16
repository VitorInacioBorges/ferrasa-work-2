import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { ChevronDown, Plus, Search } from "lucide-react";
import BookCard from "../components/BookCard.jsx";
import CollectionMessage from "../components/CollectionMessage.jsx";
import Pagination from "../components/Pagination.jsx";
import { listBooks, listAuthors } from "../services/api.js";
import brasCubas from "../assets/bras-cubas.png";

// Usa a mesma quantidade para o limite da API e para os cartões exibidos durante o carregamento.
const PAGE_SIZE = 12;
const primaryButtonClassName =
  "inline-flex cursor-pointer items-center justify-center gap-2.5 rounded-[7px] border border-primary bg-primary leading-[1.3] text-on-primary no-underline transition-colors duration-150 hover:bg-primary-hover";
const clearButtonClassName =
  "shrink-0 cursor-pointer text-sm text-primary underline underline-offset-3 hover:text-primary-hover";
// Ajusta as colunas por tamanho de tela e fornece a largura das capas aos componentes BookCard.
const shelfClassName =
  "grid grid-cols-2 gap-y-6 [--cover-width:min(180px,calc((100vw_-_32px)/2_-_24px))] sm:grid-cols-3 sm:[--cover-width:min(180px,calc((100vw_-_80px)/3_-_28px))] lg:grid-cols-4 lg:[--cover-width:180px] xl:grid-cols-6 xl:[--cover-width:min(180px,calc((100vw_-_80px)/6_-_28px))]";

const Collection = () => {
  // Mantém filtros e página na URL para preservar a busca ao recarregar ou compartilhar o endereço.
  const [searchParams, setSearchParams] = useSearchParams();
  const title = searchParams.get("title") || "";
  const authorId = searchParams.get("authorId") || "";
  const requestedPage = Number(searchParams.get("page"));
  // Valores ausentes, negativos ou inválidos na URL levam à primeira página.
  const page =
    Number.isSafeInteger(requestedPage) && requestedPage > 0
      ? requestedPage
      : 1;
  // A string mantém o mesmo valor enquanto os filtros não mudam, evitando buscas a cada renderização.
  const queryKey = JSON.stringify({ title, authorId, page });
  // Agrupa a resposta com sua chave para identificar a qual consulta os dados ou o erro pertencem.
  const [result, setResult] = useState(null);
  const [authors, setAuthors] = useState([]);
  const [authorsError, setAuthorsError] = useState(false);
  // Os dois efeitos dependem deste contador: tentar novamente recarrega livros e autores.
  const [retry, setRetry] = useState(0);
  // Identifica a consulta e a tentativa atual; incrementar retry refaz a busca com os mesmos filtros.
  const requestKey = `${queryKey}:${retry}`;
  // Enquanto não houver resposta para essa chave, oculta os resultados anteriores e mostra o carregamento.
  const loading = result?.key !== requestKey;
  const error = !loading && result?.error;
  // Disponibiliza os dados apenas após uma resposta válida; meta contém os totais informados pela API.
  const books = !loading && !error ? result.books : [];
  const meta = !loading && !error ? result.meta : null;

  // Busca os livros da página atual e os metadados usados na contagem e na paginação.
  useEffect(() => {
    const controller = new AbortController();
    listBooks(
      { ...JSON.parse(queryKey), limit: PAGE_SIZE },
      controller.signal,
    )
      .then(({ books, meta }) => {
        if (!controller.signal.aborted)
          setResult({ key: requestKey, books, meta });
      })
      .catch(() => {
        // Cancelar uma busca faz parte da navegação e não deve gerar uma mensagem de erro.
        if (!controller.signal.aborted)
          setResult({ key: requestKey, error: true });
      });
    // Cancela a busca ao trocar a consulta ou sair da página, evitando atualizações de respostas antigas.
    return () => controller.abort();
  }, [queryKey, requestKey]);

  // Carrega as opções de autor separadamente; mudanças nos filtros não precisam refazer essa consulta.
  useEffect(() => {
    const controller = new AbortController();
    listAuthors(controller.signal)
      .then((items) => {
        if (!controller.signal.aborted) {
          setAuthors(items);
          setAuthorsError(false);
        }
      })
      .catch(() => {
        // A falha dos autores afeta o filtro, mas não impede a exibição dos livros carregados.
        if (!controller.signal.aborted) setAuthorsError(true);
      });
    return () => controller.abort();
  }, [retry]);

  // Altera apenas os parâmetros recebidos e remove os vazios, preservando os demais filtros da URL.
  function updateFilters(changes) {
    // Trabalha sobre uma cópia antes de enviar os novos parâmetros ao roteador.
    const next = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, String(value));
      else next.delete(key);
    }
    setSearchParams(next);
  }

  // Envia a busca sem recarregar a página e volta ao início dos resultados ao pesquisar um título.
  function search(event) {
    event.preventDefault();
    // Lê o campo pelo atributo name e remove espaços nas extremidades antes de aplicar o filtro.
    const form = new FormData(event.currentTarget);
    updateFilters({ title: form.get("title").trim(), page: null });
  }

  const totalPages = meta?.totalPages || 0;

  return (
    <div className="min-h-[calc(100vh-64px)] bg-background bg-[radial-gradient(ellipse_at_50%_15%,var(--color-surface),transparent_75%)] px-4 pt-5 pb-7 text-body sm:px-10 sm:pt-3 sm:pb-8 [&_a:focus-visible]:outline-2 [&_a:focus-visible]:outline-offset-4 [&_a:focus-visible]:outline-primary [&_button:focus-visible]:outline-2 [&_button:focus-visible]:outline-offset-4 [&_button:focus-visible]:outline-primary [&_select:focus-visible]:outline-2 [&_select:focus-visible]:outline-offset-4 [&_select:focus-visible]:outline-primary">
      <section className="text-center" aria-labelledby="collection-title">
        <h1
          id="collection-title"
          className="text-2xl leading-[1.15] font-bold tracking-[-0.035em] text-heading sm:text-[28px] lg:text-[32px]"
        >
          Sua próxima leitura está aqui
        </h1>
        <p className="mt-1 text-sm text-muted sm:text-base">
          <em>Explore o acervo</em> e descubra novas histórias.
        </p>

        {/* A key recria o formulário quando o título da URL muda, sincronizando o campo que usa defaultValue. */}
        <form
          key={title}
          onSubmit={search}
          className="mx-auto mt-6 max-w-[946px] text-left"
          role="search"
          aria-label="Buscar livros"
        >
          <div className="flex flex-wrap gap-2.5 sm:flex-nowrap sm:gap-3.5">
            <div className="flex min-w-0 flex-1 basis-full items-center gap-2.5 rounded-[7px] border border-border bg-white/20 px-3 text-muted shadow-[0_1px_2px_#302a2514] focus-within:outline-2 focus-within:outline-offset-4 focus-within:outline-primary sm:basis-auto sm:gap-4 sm:px-4">
              <Search
                className="shrink-0"
                size={24}
                strokeWidth={1.6}
                aria-hidden="true"
              />
              <label htmlFor="book-search" className="sr-only">
                Título do livro
              </label>
              {/* O texto digitado só é aplicado à busca quando o formulário é enviado. */}
              <input
                id="book-search"
                name="title"
                type="search"
                maxLength={255}
                defaultValue={title}
                placeholder="Buscar pelo título do livro..."
                className="h-12 w-full min-w-0 text-base outline-none placeholder:text-muted placeholder:opacity-100"
              />
            </div>
            <button
              className={`${primaryButtonClassName} w-full px-7 py-2 text-sm sm:w-auto sm:text-base`}
              type="submit"
            >
              Pesquisar
            </button>
          </div>
          <div className="mt-4.5 flex items-center gap-3.5 sm:gap-8">
            <div className="relative min-w-0 flex-1 sm:w-85 sm:max-w-full sm:flex-none">
              <label htmlFor="author-filter" className="sr-only">
                Filtrar por autor
              </label>
              {/* A seleção de autor é aplicada imediatamente e reinicia a paginação. */}
              <select
                id="author-filter"
                value={authorId}
                onChange={(event) =>
                  updateFilters({ authorId: event.target.value, page: null })
                }
                disabled={authorsError}
                className="h-9.5 w-full cursor-pointer appearance-none rounded-md border border-border bg-white/20 pr-10 pl-4 text-sm shadow-[0_1px_2px_#302a2514]"
              >
                <option value="">Todos os autores</option>
                {/* Preserva a seleção da URL mesmo quando o autor ainda não está disponível na lista. */}
                {authorId &&
                  !authors.some((author) => String(author.id) === authorId) && (
                    <option value={authorId}>Autor selecionado</option>
                  )}
                {authors.map((author) => (
                  <option key={author.id} value={author.id}>
                    {author.name}
                  </option>
                ))}
              </select>
              <ChevronDown
                className="pointer-events-none absolute top-2.5 right-3.5"
                size={18}
                aria-hidden="true"
              />
            </div>
            <button
              type="button"
              className={clearButtonClassName}
              onClick={(event) => {
                // Descarta também o texto ainda não enviado; limpar a URL remove filtros e página.
                event.currentTarget.form.reset();
                setSearchParams({});
              }}
            >
              Limpar filtros
            </button>
          </div>
          {authorsError && (
            <p className="mt-2 text-sm" role="alert">
              Não foi possível carregar os autores.{" "}
              <button
                type="button"
                className={clearButtonClassName}
                onClick={() => setRetry((value) => value + 1)}
              >
                Tentar novamente
              </button>
            </p>
          )}
        </form>
      </section>

      {/* aria-busy informa aos leitores de tela que o conteúdo do acervo está sendo atualizado. */}
      <section
        className="mx-auto mt-4.5 max-w-[1392px]"
        aria-labelledby="shelf-title"
        aria-busy={loading}
      >
        <div className="mb-7 flex flex-wrap items-center gap-3 sm:mx-2.5 sm:gap-4 lg:flex-nowrap lg:gap-7">
          <h2
            id="shelf-title"
            className="flex-1 text-xl leading-[1.2] font-bold tracking-tight text-heading sm:flex-none sm:text-2xl"
          >
            Nosso acervo
          </h2>
          <span
            className="hidden h-px flex-1 bg-divider sm:block"
            aria-hidden="true"
          />
          <Link
            to="/livros/cadastrar"
            className={`${primaryButtonClassName} shrink-0 px-2.5 py-2 text-sm sm:px-4.5 sm:py-1.75 sm:text-base`}
          >
            <Plus
              className="w-4.5 sm:w-[23px]"
              size={23}
              strokeWidth={1.6}
              aria-hidden="true"
            />
            Cadastrar livro
          </Link>
          {/* A contagem considera todos os resultados da busca; role="status" anuncia suas mudanças. */}
          <p
            className="w-full text-sm whitespace-nowrap text-muted lg:w-auto"
            role="status"
          >
            {loading
              ? "Carregando acervo…"
              : error
                ? "Acervo indisponível"
                : `${meta.total} ${meta.total === 1 ? "livro encontrado" : "livros encontrados"}`}
          </p>
        </div>

        {/* Alterna entre os cartões de carregamento, erro, resultado vazio e livros encontrados. */}
        {loading ? (
          <div className={shelfClassName} aria-hidden="true">
            {/* Reserva os lugares de uma página inteira enquanto a resposta da API não chega. */}
            {Array.from({ length: PAGE_SIZE }, (_, index) => (
              <BookCard key={index} loading />
            ))}
          </div>
        ) : error ? (
          <CollectionMessage
            role="alert"
            title="Não foi possível carregar o acervo"
            description="Verifique sua conexão e tente novamente."
          >
            <button
              className={`${primaryButtonClassName} mt-2 px-7 py-2 text-sm sm:text-base`}
              onClick={() => setRetry((value) => value + 1)}
            >
              Tentar novamente
            </button>
          </CollectionMessage>
        ) : books.length === 0 ? (
          <CollectionMessage
            title={
              page > 1
                ? "Esta página não tem livros"
                : title || authorId
                  ? "Nenhum livro encontrado"
                  : "Seu acervo começa aqui"
            }
            description={
              page > 1
                ? "Volte à primeira página para ver os resultados."
                : title || authorId
                  ? "Experimente outro título ou limpe os filtros."
                  : "Cadastre o primeiro livro para preencher sua prateleira."
            }
          >
            {/* Em uma página posterior vazia, permite voltar ao início mantendo os filtros atuais. */}
            {page > 1 && (
              <button
                className={clearButtonClassName}
                onClick={() => updateFilters({ page: null })}
              >
                Voltar à primeira página
              </button>
            )}
          </CollectionMessage>
        ) : (
          <div className={shelfClassName}>
            {/* O id identifica cada cartão no React. */}
            {books.map((book) => (
              <BookCard
                key={book.id}
                coverUrl={brasCubas}
                title={book.title}
                authorName={book.author.name}
              />
            ))}
          </div>
        )}

        {/* A página controla a URL; Pagination calcula os botões e informa a página escolhida. */}
        {!loading && !error && books.length > 0 && (
          <Pagination
            page={page}
            totalPages={totalPages}
            onPageChange={(nextPage) => updateFilters({ page: nextPage })}
          />
        )}
      </section>
    </div>
  );
};

export default Collection;
