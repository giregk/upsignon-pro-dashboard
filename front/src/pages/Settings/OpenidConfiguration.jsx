import React, { useState, useEffect } from 'react';
import { baseUrlFetch, bankUrlFetch } from '../../helpers/urlFetch';
import { i18n } from '../../i18n/i18n';
import './OpenidConfiguration.css';
import { Loader } from '../../helpers/loader';
import { isRestrictedSuperadmin } from '../../helpers/isRestrictedSuperadmin';
import { toast } from 'react-toastify';
import { AllowedEmails } from './AllowedEmails';
import { MsEntraPasswordlessCheckbox } from './MsEntraPasswordlessCheckbox';
import { Modal } from '../../helpers/Modal/Modal';

// Windows Logo Component
const WindowsLogo = () => (
  <svg width="16" height="16" viewBox="0 0 21 21" style={{ marginRight: '5px' }}>
    <path fill="#0078D4" d="M0 0h9.5v9.5H0z" />
    <path fill="#0078D4" d="M10.5 0H20v9.5h-9.5z" />
    <path fill="#0078D4" d="M0 10.5h9.5V20H0z" />
    <path fill="#0078D4" d="M10.5 10.5H20V20h-9.5z" />
  </svg>
);

// Check Icon Component (white check mark on green circle)
const CheckIcon = ({ size = 24 }) => (
  <svg className="check-icon-container" width={size} height={size} viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="10" fill="#4CAF50" />
    <path
      d="M9.75 15.4L6.25 11.9l-1.15 1.15L9.75 17.7 19.05 8.4l-1.15-1.15L9.75 15.4z"
      fill="white"
      strokeWidth="0.5"
    />
  </svg>
);

// Props : setIsLoading, onSSOChanged, shamirConfigured
export class OpenidConfiguration extends React.Component {
  state = {
    openidConfig: null,
    choice: 'none', // none | microsoft | custom
    confirmDisableSSOPending: false,
  };

  lock = false;

  fetchBankSSOConfig = async () => {
    try {
      this.props.setIsLoading(true);
      const { openidConfigs } = await bankUrlFetch('/api/sso_configurations', 'GET', null);
      if (openidConfigs && openidConfigs[0]) {
        this.setState({
          openidConfig: openidConfigs[0],
          choice: openidConfigs[0].configType,
        });
        this.props.onSSOChanged?.(true);
      } else {
        this.setState({
          openidConfig: null,
          choice: 'none',
        });
        this.props.onSSOChanged?.(false);
      }
    } catch (e) {
      console.error(e);
    } finally {
      this.props.setIsLoading(false);
    }
  };
  addBankSSOConfig = async (configType, configUrl, clientId) => {
    try {
      if (this.lock) {
        return;
      }
      this.lock = true;
      this.props.setIsLoading(true);

      // Validation de l'URL avant envoi de la requête
      if (configUrl && configType === 'custom') {
        try {
          const url = new URL(configUrl);
          if (!url.protocol.startsWith('http')) {
            toast.warn(i18n.t('settings_openid_invalid_url_protocol'));
            return;
          }
        } catch (error) {
          toast.error(i18n.t('settings_openid_invalid_url'));
          return;
        }
      }

      await bankUrlFetch('/api/add_sso_configuration', 'POST', {
        configType,
        configUrl,
        clientId,
      });
      await this.fetchBankSSOConfig();
    } catch (e) {
      console.error(e);
    } finally {
      this.props.setIsLoading(false);
      this.lock = false;
    }
  };
  deleteBankSSOConfig = async (configId) => {
    try {
      if (this.lock) {
        return;
      }
      this.lock = true;
      this.props.setIsLoading(true);
      await bankUrlFetch('/api/delete_sso_configuration', 'POST', {
        configId,
      });
      await this.fetchBankSSOConfig();
    } catch (e) {
      console.error(e);
    } finally {
      this.props.setIsLoading(false);
      this.lock = false;
    }
  };

  componentDidMount() {
    this.fetchBankSSOConfig();
  }

  onSelectNone = () => {
    const hasValueConfigured = this.state.openidConfig != null;
    if (hasValueConfigured) {
      this.setState({ confirmDisableSSOPending: true }, () =>
        document.getElementById('disable-sso-confirm-dialog')?.showModal(),
      );
    } else {
      this.setState({ openidConfig: null, choice: 'none' });
    }
  };

