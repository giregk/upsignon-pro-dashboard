import './Modal.css';
import { CloseIcon } from '../icons/CloseIcon';

export const Modal = (p) => {
  const { id, title, children, onClosed } = p;
  const pressClose = () => {
    document.getElementById(id).close();
    onClosed?.call();
  };
  const handleCancel = () => {
    onClosed?.call();
  };
  return (
    <dialog id={id} className="customModal" onCancel={handleCancel}>
      <div className="modalHeader">
        <h2>{title}</h2>
        <button className="modalCloseButton" onClick={pressClose}>
          <CloseIcon size={20} />
        </button>
      </div>
      {children}
    </dialog>
  );
};
