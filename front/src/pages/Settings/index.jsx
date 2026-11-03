import React from 'react';
import { i18n } from '../../i18n/i18n';
import { bankUrlFetch } from '../../helpers/urlFetch';
import { AllowedEmails } from './AllowedEmails';
import { BankAdmins } from './BankAdmins';
import { OtherSettings } from './OtherSettings';
import { ProSetupLink } from './ProSetupLink';
import { Urls } from './Urls';
import { ServerRedirection } from './ServerRedirection';
import { MicrosoftEntraConfig } from './MicrosoftEntraConfig';
import { OpenidConfiguration } from './OpenidConfiguration';
import '../../helpers/tabs.css';
import { ShamirTab } from './shamir/ShamirTab';

// Props setIsLoading, isSuperAdmin, otherBanks
class Settings extends React.Component {
  state = {
    activeTab: 'setup', // 'setup', 'options', 'admins', 'sso', 'emails_slo', 'urls', 'shamir'
    ssoEnabled: false,
    shamirConfigured: false,
  };

  fetchSSOConfig = async () => {
    try {
      const { openidConfigs } = await bankUrlFetch('/api/sso_configurations', 'GET', null);
      this.setState({ ssoEnabled: !!(openidConfigs && openidConfigs.length > 0) });
    } catch (e) {
      console.error(e);
    }
  };

  fetchShamirState = async () => {
    try {
      const { configs } = await bankUrlFetch('/api/shamir-configs', 'POST', null);
      this.setState({ shamirConfigured: !!(configs && configs.some((c) => c.isActive)) });
    } catch (e) {
      console.error(e);
    }
  };

  componentDidMount() {
    this.fetchSSOConfig();
    this.fetchShamirState();
  }

  setActiveTab = (tabName) => {
    this.setState({ activeTab: tabName });
  };

  render() {
    const { activeTab, ssoEnabled, shamirConfigured } = this.state;

    return (
      <div className="page">
        <h1>{i18n.t('menu_settings')}</h1>
        {/* Navigation par onglets */}
        <div className="tabs-navigation">
          <button
            className={`tab-button ${activeTab === 'setup' ? 'active' : ''}`}
            onClick={() => this.setActiveTab('setup')}
          >
            {i18n.t('settings_tab_setup')}
          </button>
          <button
            className={`tab-button ${activeTab === 'options' ? 'active' : ''}`}
            onClick={() => this.setActiveTab('options')}
          >
            {i18n.t('settings_tab_options')}
          </button>
          <button
            className={`tab-button ${activeTab === 'shamir' ? 'active' : ''}`}
            onClick={() => this.setActiveTab('shamir')}
          >
            {i18n.t('settings_tab_shamir')}
          </button>
          <button
            className={`tab-button ${activeTab === 'admins' ? 'active' : ''}`}
            onClick={() => this.setActiveTab('admins')}
          >
            {i18n.t('settings_tab_admins')}
          </button>
          <button
            className={`tab-button ${activeTab === 'sso' ? 'active' : ''}`}
            onClick={() => this.setActiveTab('sso')}
          >
            {i18n.t('settings_tab_sso')}
          </button>
          <button
            className={`tab-button ${activeTab === 'emails_slo' ? 'active' : ''}`}
            onClick={() => this.setActiveTab('emails_slo')}
          >
            {i18n.t('settings_tab_emails_slo')}
          </button>
          <button
            className={`tab-button ${activeTab === 'urls' ? 'active' : ''}`}
            onClick={() => this.setActiveTab('urls')}
          >
            {i18n.t('settings_tab_urls')}
          </button>
        </div>

        {/* Contenu des onglets */}
        <div className="tab-content">
          {activeTab === 'setup' && (
            <div>
              <ProSetupLink />
              <ServerRedirection />
            </div>
          )}

          {activeTab === 'options' && <OtherSettings setIsLoading={this.props.setIsLoading} />}

          {activeTab === 'admins' && <BankAdmins setIsLoading={this.props.setIsLoading} />}
          {activeTab === 'shamir' && (
            <ShamirTab
              setIsLoading={this.props.setIsLoading}
              onConfigsLoaded={(configs) =>
                this.setState({ shamirConfigured: !!(configs && configs.some((c) => c.isActive)) })
              }
            />
          )}

          {activeTab === 'sso' && (
            <div>
              <OpenidConfiguration
                setIsLoading={this.props.setIsLoading}
                shamirConfigured={shamirConfigured}
                onSSOChanged={(isEnabled) => this.setState({ ssoEnabled: isEnabled })}
              />
            </div>
          )}

          {activeTab === 'emails_slo' && (
            <div>
              <div
                style={{
                  background: '#f0f4ff',
                  border: '1px solid #c5d0e6',
                  borderRadius: 6,
                  padding: '16px 20px',
                  marginBottom: 24,
                  marginTop: 20,
                }}
              >
                <p style={{ margin: 0, whiteSpace: 'pre-line' }}>
                  {i18n.t('settings_emails_slo_preamble')}
                </p>
              </div>
              <AllowedEmails
                setIsLoading={this.props.setIsLoading}
                ssoEnabled={ssoEnabled}
                shamirConfigured={shamirConfigured}
              />
              <MicrosoftEntraConfig
                setIsLoading={this.props.setIsLoading}
                ssoEnabled={ssoEnabled}
                shamirConfigured={shamirConfigured}
              />
            </div>
          )}

          {activeTab === 'urls' && (
            <Urls
              setIsLoading={this.props.setIsLoading}
              isSuperAdmin={this.props.isSuperAdmin}
              otherBanks={this.props.otherBanks}
            />
          )}
        </div>
      </div>
    );
  }
}

export { Settings };
