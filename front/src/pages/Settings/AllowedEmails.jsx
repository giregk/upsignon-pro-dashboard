import React from 'react';
import { bankUrlFetch } from '../../helpers/urlFetch';
import { i18n } from '../../i18n/i18n';
import { isRestrictedSuperadmin } from '../../helpers/isRestrictedSuperadmin';
import { PasswordlessConfirmModal } from './PasswordlessConfirmModal';

// Props : setIsLoading, ssoEnabled, shamirConfigured, readOnly, tableRef, hideTitle, editablePasswordless
class AllowedEmails extends React.Component {
  state = {
    allowedEmails: [],
    isEditing: false,
    editingEmailId: null,
    updatedPattern: null,
    newEmailPasswordless: false,
    confirmPending: null, // { willEnable: boolean, onConfirm: function }
  };
  newInputRef = null;

  fetchAllowedEmails = async () => {
    try {
      const emails = await bankUrlFetch('/api/allowed-emails', 'GET', null);
      this.setState({ allowedEmails: emails });
    } catch (e) {
      console.error(e);
    }
  };

  submitAllowedEmailEdition = async () => {
    if (this.state.updatedPattern !== null) {
      try {
        this.props.setIsLoading(true);
        await bankUrlFetch('/api/update-allowed-email', 'POST', {
          allowedEmailId: this.state.editingEmailId,
          updatedPattern: this.state.updatedPattern.trim().toLowerCase(),
        });
        await this.fetchAllowedEmails();
      } catch (e) {
        console.error(e);
      } finally {
        this.props.setIsLoading(false);
      }
    }
    this.setState({ isEditing: false, editingEmailId: null, updatedPattern: null });
  };

  insertAllowedEmail = async () => {
    try {
      this.props.setIsLoading(true);
      const newPattern = this.newInputRef.value?.trim().toLowerCase();
      if (!newPattern) {
        this.newInputRef.style.borderColor = 'red';
        return;
      } else {
        this.newInputRef.style.borderColor = null;
      }
      await bankUrlFetch('/api/insert-allowed-email', 'POST', {
        newPattern,
        usesPasswordlessAuth: this.state.newEmailPasswordless,
      });
      await this.fetchAllowedEmails();
      this.newInputRef.value = null;
    } catch (e) {
      console.error(e);
    } finally {
      this.props.setIsLoading(false);
    }
  };

  deleteAllowedEmail = async (id) => {
    const confirmation = window.confirm(i18n.t('settings_allowed_emails_delete_warning'));
    if (confirmation) {
      try {
        this.props.setIsLoading(true);
        await bankUrlFetch(`/api/delete-allowed-email/${id}`, 'POST', null);
        await this.fetchAllowedEmails();
      } catch (e) {
        console.error(e);
      } finally {
        this.props.setIsLoading(false);
      }
    }
  };

  togglePasswordlessAuth = (ae) => {
    const willEnable = !ae.uses_passwordless_auth;
    this.setState({
      confirmPending: {
        willEnable,
        onConfirm: () => this._doTogglePasswordlessAuth(ae, willEnable),
      },
    });
  };

  _closeConfirmDialog = () => {
    document.getElementById('passwordless-confirm-dialog')?.close();
    this.setState({ confirmPending: null });
  };

  _doTogglePasswordlessAuth = async (ae, willEnable) => {
    this._closeConfirmDialog();
    try {
      this.props.setIsLoading(true);
      await bankUrlFetch('/api/toggle-passwordless-auth', 'POST', {
        allowedEmailId: ae.id,
        usesPasswordlessAuth: willEnable,
      });
      await this.fetchAllowedEmails();
    } catch (e) {
      console.error(e);
    } finally {
      this.props.setIsLoading(false);
    }
  };

  componentDidMount() {
    this.fetchAllowedEmails();
  }

