import React from 'react';
import { EditableCell } from '../../helpers/EditableCell';
import { bankFrontUrl } from '../../helpers/env';
import { bankUrlFetch } from '../../helpers/urlFetch';
import { PaginationBar } from '../../helpers/paginationBar';
import { i18n } from '../../i18n/i18n';
import { UserDevices } from './UserDevices';
import './users.css';
import { Toggler } from '../../helpers/Toggler';
import { Modal } from '../../helpers/Modal/Modal';
import { getDateBack1Month, getDateBack2Weeks } from '../../helpers/dateHelper';
import { StatsCell } from '../../helpers/statsCell';
import { settingsConfig } from '../../helpers/settingsConfig';
import { isRestrictedSuperadmin } from '../../helpers/isRestrictedSuperadmin';
import { toast } from 'react-toastify';
import { Tooltip } from 'react-tooltip';

const maxRenderedItems = 50;

// Props = setIsLoading, totalCount
class Users extends React.Component {
  searchInput = null;

  state = {
    userCount: 0,
    users: [],
    limit: maxRenderedItems,
    pageIndex: 1,
    sortingType: 0,
    showAllSettings: false,
    showUserSettings: {},
    pendingArchiveAction: null,
  };
  getCurrentQueryParameters = () => {
    const queryParamsArray = window.location.search
      .replace(/^\?/, '')
      .split('&')
      .map((p) => p.split('='));
    const queryParams = {};
    queryParamsArray.forEach((qp) => {
      if (qp.length === 2) queryParams[qp[0]] = qp[1];
    });
    return queryParams;
  };
  loadUsers = async () => {
    try {
      this.props.setIsLoading(true);
      const queryParams = this.getCurrentQueryParameters();
      const limit = parseInt(queryParams.limit, 10) || maxRenderedItems;
      const pageIndex = parseInt(queryParams.pageIndex, 10) || 1;
      const sortingType = parseInt(queryParams.sortingType, 10) || 0;
      const { users, userCount } = await bankUrlFetch(
        `/api/users?pageIndex=${pageIndex}&limit=${limit}&sortingType=${sortingType}`,
        'GET',
        null,
      );
      this.setState({ users, userCount, limit, pageIndex, sortingType });
    } catch (e) {
      console.error(e);
    } finally {
      this.props.setIsLoading(false);
    }
  };

  deleteUserWithWarning = async (userId, userEmail) => {
    try {
      this.props.setIsLoading(true);

      // Check if user is a shareholder in any Shamir config
      const shamirCheck = await bankUrlFetch(
        `/api/check-user-shamir-involvement/${userId}`,
        'POST',
        null,
      );
      const configNames = shamirCheck.impactedConfigs?.map((c) => `${c.bankName} - ${c.name}`).join(', ') || '';

      let confirmationMessage = i18n.t('user_delete_warning', { email: userEmail });

      if (shamirCheck.isShareholder) {
        if (!shamirCheck.canDelete) {
          // User is a shareholder and deletion would break consensus - FORBIDDEN
          alert(
            i18n.t('user_delete_shamir_forbidden', {
              email: userEmail,
              configs: configNames,
            }),
          );
          return;
        } else {
          confirmationMessage = i18n.t('user_delete_shamir_warning', {
            email: userEmail,
            configs: configNames,
          });
        }
      }

      const confirmation = window.confirm(confirmationMessage);
      if (confirmation) {
        await bankUrlFetch(`/api/delete-user/${userId}`, 'POST', null);
        await this.loadUsers();
      }
    } catch (e) {
      console.error(e);
      toast.error(i18n.t('user_delete_error'));
    } finally {
      this.props.setIsLoading(false);
    }
  };
  reactivateUser = async (userId) => {
    try {
      this.props.setIsLoading(true);
      await bankUrlFetch(`/api/reactivate-user/${userId}`, 'POST', null);
      await this.loadUsers();
    } catch (e) {
      console.error(e);
    } finally {
      this.props.setIsLoading(false);
    }
  };
  deactivateUser = async (userId) => {
    try {
      this.props.setIsLoading(true);
      await bankUrlFetch(`/api/deactivate-user/${userId}`, 'POST', null);
      await this.loadUsers();
    } catch (e) {
      console.error(e);
    } finally {
      this.props.setIsLoading(false);
    }
  };

