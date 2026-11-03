import React, { useState, useEffect } from 'react';
import { bankUrlFetch } from '../../helpers/urlFetch';
import { i18n } from '../../i18n/i18n';
import { isRestrictedSuperadmin } from '../../helpers/isRestrictedSuperadmin';
import { PasswordlessConfirmModal } from './PasswordlessConfirmModal';

const DIALOG_ID = 'ms-entra-passwordless-confirm-dialog';

// Props: shamirConfigured, setIsLoading
export const MsEntraPasswordlessCheckbox = ({ shamirConfigured, setIsLoading }) => {
  const [checked, setChecked] = useState(false);
  const [confirmPending, setConfirmPending] = useState(null);

  useEffect(() => {
    bankUrlFetch('/api/bank-entra-config', 'GET', null)
      .then((config) => setChecked(!!config?.msEntraVaultsPasswordlessAuth))
      .catch(console.error);
  }, []);

  const handleChange = () => {
    setConfirmPending({ willEnable: !checked });
  };

  const handleConfirm = async () => {
    document.getElementById(DIALOG_ID).close();
    const { willEnable } = confirmPending;
    setConfirmPending(null);
    try {
      setIsLoading(true);
      await bankUrlFetch('/api/bank-settings-update', 'POST', {
        msEntraVaultsPasswordlessAuth: willEnable,
      });
      setChecked(willEnable);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    document.getElementById(DIALOG_ID).close();
    setConfirmPending(null);
  };

  return (
    <div style={{ marginTop: 16 }}>
      {confirmPending && (
        <PasswordlessConfirmModal
          id={DIALOG_ID}
          willEnable={confirmPending.willEnable}
          shamirConfigured={shamirConfigured}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      )}
      <label
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          cursor: !isRestrictedSuperadmin ? 'pointer' : 'default',
        }}
      >
        <input
          type="checkbox"
          checked={checked}
          disabled={isRestrictedSuperadmin}
          onChange={handleChange}
          style={{ cursor: !isRestrictedSuperadmin ? 'pointer' : 'default' }}
        />
        {i18n.t('bank_setting_microsoft_entra_passwordless_auth_label')}
      </label>
      <div style={{ color: '#555', fontSize: '0.9em', marginTop: 4, maxWidth: 500 }}>
        {i18n.t('bank_setting_microsoft_entra_passwordless_auth_conflict_info')}
      </div>
    </div>
  );
};
