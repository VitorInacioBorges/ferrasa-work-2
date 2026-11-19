import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Flower2, Pencil, Trash2, X } from "lucide-react";
import { Link } from "react-router";
import { PrimaryButton } from "./PrimaryButton.jsx";
import { deleteBook } from "../services/api.js";

// Exibe os dados do livro e oferece acesso à edição e à confirmação de exclusão.
export default function BookDetailsModal({ book, onClose, onDeleted }) {
  const dialogRef = useRef(null);
  // Se a imagem falhar, substitui a capa por uma composição com título e autor.
  const [coverFailed, setCoverFailed] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  // A ref bloqueia cliques repetidos imediatamente, antes da próxima renderização.
  const deleteInProgress = useRef(false);

  // Aguarda a API e permite uma nova tentativa quando a exclusão falha.
  async function removeBook() {
    if (deleteInProgress.current) return;
    deleteInProgress.current = true;
    setDeleting(true);
    setDeleteError("");
    try {
      await deleteBook(book.id);
    } catch (cause) {
      // Um 404 indica que o livro já foi removido, então o acervo também deve ser atualizado.
      if (cause.response?.status !== 404) {
        setDeleteError(cause.response?.data?.error?.message || "Não foi possível excluir o livro. Tente novamente.");
        deleteInProgress.current = false;
        setDeleting(false);
        return;
      }
    }
    // A página fecha o modal, recarrega o acervo e ajusta a paginação quando necessário.
    onDeleted();
  }

  // showModal coloca o diálogo acima da página e mantém o foco do teclado dentro dele.
  // O fechamento na limpeza acompanha a desmontagem do componente.
  useEffect(() => {
    const dialog = dialogRef.current;
    dialog.showModal();
    return () => dialog.close();
  }, []);

  // Reúne os rótulos e valores para renderizar a grade de informações do livro.
  const details = [
    ["Gênero", book.genre],
    ["Ano de publicação", book.publicationYear],
    ["Número de páginas", book.pageCount],
    ["ISBN", book.isbn],
  ];

  return (
    // Esc e cliques no fundo fecham o modal quando nenhuma exclusão está em andamento.
    <dialog ref={dialogRef} aria-labelledby="book-details-title"
      onCancel={(event) => { event.preventDefault(); if (!deleteInProgress.current) onClose(); }}
      onClick={(event) => { if (event.target === event.currentTarget && !deleteInProgress.current) onClose(); }}
      className="fixed inset-0 m-auto max-h-[calc(100dvh-32px)] w-[calc(100%-32px)] max-w-[924px] overflow-auto overscroll-contain rounded-3xl border border-[#fffaf1] bg-[radial-gradient(ellipse_at_30%_38%,#fcf9f4,#f8f3ec_85%)] p-0 font-[Georgia,'Times_New_Roman',serif] text-[#302822] shadow-[0_15px_42px_#231b1540] backdrop:bg-black/55">
      {/* Empilha capa e detalhes no celular e os distribui em duas colunas em telas maiores. */}
      <div className="relative grid grid-cols-[minmax(0,1fr)] gap-5 px-5 py-6 sm:grid-cols-[minmax(0,302fr)_minmax(0,456fr)] sm:gap-7 sm:px-[30px] sm:pt-11 sm:pb-8 lg:gap-12 lg:py-[57px] lg:pr-[54px] lg:pl-[60px]">
        <button type="button" aria-label="Fechar detalhes do livro" onClick={onClose} disabled={deleting}
          className="absolute top-[13px] right-[13px] grid size-10 cursor-pointer place-items-center rounded-full border-[1.5px] border-[#a5a78d] bg-[#fbf8f2] text-[#49522b] hover:bg-[#ebe8dc] lg:top-[21px] lg:right-[22px]">
          <X size={20} aria-hidden="true" />
        </button>
        <div className="relative aspect-[302/425] w-[clamp(100px,20dvh,156px)] self-start justify-self-center overflow-hidden rounded-[7px] bg-[#41492a] shadow-[0_12px_19px_-4px_#3f301e66,0_1px_3px_#211c1855] after:pointer-events-none after:absolute after:inset-0 after:rounded-[inherit] after:border after:border-[#352c1c33] after:bg-[linear-gradient(90deg,#1a180e55,#fffa_1%,#231e1840_2.3%,transparent_5%)] after:content-[''] sm:w-auto sm:justify-self-stretch">
          {book.coverUrl && !coverFailed ? (
            <img src={book.coverUrl} alt={`Capa de ${book.title}`} onError={() => setCoverFailed(true)} className="absolute size-full object-cover" />
          ) : (
            <div className="absolute inset-[4%] flex flex-col items-center justify-evenly gap-[4%] overflow-hidden border border-[#c5ab68] p-[7%] text-center text-[#fff6dd] wrap-anywhere [container-type:inline-size]" aria-label="Capa ilustrativa">
              <span className="text-[clamp(8px,5cqw,12px)] tracking-[.12em] uppercase">{book.author.name}</span>
              <Flower2 className="shrink-0 text-[#d5b471]" aria-hidden="true" />
              <strong className="text-[clamp(12px,13cqw,32px)] leading-[1.1] font-normal">{book.title}</strong>
            </div>
          )}
        </div>
        <div className="flex min-w-0 flex-col sm:pt-[9px]">
          <p className="text-xs font-bold tracking-[.15em] text-[#48542c] uppercase sm:pr-8 sm:text-[13px]">Detalhes do livro</p>
          <h2 id="book-details-title" className="mt-1.5 mb-[3px] text-[clamp(24px,3.5vw,32px)] leading-[1.1] font-bold tracking-[-.025em] wrap-anywhere sm:mt-3.5 lg:text-4xl">{book.title}</h2>
          <p className="text-base leading-[1.25] wrap-anywhere sm:text-lg lg:text-xl">{book.author.name}</p>
          <dl className="mt-5 mb-7 grid grid-cols-[minmax(0,1.18fr)_minmax(max-content,1fr)] gap-x-3 gap-y-[18px] border-t border-[#d1c9bd] pt-[18px] sm:pl-1 lg:mt-7 lg:mb-12 lg:gap-y-[27px] lg:pt-[25px]">
            {details.map(([label, value]) => (
              <div key={label}>
                <dt className="text-[13px] text-[#514d49]">{label}</dt>
                <dd className="text-base leading-[1.25] wrap-anywhere lg:text-lg">{value}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-auto">
            {/* A confirmação substitui as ações e mostra eventuais erros da API no próprio modal. */}
            {confirmingDelete ? (
              <div role="group" aria-labelledby="delete-book-question" aria-busy={deleting}
                className="rounded-lg border border-red-800/25 bg-red-50 p-4">
                <p id="delete-book-question" className="text-sm text-heading">
                  Excluir “{book.title}” do acervo? O livro e sua capa serão removidos permanentemente.
                </p>
                {deleteError && <p role="alert" className="mt-2 text-sm text-red-800">{deleteError}</p>}
                <div className="mt-4 flex flex-wrap justify-end gap-3">
                  {/* Cancelar recebe o foco inicial, e as ações ficam bloqueadas durante a requisição. */}
                  <PrimaryButton type="button" variant="outline" autoFocus disabled={deleting}
                    onClick={() => { setConfirmingDelete(false); setDeleteError(""); }}
                    className="min-h-10 px-4 py-2 text-sm disabled:opacity-60">
                    Cancelar
                  </PrimaryButton>
                  <PrimaryButton type="button" variant="danger" onClick={removeBook} disabled={deleting}
                    className="min-h-10 px-4 py-2 text-sm disabled:cursor-wait disabled:opacity-60">
                    <Trash2 size={16} aria-hidden="true" /> {deleting ? "Excluindo…" : "Confirmar exclusão"}
                  </PrimaryButton>
                </div>
              </div>
            ) : (
              // Mantém as três ações na mesma linha no desktop e permite quebra no celular.
              <div className="flex flex-wrap justify-end gap-3 lg:flex-nowrap lg:gap-2 lg:[&>*]:gap-1.5 lg:[&>*]:px-3 lg:[&>*]:text-[13px] lg:[&>*]:whitespace-nowrap lg:[&_svg]:shrink-0">
                <PrimaryButton type="button" variant="danger" onClick={() => setConfirmingDelete(true)}
                  className="min-h-10 px-4 py-2 text-sm">
                  <Trash2 size={16} aria-hidden="true" /> Excluir livro
                </PrimaryButton>
                {/* A edição navega para o formulário responsável por carregar e salvar os dados e a capa. */}
                <PrimaryButton as={Link} to={`/livros/${book.id}/editar`} variant="outline" className="min-h-10 px-4 py-2 text-sm">
                  <Pencil size={16} aria-hidden="true" /> Editar livro
                </PrimaryButton>
                <PrimaryButton type="button" onClick={onClose} className="min-h-[38px] rounded-lg bg-[#596334] px-4 py-1.5 text-[13px] text-[#fffaf0] hover:bg-[#48522c] sm:min-h-10 sm:px-[22px] sm:py-[7px] sm:text-sm">
                  <ArrowLeft size={16} aria-hidden="true" /> Voltar ao acervo
                </PrimaryButton>
              </div>
            )}
          </div>
        </div>
      </div>
    </dialog>
  );
}