  openArchiveConfirmModal = (type, userId, email) => {
    this.setState({ pendingArchiveAction: { type, userId, email } });
    document.getElementById('archiveConfirmModal').showModal();
  };
  closeArchiveConfirmModal = () => {
    document.getElementById('archiveConfirmModal').close();
    this.setState({ pendingArchiveAction: null });
  };
  confirmArchiveAction = async () => {
    const { pendingArchiveAction } = this.state;
    if (!pendingArchiveAction) return;
    document.getElementById('archiveConfirmModal').close();
    try {
      this.props.setIsLoading(true);
      await bankUrlFetch(
        `/api/${pendingArchiveAction.type}-user/${pendingArchiveAction.userId}`,
        'POST',
        null,
      );
      await this.loadUsers();
    } catch (e) {
      console.error(e);
      toast.error(
        i18n.t(
          pendingArchiveAction.type === 'unarchive'
            ? 'user_unarchive_error'
            : 'user_archive_error',
        ),
      );
    } finally {
      this.setState({ pendingArchiveAction: null });
      this.props.setIsLoading(false);
    }
  };

  loadUserDevices = async (userId) => {
    try {
      this.props.setIsLoading(true);
      const devices = await bankUrlFetch(`/api/user-devices/${userId}`, 'GET', null);
      this.setState((s) => {
        return {
          ...s,
          users: s.users.map((u) => {
            if (u.user_id === userId) {
              return { ...u, devices };
            } else {
              return u;
            }
          }),
        };
      });
    } catch (e) {
      console.error(e);
    } finally {
      this.props.setIsLoading(false);
    }
  };
  closeUserDevices = async (userId) => {
    this.setState((s) => {
      return {
        ...s,
        users: s.users.map((u) => {
          if (u.user_id === userId) {
            return { ...u, devices: undefined };
          } else {
            return u;
          }
        }),
      };
    });
  };

  componentDidMount() {
    this.loadUsers();
  }

  goToPageIndex = (p) => {
    window.location.href = `${bankFrontUrl}/users/?limit=${this.state.limit}&pageIndex=${p}&sortingType=${this.state.sortingType}`;
  };
  toggleSorting = (sortType) => {
    window.location.href = `${bankFrontUrl}/users/?limit=${this.state.limit}&pageIndex=${this.state.pageIndex}&sortingType=${sortType}`;
  };

  onSearch = async (ev) => {
    const searchText = ev.target.value;
    // if search is emptied, reload all
    if (!searchText) {
      return this.loadUsers();
    }
    try {
      this.props.setIsLoading(true);
      const limit = 50;
      const pageIndex = 1;
      const { users, userCount } = await bankUrlFetch(
        `/api/users?search=${searchText}&pageIndex=${pageIndex}&limit=${limit}&sortingType=${this.state.sortingType}`,
        'GET',
        null,
      );
      this.setState({ users, userCount, limit, pageIndex });
    } catch (e) {
      console.error(e);
    } finally {
      this.props.setIsLoading(false);
    }
  };

  onChangeEmail = async (userId, oldEmail, newEmail) => {
    if (oldEmail !== newEmail) {
      const confirmation = window.confirm(
        i18n.t('user_change_email_confirm', { oldEmail, newEmail }),
      );
      if (confirmation) {
        try {
          await bankUrlFetch('/api/update-user-email', 'POST', { userId, oldEmail, newEmail });
          this.setState((s) => ({
            ...s,
            users: s.users.map((u) => {
              if (u.user_id === userId) {
                return { ...u, email: newEmail };
              } else {
                return u;
              }
            }),
          }));
        } catch (e) {
          console.error(e);
          toast.error(i18n.t('user_email_already_used_or_not_authorized', { email: newEmail }));
        }
      }
    }
  };