  render() {
    const { readOnly, tableRef, ssoEnabled, shamirConfigured, editablePasswordless, hideTitle } =
      this.props;
    const { confirmPending } = this.state;
    const editColSpan = 1 + (ssoEnabled ? 1 : 0) + (!readOnly ? 1 : 0);
    return (
      <div style={{ marginTop: 50 }}>
        {confirmPending && (
          <PasswordlessConfirmModal
            id="passwordless-confirm-dialog"
            willEnable={confirmPending.willEnable}
            shamirConfigured={shamirConfigured}
            onConfirm={confirmPending.onConfirm}
            onCancel={this._closeConfirmDialog}
          />
        )}
        {!hideTitle && <h2>{i18n.t('settings_allowed_emails')}</h2>}
        {!readOnly && <div>{i18n.t('settings_allowed_emails_pattern')}</div>}
        {!readOnly && (
          <>
            <div style={{ marginTop: 20, fontWeight: 'bold' }}>
              {i18n.t('settings_allowed_emails_new')}
            </div>
            <div
              style={{
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 10,
                marginBottom: 20,
              }}
            >
              <input
                placeholder="*@domain.com"
                ref={(r) => {
                  this.newInputRef = r;
                }}
                disabled={isRestrictedSuperadmin}
              />
              {ssoEnabled && (
                <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <input
                    type="checkbox"
                    checked={this.state.newEmailPasswordless}
                    onChange={(e) => this.setState({ newEmailPasswordless: e.target.checked })}
                    disabled={isRestrictedSuperadmin}
                    style={{ cursor: !isRestrictedSuperadmin ? 'pointer' : 'default' }}
                  />
                  {i18n.t('settings_allowed_emails_passwordless_auth')}
                </label>
              )}
              <div
                className={`action ${isRestrictedSuperadmin ? 'disabledUI' : ''}`}
                onClick={this.insertAllowedEmail}
              >
                {i18n.t('add')}
              </div>
            </div>
          </>
        )}
        {this.state.allowedEmails.length > 0 && (
          <table ref={tableRef}>
            <thead>
              <tr>
                <th>{i18n.t('settings_allowed_emails_email_pattern')}</th>
                {ssoEnabled && (
                  <th style={{ whiteSpace: 'nowrap' }}>
                    {i18n.t('settings_allowed_emails_passwordless_auth')}
                  </th>
                )}
                {!readOnly && <th>{i18n.t('actions')}</th>}
              </tr>
            </thead>
            <tbody>
              {this.state.allowedEmails.map((ae) => {
                if (readOnly || this.state.editingEmailId !== ae.id || !this.state.isEditing) {
                  return (
                    <tr key={ae.id}>
                      <td
                        style={!readOnly ? { cursor: 'pointer' } : {}}
                        className={`${!readOnly && isRestrictedSuperadmin ? 'disabledUI' : ''}`}
                        onClick={
                          !readOnly
                            ? () =>
                                this.setState({
                                  isEditing: true,
                                  editingEmailId: ae.id,
                                  updatedPattern: ae.pattern,
                                })
                            : undefined
                        }
                      >
                        {ae.pattern}
                      </td>
                      {ssoEnabled && (
                        <td style={{ textAlign: 'center' }}>
                          <input
                            type="checkbox"
                            checked={!!ae.uses_passwordless_auth}
                            disabled={(readOnly && !editablePasswordless) || isRestrictedSuperadmin}
                            onChange={() => this.togglePasswordlessAuth(ae)}
                            style={{
                              cursor:
                                (!readOnly || editablePasswordless) && !isRestrictedSuperadmin
                                  ? 'pointer'
                                  : 'default',
                            }}
                          />
                        </td>
                      )}
                      {!readOnly && (
                        <td>
                          <div
                            className={`action ${isRestrictedSuperadmin ? 'disabledUI' : ''}`}
                            onClick={() => this.deleteAllowedEmail(ae.id)}
                          >
                            {i18n.t('delete')}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                } else {
                  return (
                    <tr key={`editing_${ae.id}`}>
                      <td colSpan={editColSpan}>
                        <div
                          style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}
                        >
                          <input
                            autoFocus
                            placeholder="*@domain.com"
                            value={this.state.updatedPattern}
                            onChange={(ev) => {
                              this.setState({ updatedPattern: ev.target.value });
                            }}
                            onBlur={() => {
                              // do make isEditing false but do not prevent onClick on validate
                              setTimeout(() => {
                                this.setState({ isEditing: false });
                              }, 150);
                            }}
                            disabled={isRestrictedSuperadmin}
                          />
                          <span
                            style={{ marginLeft: 20 }}
                            className={`action ${isRestrictedSuperadmin ? 'disabledUI' : ''}`}
                            onClick={() => this.submitAllowedEmailEdition()}
                          >
                            {i18n.t('validate')}
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                }
              })}
            </tbody>
          </table>
        )}
      </div>
    );
  }
}

export { AllowedEmails };
