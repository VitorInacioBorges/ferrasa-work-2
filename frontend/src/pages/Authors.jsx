import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { Plus, Search } from "lucide-react";
import CollectionMessage from "../components/CollectionMessage.jsx";
import Pagination from "../components/Pagination.jsx";
import { PrimaryButton } from "../components/PrimaryButton.jsx";
import { listAuthorsPage } from "../services/api.js";

// Huehuller: Limita a lista a dez autores por página, como no protótipo.
const PAGE_SIZE = 10;

// Huehuller: Mostra os autores retornados pela API e permite pesquisar pelo nome.
export default function Authors() {
  // Huehuller: Guarda a busca e a página na URL para mantê-las ao recarregar.
  const [searchParams, setSearchParams] = useSearchParams();
  const name = (searchParams.get("name") || "").trim();
  const requestedPage = Number(searchParams.get("page"));
  const page = Number.isSafeInteger(requestedPage) && requestedPage > 0
    ? requestedPage
    : 1;

  // Huehuller: Identifica a consulta atual para não exibir resultados de uma busca anterior.
  const [result, setResult] = useState(null);
  const [retry, setRetry] = useState(0);
  const requestKey = JSON.stringify([name, page, retry]);
  const current = result?.key === requestKey ? result : null;

  // Huehuller: Busca os autores e cancela a requisição quando a consulta muda ou a tela é fechada.
  useEffect(() => {
    const controller = new AbortController();

    listAuthorsPage(
      { name: name || undefined, page, limit: PAGE_SIZE },
      controller.signal,
    )
      .then(({ authors, meta }) => {
        if (!controller.signal.aborted) {
          setResult({ key: requestKey, authors, meta });
        }
      })
      .catch((cause) => {
        if (!controller.signal.aborted) {
          setResult({
            key: requestKey,
            error: cause.response?.data?.error?.message
              || "Verifique a conexão com a API e tente novamente.",
          });
        }
      });

    return () => controller.abort();
  }, [name, page, requestKey]);

  // Huehuller: Aplica o nome digitado e volta à primeira página a cada nova pesquisa.
  function handleSearch(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const searchName = String(form.get("name") || "").trim();
    setSearchParams(searchName ? { name: searchName } : {});
  }

  // Huehuller: Troca a página mantendo o filtro por nome.
  function changePage(nextPage) {
    const params = new URLSearchParams(searchParams);
    if (nextPage > 1) params.set("page", String(nextPage));
    else params.delete("page");
    setSearchParams(params);
  }

  // Huehuller: Usa o total da API para contar todos os resultados, inclusive os das outras páginas.
  const total = current?.meta?.total;

  return (
    <div className="min-h-[calc(100vh-64px)] bg-background px-4 pb-8 pt-5 text-body sm:px-10">
      {/* Huehuller: Mostra o título e a busca por nome no mesmo estilo do acervo. */}
      <section className="text-center" aria-labelledby="authors-title">
        <h1 id="authors-title" className="text-2xl font-bold tracking-tight text-heading sm:text-[32px]">
          Conheça os autores
        </h1>
        <p className="mt-1 italic text-muted">
          Encontre os nomes que fazem parte do nosso acervo.
        </p>

        <form
          key={name}
          role="search"
          aria-label="Buscar autores"
          onSubmit={handleSearch}
          className="mx-auto mt-6 flex max-w-[946px] flex-col gap-3 sm:flex-row"
        >
          <div className="flex min-w-0 flex-1 items-center gap-3 rounded-[7px] border border-border bg-white/20 px-4 text-muted focus-within:outline-2 focus-within:outline-primary">
            <Search size={22} aria-hidden="true" />
            <label htmlFor="author-search" className="sr-only">Nome do autor</label>
            <input
              id="author-search"
              name="name"
              type="search"
              maxLength={150}
              defaultValue={name}
              placeholder="Buscar autor pelo nome..."
              className="h-12 w-full min-w-0 outline-none"
            />
          </div>
          <PrimaryButton type="submit" className="px-7 py-2">
            Pesquisar
          </PrimaryButton>
        </form>
      </section>

      <section className="mx-auto mt-8 max-w-[1246px]" aria-labelledby="authors-list">
        {/* Huehuller: Mostra o atalho de cadastro e o total da pesquisa. */}
        <div className="mb-4 flex flex-wrap items-center gap-3 sm:gap-5">
          <h2 id="authors-list" className="flex-1 text-xl font-bold text-heading sm:text-2xl">
            Autores do acervo
          </h2>
          <PrimaryButton as={Link} to="/autores/cadastrar" className="px-4 py-2">
            <Plus size={20} aria-hidden="true" />
            Cadastrar autor
          </PrimaryButton>
          <p role="status" className="text-sm text-muted">
            {total === undefined
              ? !current && "Carregando autores…"
              : `${total} ${total === 1 ? "autor encontrado" : "autores encontrados"}`}
          </p>
        </div>

        {/* Huehuller: Mostra um aviso, um resultado vazio ou a tabela, conforme a resposta da API. */}
        {current?.error ? (
          <CollectionMessage role="alert" title="Não foi possível carregar os autores" description={current.error}>
            <PrimaryButton type="button" className="px-4 py-2" onClick={() => setRetry((value) => value + 1)}>
              Tentar novamente
            </PrimaryButton>
          </CollectionMessage>
        ) : current?.authors.length === 0 ? (
          <CollectionMessage
            title="Nenhum autor encontrado"
            description={page > 1 ? "Volte à primeira página para ver os resultados." : name ? "Tente pesquisar por outro nome." : "Cadastre o primeiro autor da biblioteca."}
          >
            {page > 1 && (
              <PrimaryButton type="button" className="px-4 py-2" onClick={() => changePage(1)}>
                Voltar à primeira página
              </PrimaryButton>
            )}
          </CollectionMessage>
        ) : current && (
          <>
            <table className="w-full text-left">
              <thead className="text-primary">
                <tr className="border-b border-divider">
                  <th scope="col" className="w-2/3 px-3 py-3">Nome</th>
                  <th scope="col" className="px-3 py-3">Nacionalidade</th>
                </tr>
              </thead>
              <tbody>
                {/* Huehuller: Usa o ID para identificar cada linha e exibe os dois campos do autor. */}
                {current.authors.map((author) => (
                  <tr key={author.id} className="border-b border-divider">
                    <td className="break-words px-3 py-3">{author.name}</td>
                    <td className="break-words px-3 py-3">{author.nationality}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination page={page} totalPages={current.meta.totalPages} onPageChange={changePage} />
          </>
        )}
      </section>
    </div>
  );
}