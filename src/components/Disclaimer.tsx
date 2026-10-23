export const DISCLAIMER_TEXT =
  'Questa app non sostituisce il parere di un medico o di un preparatore atletico. Prima di iniziare un programma di allenamento, soprattutto in caso di patologie, gravidanza o infortuni, consulta un professionista. Se durante un esercizio senti dolore, vertigini o malessere, interrompi subito.';

export function DisclaimerNote() {
  return (
    <p className="disclaimer" role="note">
      <strong>⚠️ Attenzione:</strong> non sostituisce il parere di un medico o di un preparatore. In caso di dolore interrompi l’esercizio.
    </p>
  );
}

export function DisclaimerModal({ onAccept }: { onAccept: () => void }) {
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="disclaimer-title">
      <div className="modal">
        <h2 id="disclaimer-title">Prima di iniziare</h2>
        <p>{DISCLAIMER_TEXT}</p>
        <p>Ascolta il tuo corpo: puoi sempre mettere in pausa, saltare un esercizio o ridurre l’intensità.</p>
        <button className="btn btn-primary btn-block" onClick={onAccept} autoFocus>
          Ho capito
        </button>
      </div>
    </div>
  );
}
