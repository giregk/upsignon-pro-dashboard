import React from 'react';
import { baseUrlFetch, bankUrlFetch } from '../../helpers/urlFetch';
import { i18n } from '../../i18n/i18n';
import { isRestrictedSuperadmin } from '../../helpers/isRestrictedSuperadmin';

export class ServerRedirection extends React.Component {
  urlInputRef = null;
  state = {
    redirectionUrl: null,
  };
  fetchRedirectionUrl = async () => {
    try {
      const { redirectionUrl } = await bankUrlFetch('/api/redirection_url', 'GET', null);
      if (redirectionUrl) {
        this.setState({
          redirectionUrl: redirectionUrl,
        });
      }
    } catch (e) {
      console.error(e);
    }
  };
  componentDidMount() {
    this.fetchRedirectionUrl();
  }

  render() {
    if (this.state.redirectionUrl === null) {
      return null;
    }
    return (
      <div style={{ marginTop: 50 }}>
        <h2>{i18n.t('settings_server_redirection')}</h2>
        <div style={{ display: 'flex', marginBottom: 10 }}>
          <div style={{ marginRight: 20 }}>
            {i18n.t('settings_server_redirection_new_url_label')}
          </div>
          <strong>{this.state.redirectionUrl}</strong>
        </div>
      </div>
    );
  }
}