  toggleUserSettingOverride = async (userId, settingName) => {
    try {
      this.props.setIsLoading(true);
      if (
        settingName === 'allowed_offline_desktop' ||
        settingName === 'allowed_offline_mobile' ||
        settingName === 'allowed_to_export'
      ) {
        // DEPRECATED -> move to users.settings_override
        const currentValue = this.state.users.find((u) => u.user_id === userId)[settingName];
        var nextValue;
        if (currentValue == null) {
          nextValue = false;
        } else if (currentValue === false) {
          nextValue = true;
        } else {
          nextValue = null;
        }
        await bankUrlFetch(`/api/update-user-setting`, 'POST', {
          userId,
          [settingName]: nextValue,
        });
        this.setState((s) => ({
          ...s,
          users: s.users.map((u) => {
            if (u.user_id === userId) {
              return {
                ...u,
                [settingName]: nextValue,
              };
            } else {
              return u;
            }
          }),
        }));
      } else {
        const userSettings = this.state.users.find((u) => u.user_id === userId)?.settings_override;
        var nextVal;
        if (userSettings[settingName] == null) {
          nextVal = false;
        } else if (userSettings[settingName] === false) {
          nextVal = true;
        } else {
          nextVal = null;
        }
        const newUserSettings = { ...userSettings, [settingName]: nextVal };
        if (nextVal == null) {
          delete newUserSettings[settingName];
        }
        await bankUrlFetch(`/api/update-user-setting`, 'POST', {
          userId,
          settings_override: newUserSettings,
        });
        this.setState((s) => ({
          ...s,
          users: s.users.map((u) => {
            if (u.user_id === userId) {
              return {
                ...u,
                settings_override: newUserSettings,
              };
            } else {
              return u;
            }
          }),
        }));
      }
    } catch (e) {
      console.error(e);
    } finally {
      this.props.setIsLoading(false);
    }
  };

  toggleAllSettings = () => {
    this.setState((s) => {
      if (s.showAllSettings) {
        return { ...s, showAllSettings: false, showUserSettings: {} };
      }
      return { ...s, showAllSettings: true };
    });
  };
  toggleShowUserSettings = (userId) => {
    this.setState((s) => {
      return { ...s, showUserSettings: { [userId]: !s.showUserSettings[userId] } };
    });
  };

