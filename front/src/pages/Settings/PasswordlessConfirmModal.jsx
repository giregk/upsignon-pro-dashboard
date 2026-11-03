import { useEffect } from 'react';
import { Modal } from '../../helpers/Modal/Modal';
import { i18n } from '../../i18n/i18n';

// Props:
//   id               - identifiant unique du dialog HTML
//   willEnable       - boolean — true si on active l'auth passwordless
//   shamirConfigured - boolean — false déclenche un avertissement supplémentaire
//   onConfirm        - function — appelée au clic sur "Oui"
//   onCancel         - function — appelée au clic sur "Annuler" ou fermeture
export const PasswordlessConfirmModal = ({
  id,
  willEnable,
  shamirConfigured,
  onConfirm,
  onCancel,
}) => {
  const warning =
    willEnable && !shamirConfigured
      ? i18n.t('settings_allowed_emails_passwordless_auth_no_shamir_warning')
      : null;
  const message = i18n.t(
    willEnable
      ? 'settings_allowed_emails_passwordless_auth_enable_warning'
      : 'settings_allowed_emails_passwordless_auth_disable_warning',
  );

  useEffect(() => {
    document.getElementById(id)?.showModal();
  }, [id]);

  return (
    <Modal id={id} title={i18n.t('settings_allowed_emails_passwordless_auth')} onClosed={onCancel}>
      {warning && (
        <p style={{ whiteSpace: 'pre-wrap', color: '#c0392b', fontWeight: 'bold' }}>{warning}</p>
      )}
      <p style={{ whiteSpace: 'pre-wrap' }}>{message}</p>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
        <button className="whiteButton" onClick={onCancel}>
          {i18n.t('cancel')}
        </button>
        <button className="submitButton submitButtonAlt" onClick={onConfirm}>
          {willEnable ? i18n.t('activate') : i18n.t('deactivate')}
        </button>
      </div>
    </Modal>
  );
};
