import { useEffect, useId, useRef } from "react";
import { Upload } from "lucide-react";
import FieldErrors from "./FieldErrors.jsx";
import { PrimaryButton } from "./PrimaryButton.jsx";


// Permite selecionar uma capa e mostrar sua prévia, incluindo a imagem já salva durante a edição.
// O formulário pai recebe o arquivo e os erros pelo onChange e realiza o envio à API.
export default function ImageFileInput({ label, prompt, file, previewUrl, onChange, disabled, errors }) {
  const id = useId();
  // As refs permitem limpar o input nativo e atualizar a imagem da prévia.
  const fileInput = useRef(null);
  const preview = useRef(null);

  // Arquivos locais recebem uma URL temporária, liberada ao trocar a seleção ou desmontar.
  // Sem um arquivo novo, a prévia volta à capa já salva, quando disponível.
  useEffect(() => {
    if (!file) {
      if (preview.current) preview.current.src = previewUrl;
      return;
    }
    const url = URL.createObjectURL(file);
    preview.current.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file, previewUrl]);

  // Valida tipo, extensão e limite de 2 MB antes de disponibilizar o arquivo ao formulário.
  function selectFile(event) {
    const input = event.target;
    const selected = input.files[0];
    let error = "";
    if (selected && (!["image/jpeg", "image/png", "image/webp"].includes(selected.type) || !/\.(jpe?g|png|webp)$/i.test(selected.name))) {
      error = "Selecione uma imagem JPG, PNG ou WEBP.";
    } else if (selected?.size > 2 * 1024 * 1024) {
      error = "Selecione uma imagem de até 2 MB.";
    }
    // A validade nativa impede o envio de um arquivo inválido, e o pai exibe a mensagem abaixo do campo.
    input.setCustomValidity(error);
    onChange(error ? null : selected, error);
  }

  // Limpa a seleção e o erro local e permite escolher novamente o mesmo arquivo.
  // Na edição, essa ação descarta a troca pendente e volta a exibir a capa salva.
  function removeFile() {
    fileInput.current.value = "";
    fileInput.current.setCustomValidity("");
    onChange(null, "");
    fileInput.current.focus();
  }

  return (
    <div className="mx-auto w-full max-w-72">
      <label htmlFor={id} className="mb-4 block text-xl font-bold text-heading sm:text-2xl">{label}</label>
      <div className="relative flex min-h-60 flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed border-primary/80 p-5 text-center focus-within:outline-2 focus-within:outline-offset-4 focus-within:outline-primary md:aspect-[2/3]">
        {/* O input transparente cobre a área de seleção e mantém o seletor nativo de arquivos. */}
        <input ref={fileInput} id={id} name="cover" type="file" accept="image/jpeg,image/png,image/webp" disabled={disabled}
          aria-invalid={errors?.length ? true : undefined}
          aria-describedby={errors?.length ? `${id}-hint ${id}-errors` : `${id}-hint`} onChange={selectFile}
          className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0" />
        {file || previewUrl ? <img ref={preview} alt="Prévia da capa do livro" className="max-h-60 max-w-full object-contain" /> : <>
          <Upload size={44} strokeWidth={1.6} className="text-primary" aria-hidden="true" />
          <strong className="text-base text-heading sm:text-lg">{prompt}</strong>
          <span className="max-w-48 text-sm text-muted sm:text-base">Clique para selecionar uma imagem</span>
        </>}
        {/* A aparência do botão acompanha o estado da seleção, e o input sobreposto recebe o clique. */}
        <PrimaryButton as="span" variant="outline" className="mt-3 px-4 py-2 text-sm sm:text-base">
          {file || previewUrl ? "Trocar arquivo" : "Selecionar arquivo"}
        </PrimaryButton>
        {/* A remoção fica acima do input sobreposto para receber o clique sem abrir o seletor. */}
        {(file || errors?.length > 0) && (
          <PrimaryButton type="button" onClick={removeFile} disabled={disabled}
            className="relative z-20 rounded px-3 py-2 disabled:opacity-60">
            Remover imagem
          </PrimaryButton>
        )}
      </div>
      <FieldErrors id={`${id}-errors`} messages={errors} />
      <p id={`${id}-hint`} className="mt-3 text-center text-sm text-muted">JPG, PNG ou WEBP · Até 2 MB<br /><em>Opcional</em></p>
    </div>
  );
}
