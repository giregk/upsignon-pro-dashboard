import React from 'react';
import { bankUrlFetch } from '../../helpers/urlFetch';
import { i18n } from '../../i18n/i18n';
import { isRestrictedSuperadmin } from '../../helpers/isRestrictedSuperadmin';
import { MsEntraPasswordlessCheckbox } from './MsEntraPasswordlessCheckbox';

export class MicrosoftEntraConfig extends React.Component {
  state = {
    tenantId: '',
    clientId: '',
    clientSecret: '',
    appResourceId: '',
    testResult: null,
    msEntraAPIs: [], // {path: string, docLink: string}[]
  };
  testingEmailInputRef = null;

  fetchMSEntraConfig = async () => {
    try {
      const entraConfig = await bankUrlFetch('/api/bank-entra-config', 'GET', null);
      if (entraConfig) {
        this.setState({
          tenantId: entraConfig.tenantId || '',
          clientId: entraConfig.clientId || '',
          clientSecret: entraConfig.clientSecret || '',
          appResourceId: entraConfig.appResourceId || '',
        });
      }
    } catch (e) {
      console.error(e);
    }
  };
  fetchMSEntraAPIs = async () => {
    try {
      const apis = await bankUrlFetch('/api/list-ms-entra-apis', 'GET', null);
      this.setState({ msEntraAPIs: apis });
    } catch (e) {
      console.error(e);
    }
  };
  componentDidMount() {
    this.fetchMSEntraConfig();
    this.fetchMSEntraAPIs();
  }
  reloadMSEntraInstance = async (event) => {
    try {
      event.preventDefault();
      this.props.setIsLoading(true);
      await bankUrlFetch('/api/reload-ms-entra-instance', 'POST', null);
    } catch (e) {
      console.error(e);
    } finally {
      this.props.setIsLoading(false);
    }
  };

  submitNewEntraConfig = async (event) => {
    try {
      event.preventDefault();
      this.props.setIsLoading(true);
      const entraConfig = {
        tenantId: this.state.tenantId,
        clientId: this.state.clientId,
        clientSecret: this.state.clientSecret,
        appResourceId: this.state.appResourceId,
      };
      await bankUrlFetch('/api/bank-settings-update', 'POST', {
        msEntraConfig: entraConfig,
      });
    } catch (e) {
      console.error(e);
    } finally {
      this.props.setIsLoading(false);
    }
  };

  testConfigWithEmail = async (event) => {
    try {
      event.preventDefault();
      this.props.setIsLoading(true);
      this.setState({ testResult: null });
      const testRes = await bankUrlFetch('/api/test-ms-entra', 'POST', {
        email: this.testingEmailInputRef.value,
      });
      this.setState({ testResult: testRes });
    } catch (e) {
      console.error(e);
    } finally {
      this.props.setIsLoading(false);
    }
  };