  _closeDisableSSODialog = () => {
    document.getElementById('disable-sso-confirm-dialog')?.close();
    this.setState({ confirmDisableSSOPending: false });
  };

  _doDisableSSO = async () => {
    this._closeDisableSSODialog();
    await this.deleteBankSSOConfig(this.state.openidConfig.id);
  };
  onSelectMicrosoft = async () => {
    const hasValueConfigured = this.state.openidConfig != null;
    if (hasValueConfigured) {
      const confirmation = window.confirm(i18n.t('settings_openid_confirm_erase_previous_config'));
      if (!confirmation) {
        return;
      }
      await this.deleteBankSSOConfig(this.state.openidConfig.id);
    }
    await this.addBankSSOConfig('microsoft');
  };
  onSelectCustom = async () => {
    const hasValueConfigured = this.state.openidConfig != null;
    if (hasValueConfigured) {
      const confirmation = window.confirm(i18n.t('settings_openid_confirm_erase_previous_config'));
      if (!confirmation) {
        return;
      }
    }
    this.setState({ choice: 'custom', openidConfig: null });
  };
  submitCustomConfig = async (configUrl, clientId) => {
    // Only delete the bank SSO config when the full config is available to prevent issues
    // with misconfigured SSO leading users to go back to password auth.
    if (this.state.openidConfig) await this.deleteBankSSOConfig(this.state.openidConfig.id);
    await this.addBankSSOConfig('custom', configUrl, clientId);
  };

  render() {
    const ssoEnabled = this.state.choice !== 'none';
    return (
      <div style={{ marginTop: 50 }}>
        {this.state.confirmDisableSSOPending && (
          <Modal
            id="disable-sso-confirm-dialog"
            title={i18n.t('settings_openid_disable_sso')}
            onClosed={this._closeDisableSSODialog}
          >
            <p style={{ whiteSpace: 'pre-wrap', color: '#c0392b', fontWeight: 'bold' }}>
              {i18n.t('settings_openid_disable_warning')}
            </p>
            <p style={{ whiteSpace: 'pre-wrap' }}>
              {i18n.t('settings_openid_confirm_erase_previous_config')}
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
              <button className="whiteButton" onClick={this._closeDisableSSODialog}>
                {i18n.t('cancel')}
              </button>
              <button className="submitButton submitButtonAlt" onClick={this._doDisableSSO}>
                {i18n.t('yes')}
              </button>
            </div>
          </Modal>
        )}
        <h2>{i18n.t('settings_openid_config')}</h2>
        <p>{i18n.t('settings_openid_config_pitch')}</p>
        <div
          style={{
            background: '#f5f5f5',
            border: '1px solid #ddd',
            borderRadius: 6,
            padding: '16px 20px',
            marginBottom: 24,
          }}
        >
          <p style={{ margin: 0 }}>
            <strong>{i18n.t('settings_openid_config_pitch_mode1')}</strong>{' '}
            {i18n.t('settings_openid_config_details')}
          </p>
          <br />
          <p style={{ margin: 0 }}>
            <strong>{i18n.t('settings_openid_config_pitch_mode2')}</strong>{' '}
            {i18n.t('settings_sso_slo_message')}
          </p>
        </div>
        <div className={isRestrictedSuperadmin ? 'disabledUI' : null}>
          <NoSSOChoice
            value="none"
            name={i18n.t('settings_openid_unset')}
            onSelect={this.onSelectNone}
            isSelected={this.state.choice === 'none'}
          />
          <PreconfiguredSSOProvider
            value="microsoft"
            name="Microsoft"
            onSelect={this.onSelectMicrosoft}
            isSelected={this.state.choice === 'microsoft'}
            logo={<WindowsLogo />}
          />
          <CustomSSOProvider
            value="custom"
            onSelect={this.onSelectCustom}
            onValidateAddConfig={this.submitCustomConfig}
            isSelected={this.state.choice === 'custom'}
            currentConfig={this.state.openidConfig}
          />
        </div>
        {ssoEnabled && (
          <div style={{ marginTop: 40 }}>
            <h2>{i18n.t('settings_passwordless_section_title')}</h2>

            <AllowedEmails
              setIsLoading={this.props.setIsLoading}
              ssoEnabled={true}
              shamirConfigured={this.props.shamirConfigured}
              editablePasswordless={true}
              readOnly={true}
              hideTitle={true}
            />

            <div style={{ marginTop: 30 }}>
              <MsEntraPasswordlessCheckbox
                shamirConfigured={this.props.shamirConfigured}
                setIsLoading={this.props.setIsLoading}
              />
            </div>
          </div>
        )}
      </div>
    );
  }
}

