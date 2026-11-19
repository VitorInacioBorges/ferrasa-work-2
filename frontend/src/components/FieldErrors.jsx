// Mostra as mensagens abaixo do campo e permite associá-las ao controle pelo id.
export default function FieldErrors({ id, messages }) {
  // Evita reservar espaço quando o campo não possui erros.
  if (!messages?.length) return null;
  return (
    // role="alert" anuncia as mensagens quando elas aparecem.
    <div id={id} role="alert" className="mt-1.5 text-sm text-red-800">
      {messages.map((message, index) => <p key={index}>{message}</p>)}
    </div>
  );
}