  render() {
    const { ssoEnabled } = this.props;
    return (
      <div style={{ marginTop: 20 }}>
        <h2>{i18n.t('bank_setting_microsoft_entra_title')}</h2>
        <p>{i18n.t('bank_setting_microsoft_entra_pitch')}</p>
        <div style={{ marginBottom: 15 }}>
          <div
            style={{
              backgroundColor: 'rgb(240,240,240)',
              padding: 10,
              borderRadius: 5,
              display: 'inline-block',
            }}
          >
            {i18n.t('bank_setting_microsoft_entra_tuto')}
            <ol>
              <li>{i18n.t('bank_setting_microsoft_entra_tuto_step1')}</li>
              <li>
                {i18n.t('bank_setting_microsoft_entra_tuto_step2')}
                <ul>
                  <li>Microsoft Graph &gt; Autorisations d'application &gt; User.Read.All</li>
                  <li>
                    Microsoft Graph &gt; Autorisations d'application &gt; GroupMember.Read.All
                  </li>
                  <li>
                    Microsoft Graph &gt; Autorisations d'application &gt; Application.Read.All
                  </li>
                </ul>
              </li>
              <li>{i18n.t('bank_setting_microsoft_entra_tuto_step3')}</li>
              <li>{i18n.t('bank_setting_microsoft_entra_tuto_step4')}</li>
            </ol>
            <details>
              <summary>{i18n.t('bank_setting_microsoft_entra_api_list')}</summary>
              <ul>
                {this.state.msEntraAPIs.map((api) => (
                  <li key={api.path}>
                    <a href={api.docLink}>{api.path}</a>
                  </li>
                ))}
              </ul>
            </details>
          </div>
        </div>
        <form onSubmit={isRestrictedSuperadmin ? null : this.submitNewEntraConfig}>
          <label htmlFor="tenantId">{i18n.t('bank_setting_microsoft_entra_tenant_id_label')}</label>
          <br />
          <input
            id="tenantId"
            name="tenantId"
            type="text"
            autoComplete="off"
            onChange={(v) => {
              this.setState({ tenantId: v.target.value });
            }}
            value={this.state.tenantId}
            placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxx"
            style={{ minWidth: 350, marginBottom: 15 }}
            disabled={isRestrictedSuperadmin}
          />

          <br />
          <label htmlFor="clientId">{i18n.t('bank_setting_microsoft_entra_client_id_label')}</label>
          <br />
          <input
            id="clientId"
            name="clientId"
            type="text"
            autoComplete="off"
            onChange={(v) => {
              this.setState({ clientId: v.target.value });
            }}
            value={this.state.clientId}
            placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxx"
            style={{ minWidth: 350, marginBottom: 15 }}
            disabled={isRestrictedSuperadmin}
          />

          <br />
          <label htmlFor="appResourceId">
            {i18n.t('bank_setting_microsoft_entra_app_resource_id_label')}
          </label>
          <br />
          <span>⚠️⚠️ {i18n.t('bank_setting_microsoft_entra_app_resource_id_warning')}</span>
          <br />
          <input
            id="appResourceId"
            name="appResourceId"
            type="text"
            autoComplete="off"
            onChange={(v) => {
              this.setState({ appResourceId: v.target.value });
            }}
            value={this.state.appResourceId}
            placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxx"
            style={{ minWidth: 350, marginBottom: 15 }}
            disabled={isRestrictedSuperadmin}
          />

          <br />
          <label htmlFor="clientSecret">
            {i18n.t('bank_setting_microsoft_entra_client_secret_label')}
          </label>
          <br />
          <input
            id="clientSecret"
            name="clientSecret"
            type="password"
            autoComplete="off"
            onChange={(v) => {
              this.setState({ clientSecret: v.target.value });
            }}
            value={this.state.clientSecret}
            placeholder="xxxxxxx.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
            style={{ minWidth: 350, marginBottom: 15 }}
            disabled={isRestrictedSuperadmin}
          />

          <br />
          <input
            style={{ marginTop: 15 }}
            type="submit"
            value={i18n.t('bank_setting_microsoft_entra_apply_config')}
            disabled={isRestrictedSuperadmin}
          />
          <br />
          <input
            style={{ marginTop: 15 }}
            type="button"
            onClick={this.reloadMSEntraInstance}
            value={i18n.t('bank_setting_microsoft_entra_permissions_reloaded')}
            disabled={isRestrictedSuperadmin}
          />
        </form>
        <div style={{ marginTop: 20 }}>{i18n.t('bank_setting_microsoft_entra_testing')}</div>
        <div>⚠️⚠️ {i18n.t('bank_setting_microsoft_entra_test_warning')}</div>
        <form
          className={isRestrictedSuperadmin ? 'disabledUI' : null}
          onSubmit={this.testConfigWithEmail}
        >
          <input
            type="text"
            placeholder="prenom.nom@domaine.fr"
            autoComplete="off"
            ref={(r) => {
              this.testingEmailInputRef = r;
            }}
            required
            style={{ minWidth: 350, marginRight: 15 }}
          />
          <input type="submit" value={i18n.t('bank_setting_microsoft_entra_test_start')} />
        </form>
        {this.state.testResult != null && (
          <div>
            <div
              style={{
                backgroundColor: this.state.testResult.msUserId.value ? 'green' : 'red',
                padding: 5,
                color: 'white',
                margin: '5px 0',
              }}
            >
              <span style={{ marginRight: 5 }}>
                {i18n.t('bank_setting_microsoft_entra_test_user_id')}
              </span>
              <span>
                {this.state.testResult.msUserId.error || this.state.testResult.msUserId.value}
              </span>
            </div>
            <div
              style={{
                backgroundColor: this.state.testResult.isAuthorized.value ? 'green' : 'red',
                padding: 5,
                color: 'white',
                margin: '5px 0',
              }}
            >
              <span style={{ marginRight: 5 }}>
                {i18n.t('bank_setting_microsoft_entra_test_user_authorized')}
              </span>
              <span>
                {this.state.testResult.isAuthorized.error ||
                  (this.state.testResult.isAuthorized.value ? i18n.t('yes') : i18n.t('no'))}
              </span>
            </div>
            <div
              style={{
                backgroundColor: this.state.testResult.userGroups.error ? 'red' : 'green',
                padding: 5,
                color: 'white',
                margin: '5px 0',
              }}
            >
              <span style={{ marginRight: 5 }}>
                {i18n.t('bank_setting_microsoft_entra_test_user_banks')}
              </span>
              <span>
                {this.state.testResult.userGroups.error ||
                  this.state.testResult.userGroups.value
                    .map((g) => g.displayName || g.id)
                    .join(', ')}
              </span>
            </div>
            <div
              style={{
                backgroundColor: this.state.testResult.allUpSignOnUsers.value ? 'green' : 'red',
                padding: 5,
                color: 'white',
                margin: '5px 0',
              }}
            >
              <span style={{ marginRight: 5 }}>
                {i18n.t('bank_setting_microsoft_entra_test_all_users')}
              </span>
              <span>
                {this.state.testResult.allUpSignOnUsers.error ||
                  this.state.testResult.allUpSignOnUsers.value.map((u) => <div key={u}>{u}</div>)}
              </span>
            </div>
          </div>
        )}

        {ssoEnabled && (
          <div style={{ marginTop: 20, paddingTop: 20, borderTop: '1px solid grey' }}>
            <MsEntraPasswordlessCheckbox
              shamirConfigured={this.props.shamirConfigured}
              setIsLoading={this.props.setIsLoading}
            />
          </div>
        )}
      </div>
    );
  }
}