class NoSSOChoice extends React.Component {
  render() {
    const { value, name, onSelect, isSelected } = this.props;
    return (
      <div className="ssoChoiceInputContainer">
        <input
          type="radio"
          id={value}
          name="ssoChoice"
          value={value}
          checked={isSelected}
          onChange={onSelect}
        />
        <label htmlFor={value} className="ssoChoiceContainerLabel">
          {name}
        </label>
      </div>
    );
  }
}
class PreconfiguredSSOProvider extends React.Component {
  render() {
    const { value, name, onSelect, isSelected, logo } = this.props;
    return (
      <div className="ssoChoiceInputContainer">
        <input
          type="radio"
          id={value}
          name="ssoChoice"
          value={value}
          checked={isSelected}
          onChange={onSelect}
        />
        <label htmlFor={value} className="ssoChoiceContainerLabel">
          {logo && <span className="provider-logo">{logo}</span>}
          {name}
        </label>
        {isSelected && <CheckIcon size={20} />}
      </div>
    );
  }
}

const CustomSSOProvider = (p) => {
  const { value, onSelect, onValidateAddConfig, isSelected, currentConfig } = p;
  const [configUrl, setConfigUrl] = useState(currentConfig?.configUrl || '');
  const [clientId, setClientId] = useState(currentConfig?.clientId || '');

  useEffect(() => {
    setConfigUrl(currentConfig?.configUrl || '');
    setClientId(currentConfig?.clientId || '');
  }, [currentConfig]);

  const hasUrlEdition = configUrl != currentConfig?.configUrl;
  const hasClientIdEdition = clientId != currentConfig?.clientId;
  const hasEdition = hasUrlEdition || hasClientIdEdition;
  const canSubmit = !!configUrl && !!clientId;
  return (
    <div>
      <div className="ssoChoiceInputContainer">
        <input
          type="radio"
          id={value}
          name="ssoChoice"
          value={value}
          checked={isSelected}
          onChange={onSelect}
        />
        <label htmlFor={value} className="ssoChoiceContainerLabel">
          {i18n.t('settings_openid_custom_config')}
        </label>
      </div>
      {isSelected && (
        <div className="customConfigContainer">
          <label htmlFor="custom_sso_config_url">
            {i18n.t('settings_openid_custom_config_url')}
          </label>
          <div className="customConfigInputUrlContainer">
            <input
              id="custom_sso_config_url"
              type="url"
              placeholder="https://login.microsoftonline.com/septeo.com/v2.0/.well-known/openid-configuration"
              value={configUrl}
              onChange={(ev) => setConfigUrl(ev.target.value)}
              autoComplete="off"
            />
            {!hasUrlEdition && !!currentConfig?.configUrl && <CheckIcon size={20} />}
          </div>
          <label htmlFor="custom_sso_config_client_id">
            {i18n.t('settings_openid_custom_config_client_id')}
          </label>
          <div className="customConfigInputClientIdContainer">
            <input
              id="custom_sso_config_client_id"
              type="text"
              placeholder="a58bc65d-c84f-4526-9057-6d7722ff8593"
              value={clientId}
              onChange={(ev) => setClientId(ev.target.value)}
              autoComplete="off"
            />
            {!hasClientIdEdition && !!currentConfig?.clientId && <CheckIcon size={20} />}
          </div>
          {hasEdition && (
            <button
              className="customConfigSubmit"
              onClick={() => onValidateAddConfig(configUrl, clientId)}
              disabled={!canSubmit}
            >
              {i18n.t('settings_openid_custom_config_submit')}
            </button>
          )}
        </div>
      )}
    </div>
  );
};