  render() {
    const searchInputStyle = { width: 200 };
    if (this.state.users.length === 0 && !!this.searchInput?.value) {
      searchInputStyle.borderColor = 'red';
    } else if (this.state.users.length === 1 && !!this.searchInput?.value) {
      searchInputStyle.borderColor = 'green';
    }
    const { pendingArchiveAction } = this.state;
    const isUnarchiving = pendingArchiveAction?.type === 'unarchive';
    return (
      <>
      <div className="page">
        <h1>{`${i18n.t('menu_users')} - ${i18n.t('total_count', {
          count: this.props.totalCount,
        })}`}</h1>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            <div>{i18n.t('user_search')}</div>
            <input
              ref={(r) => (this.searchInput = r)}
              type="search"
              style={searchInputStyle}
              placeholder={i18n.t('user_search_placeholder')}
              onChange={this.onSearch}
            />
          </div>
          <Toggler
            choices={[
              {
                key: 0,
                title: i18n.t('user_sort_by_vuln'),
                isCurrent: this.state.sortingType === 0,
              },
              {
                key: 1,
                title: i18n.t('user_sort_by_time'),
                isCurrent: this.state.sortingType === 1,
              },
              {
                key: 2,
                title: i18n.t('user_filter_by_deactivated'),
                isCurrent: this.state.sortingType === 2,
              },
              {
                key: 3,
                title: i18n.t('user_filter_by_archived'),
                isCurrent: this.state.sortingType === 3,
              },
            ]}
            onSelect={this.toggleSorting}
          />
        </div>
        {this.state.sortingType === 0 && (
          <div style={{ marginBottom: 15 }}>{i18n.t('user_sorting_by_vuln')}</div>
        )}
        {this.state.sortingType === 1 && (
          <div style={{ marginBottom: 15 }}>{i18n.t('user_sorting_by_time')}</div>
        )}
        {this.state.sortingType === 2 && (
          <div style={{ marginBottom: 20 }}>
            <p>{i18n.t('user_filtering_by_deactivated')}</p>
            <strong style={{ fontSize: 16 }}>
              {i18n.t('user_filtering_by_deactivated_interval')}
            </strong>
          </div>
        )}
        {this.state.sortingType === 3 && (
          <div style={{ marginBottom: 20 }}>
            <p>{i18n.t('user_filtering_by_archived')}</p>
          </div>
        )}
        <PaginationBar
          pageIndex={this.state.pageIndex}
          limit={this.state.limit}
          totalCount={this.state.userCount}
          onClick={this.goToPageIndex}
          itemUnitName={i18n.t('user_unit_name')}
        />
        <Tooltip id="pwd-strength-tooltip" />
        <table>
          <thead>
            <tr>
              <th>{i18n.t('user_id')}</th>
              <th>{i18n.t('user_email')}</th>
              <th>{i18n.t('user_data')}</th>
              <th style={{ width: 150 }}>{i18n.t('user_general_stats')}</th>
              <th style={{ width: 150 }}>
                <span>{i18n.t('user_passwords_stats')}</span>
                <span
                  className="info-icon"
                  data-tooltip-id="pwd-strength-tooltip"
                  data-tooltip-html={`<div>
                  <p>${i18n.t('user_passwords_stats_tooltip_1')}</p>
                  <p>${i18n.t('user_passwords_stats_tooltip_2')}</p>
                  <ul>
                    <li>${i18n.t('user_passwords_stats_tooltip_3')}</li>
                    <li>${i18n.t('user_passwords_stats_tooltip_4')}</li>
                    <li>${i18n.t('user_passwords_stats_tooltip_5')}</li>
                  </ul>
                  </div>`}
                >
                  ?
                </span>
              </th>
              <th>
                <div>{i18n.t('user_settings_override')}</div>
                <div className="action" style={{ color: 'white' }} onClick={this.toggleAllSettings}>
                  {i18n.t('settings_bank_settings_toggle_all_settings')}
                </div>
              </th>
              <th>{i18n.t('actions')}</th>
              <th>{i18n.t('shamir_vault_col_name')}</th>
            </tr>
          </thead>
          <tbody>
            {this.state.users.map((u) => {
              let lastSessionStyle = {};
              const lastSessionDateOrNull = !u.last_sync_date ? null : new Date(u.last_sync_date);
              const isLastSessionOld =
                lastSessionDateOrNull == null ? true : lastSessionDateOrNull < getDateBack2Weeks();
              const isLastSessionVeryOld =
                lastSessionDateOrNull == null ? true : lastSessionDateOrNull < getDateBack1Month();
              lastSessionStyle = {
                fontWeight: 'bold',
                backgroundColor: isLastSessionVeryOld
                  ? 'red'
                  : isLastSessionOld
                    ? 'orange'
                    : 'green',
                color: 'white',
                padding: '0 3px',
              };
              const showSettings =
                this.state.showAllSettings || this.state.showUserSettings[u.user_id];
              return (
                <React.Fragment key={u.user_id}>
                  <tr>
                    <td>{u.user_id}</td>
                    <EditableCell
                      value={u.email}
                      placeholder="email@domain.fr"
                      onChange={(newEmail) => {
                        if (!newEmail) return;
                        this.onChangeEmail(u.user_id, u.email, newEmail);
                      }}
                      disabled={isRestrictedSuperadmin}
                    />
                    <td>
                      <div style={{ fontSize: 12 }}>
                        {u.data2_length > 0 ? `${Math.round(u.data2_length / 1000)}ko` : '0ko'}
                      </div>
                      <div>
                        {i18n.t('user_data_updated_at')}{' '}
                        <span style={{ fontSize: 12 }}>
                          {new Date(u.updated_at).toLocaleString()}
                        </span>
                      </div>
                      <div>
                        {i18n.t('user_data_seen_at')}{' '}
                        <span style={{ fontSize: 12, ...lastSessionStyle }}>
                          {lastSessionDateOrNull?.toLocaleString()}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div
                        className={u.nb_devices > 0 ? 'action' : null}
                        onClick={() => this.loadUserDevices(u.user_id)}
                      >
                        {i18n.t('user_nb_devices_value', { nb: u.nb_devices || 0 })}
                      </div>
                      <div>{i18n.t('user_nb_codes_value', { nb: u.nb_codes || 0 })}</div>
                      <div>{i18n.t('user_nb_accounts_value', { nb: u.nb_accounts || 0 })}</div>
                      <div>
                        {u.nb_shared_items &&
                          i18n.t('user_nb_shared_items_value', { nb: u.nb_shared_items || 0 })}
                      </div>
                    </td>
                    {!u.deactivated && !u.archived ? (
                      <StatsCell
                        nb_accounts_strong={u.nb_accounts_strong}
                        nb_accounts_medium={u.nb_accounts_medium}
                        nb_accounts_weak={u.nb_accounts_weak}
                        nb_accounts_with_duplicated_password={
                          u.nb_accounts_with_duplicated_password
                        }
                        nb_accounts_red={u.nb_accounts_red}
                        nb_accounts_orange={u.nb_accounts_orange}
                        nb_accounts_green={u.nb_accounts_green}
                      />
                    ) : (
                      <td></td>
                    )}
                    {!u.deactivated && !u.archived && (
                      <td>
                        <div
                          className="action"
                          onClick={() => this.toggleShowUserSettings(u.user_id)}
                        >
                          {i18n.t('settings_bank_settings_toggle_bank_settings')}
                        </div>
                        <div>
                          {Object.keys(settingsConfig)
                            .filter((k) => settingsConfig[k].userTitle != null)
                            .map((k) => (
                              <UserSettingOverride
                                key={k}
                                settingNameInDb={k}
                                userValue={u}
                                toggleUserSettingOverride={this.toggleUserSettingOverride}
                                showAll={showSettings}
                              />
                            ))}
                        </div>
                      </td>
                    )}
                    {(u.deactivated || u.archived) && (
                      <td
                        style={{
                          backgroundColor: u.archived ? 'rgb(120, 120, 120)' : 'rgb(168, 50, 50)',
                          color: 'white',
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          {i18n.t(u.archived ? 'user_archived' : 'user_deactivated').toUpperCase()}
                        </div>
                      </td>
                    )}
                    <td>
                      <div className="userActions">
                        {!u.archived && (
                          <div className="userActionGroup">
                            {!u.deactivated ? (
                              <button
                                type="button"
                                className="userActionButton"
                                disabled={isRestrictedSuperadmin}
                                onClick={() => this.deactivateUser(u.user_id)}
                              >
                                {i18n.t('deactivate')}
                              </button>
                            ) : (
                              <button
                                type="button"
                                className="userActionButton"
                                disabled={isRestrictedSuperadmin}
                                onClick={() => this.reactivateUser(u.user_id)}
                              >
                                {i18n.t('reactivate')}
                              </button>
                            )}
                          </div>
                        )}
                        <div className="userActionGroup">
                          {!u.archived ? (
                            <button
                              type="button"
                              className="userActionButton userActionButtonPrimary"
                              disabled={isRestrictedSuperadmin}
                              onClick={() =>
                                this.openArchiveConfirmModal('archive', u.user_id, u.email)
                              }
                            >
                              {i18n.t('archive')}
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="userActionButton userActionButtonPrimary"
                              disabled={isRestrictedSuperadmin}
                              onClick={() =>
                                this.openArchiveConfirmModal('unarchive', u.user_id, u.email)
                              }
                            >
                              {i18n.t('unarchive')}
                            </button>
                          )}
                        </div>
                        {u.archived && (
                          <div className="userActionGroup">
                            <button
                              type="button"
                              className="userActionButton userActionButtonDanger"
                              disabled={isRestrictedSuperadmin}
                              onClick={() => this.deleteUserWithWarning(u.user_id, u.email)}
                            >
                              {i18n.t('delete')}
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                    <td>
                      {u.shamir_setup && (
                        <div>
                          <strong>{u.shamir_setup.config_name}</strong>
                          <br />
                          <br />
                          {i18n.t('shamir_vault_created_at')}
                          <br />
                          {new Date(u.shamir_setup.created_at).toLocaleDateString()}
                        </div>
                      )}
                      {!u.shamir_setup && (
                        <div>
                          <span style={{ fontSize: 20 }}>⚠️</span>
                          <br />
                          {i18n.t('shamir_vault_unprotected')}
                        </div>
                      )}
                    </td>
                  </tr>
                  {u.devices && (
                    <tr className="detailContainer">
                      <td colSpan={7}>
                        <UserDevices
                          setIsLoading={this.props.setIsLoading}
                          devices={u.devices}
                          email={u.email}
                          reloadDevices={() => this.loadUserDevices(u.user_id)}
                          close={() => this.closeUserDevices(u.user_id)}
                        />
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
        <PaginationBar
          pageIndex={this.state.pageIndex}
          limit={this.state.limit}
          totalCount={this.state.userCount}
          onClick={this.goToPageIndex}
          itemUnitName={i18n.t('user_unit_name')}
        />
      </div>
      <Modal
        id="archiveConfirmModal"
        title={i18n.t(isUnarchiving ? 'user_unarchive_confirm_title' : 'user_archive_confirm_title')}
        onClosed={() => this.setState({ pendingArchiveAction: null })}
      >
        <div>
          {i18n.t(
            isUnarchiving ? 'user_unarchive_confirm_text' : 'user_archive_confirm_text',
            { email: pendingArchiveAction?.email },
          )}
        </div>
        <div className="userConfirmModalButtons">
          <button onClick={this.closeArchiveConfirmModal} className="whiteButton">
            {i18n.t('cancel')}
          </button>
          <button
            onClick={this.confirmArchiveAction}
            disabled={isRestrictedSuperadmin}
            className="submitButton"
          >
            {i18n.t(isUnarchiving ? 'unarchive' : 'archive')}
          </button>
        </div>
      </Modal>
      </>
    );
  }
}

const UserSettingOverride = (props) => {
  const { settingNameInDb, userValue, toggleUserSettingOverride, showAll } = props;
  const settingConf = settingsConfig[settingNameInDb];
  const userSettingValue = settingConf.dbNameForUser
    ? userValue[settingConf.dbNameForUser]
    : userValue.settings_override?.[settingNameInDb];
  if (userSettingValue == null && !showAll) {
    return null;
  }
  var defaultValue =
    userValue.bank_settings?.[settingNameInDb] != null
      ? userValue.bank_settings?.[settingNameInDb]
      : settingConf.recommendedValue;
  var recommendedValue = settingConf.recommendedValue;
  if (settingConf.reverseMeaningForUser) {
    defaultValue = !defaultValue;
    recommendedValue = !recommendedValue;
  }
  const toggleValue = () => {
    toggleUserSettingOverride(userValue.user_id, settingConf.dbNameForUser || settingNameInDb);
  };
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div>{i18n.t(settingConf.userTitle)}</div>
      {userSettingValue == null ? (
        <span
          onClick={toggleValue}
          className={`clickable defaultParam ${isRestrictedSuperadmin ? 'disabledUI' : ''}`}
        >
          {i18n.t(defaultValue ? 'default_yes' : 'default_no')}
        </span>
      ) : (
        <span
          onClick={toggleValue}
          className={`clickable
            ${recommendedValue === userSettingValue ? 'recommendedParam' : 'unrecommendedParam'}
            ${isRestrictedSuperadmin ? 'disabledUI' : ''}
          `}
        >
          {i18n.t(userSettingValue ? 'yes' : 'no')}
        </span>
      )}
    </div>
  );
};

export { Users };
