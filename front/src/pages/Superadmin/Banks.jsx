import React from 'react';
import { EditableCell } from '../../helpers/EditableCell';
import { EditableResellerCell } from '../../helpers/EditableResellerCell';
import { ResellerSelector } from '../../helpers/ResellerSelector';
import { Toggler } from '../../helpers/Toggler';
import { baseFrontUrl, isSaasServer } from '../../helpers/env';
import { autolockDelaySettings, settingsConfig } from '../../helpers/settingsConfig';
import { bankUrlFetch } from '../../helpers/urlFetch';
import { i18n } from '../../i18n/i18n';
import './Banks.css';
import { isRestrictedSuperadmin } from '../../helpers/isRestrictedSuperadmin';
import { toast } from 'react-toastify';
import { Search } from '../../components/Search';
import { SearchByFields } from '../../helpers/SearchByFields';

// Virtual list settings
const ESTIMATED_ROW_HEIGHT = 41;
const OVERSCAN_PX = 600;

// Props : setIsLoading, banks, fetchBanks
class Banks extends React.Component {
  state = {
    bankToDeleteId: null,
    showAllSettings: false,
    showBankSettings: {},
    filterType: 0, // 0: all, 1: testing only
    sortType: 1, // 0: name, 1: reseller, 2: expiration date
    sortDirection: 'asc', // 'asc' or 'desc'
    selectedResellerIdForNewBank: null, // Selected reseller for new bank form
    resellers: [],
    search: localStorage.getItem('search') || '',
    range: { start: 0, end: 50 }, // virtual list: rendered rows window
  };
  newBankNameInputRef = null;
  newAdminEmailInputRef = null;
  isTestingCheckboxRef = null;
  salesEmailRef = null;

  insertBank = async () => {
    try {
      this.props.setIsLoading(true);
      const newBankName = this.newBankNameInputRef.value;
      const newAdminEmail = this.newAdminEmailInputRef.value?.trim();
      const isTrial = isSaasServer && this.isTestingCheckboxRef.checked;
      const salesEmail = this.salesEmailRef.value?.trim();
      const resellerId = this.state.selectedResellerIdForNewBank || null;
      const emailRegex =
        /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
      if (!newBankName || newBankName.length < 2 || newBankName.length > 50) {
        this.newBankNameInputRef.style.borderColor = 'red';
        toast.error(i18n.t('sasettings_new_bank_form_bank_name_too_long_or_short'));
        return;
      } else {
        this.newBankNameInputRef.style.borderColor = null;
      }
      if (newAdminEmail && !newAdminEmail.toLowerCase().match(emailRegex)) {
        this.newAdminEmailInputRef.style.borderColor = 'red';
        toast.error(i18n.t('sasettings_new_bank_form_admin_email_invalid'));
        return;
      } else {
        this.newAdminEmailInputRef.style.borderColor = null;
      }
      if (salesEmail && !salesEmail.toLowerCase().match(emailRegex)) {
        this.salesEmailRef.style.borderColor = 'red';
        toast.error(i18n.t('sasettings_new_bank_form_sales_email_invalid'));
        return;
      } else {
        this.salesEmailRef.style.borderColor = null;
      }
      if (isTrial && resellerId) {
        toast.error(i18n.t('sasettings_bank_test_group_forbidden'));
        return;
      }
      if (resellerId && isRestrictedSuperadmin) {
        toast.error(i18n.t('sasettings_bank_reseller_forbidden_restricted'));
        return;
      }
      if (salesEmail) {
        localStorage.setItem('newBankSalesEmail', salesEmail);
      }
      await bankUrlFetch('/api/insert-bank', 'POST', {
        name: newBankName,
        adminEmail: newAdminEmail,
        isTrial,
        salesEmail,
        resellerId,
      });
      await this.props.fetchBanks();
      this.newBankNameInputRef.value = null;
      this.newAdminEmailInputRef.value = null;
      this.isTestingCheckboxRef.checked = true;
      this.setState({ selectedResellerIdForNewBank: null });
      toast.success(i18n.t('sasettings_new_bank_form_success'));
    } catch (e) {
      console.error(e);
    } finally {
      this.props.setIsLoading(false);
    }
  };
  updateBankName = async (bankId, newName) => {
    try {
      this.props.setIsLoading(true);
      await bankUrlFetch('/api/update-bank', 'POST', {
        name: newName,
        id: bankId,
      });
      await this.props.fetchBanks();
    } catch (e) {
      console.error(e);
    } finally {
      this.props.setIsLoading(false);
    }
  };
  updateResellerId = async (bankId, resellerId) => {
    const bank = this.props.banks.find((b) => b.id === bankId);
    if (resellerId && bank?.settings?.IS_TESTING) {
      toast.error(i18n.t('sasettings_bank_test_group_forbidden'));
      return;
    }
    try {
      this.props.setIsLoading(true);
      await bankUrlFetch('/api/update-bank', 'POST', {
        id: bankId,
        resellerId: resellerId,
      });
      await this.props.fetchBanks();
    } catch (e) {
      console.error(e);
    } finally {
      this.props.setIsLoading(false);
    }
  };
  toggleBankSetting = async (bankId, newSettings) => {
    const bank = this.props.banks.find((b) => b.id === bankId);
    if (newSettings.IS_TESTING && bank?.reseller_id) {
      toast.error(i18n.t('sasettings_bank_test_group_forbidden'));
      return;
    }
    try {
      this.props.setIsLoading(true);
      await bankUrlFetch('/api/update-bank', 'POST', {
        id: bankId,
        settings: newSettings,
      });
      await this.props.fetchBanks();
    } catch (e) {
      console.error(e);
    } finally {
      this.props.setIsLoading(false);
    }
  };
  deleteBank = async (id) => {
    try {
      this.props.setIsLoading(true);
      await bankUrlFetch(`/api/delete-bank/${id}`, 'POST', null);
      await this.props.fetchBanks();
    } catch (e) {
      console.error(e);
    } finally {
      this.props.setIsLoading(false);
    }
  };

  fetchResellers = async () => {
    try {
      const resellers = await bankUrlFetch('/api/resellers', 'GET', null);
      this.setState({ resellers: resellers });
    } catch (e) {
      console.error('Error fetching resellers:', e);
    }
  };
  componentDidMount() {
    this.fetchResellers();
    this.attachScrollContainer();
  }
  componentDidUpdate() {
    this.attachScrollContainer();
    this.measureRows();
    // filters/search/sort may have changed the list: make sure the window is still right
    this.onScrollOrResize();
  }
  componentWillUnmount() {
    this.detachScrollContainer();
  }

  // ---- Virtual list ----
  rowHeights = new Map();
  scrollContainer = null;
  tbodyRef = null;
  rafId = null;
  onScrollOrResize = () => {
    if (this.rafId) return;
    this.rafId = requestAnimationFrame(() => {
      this.rafId = null;
      const range = this.computeRange();
      if (range.start !== this.state.range.start || range.end !== this.state.range.end) {
        this.setState({ range });
      }
    });
  };
  attachScrollContainer = () => {
    const container = this.tbodyRef ? this.tbodyRef.closest('.page') : null;
    if (container === this.scrollContainer) return;
    this.detachScrollContainer();
    this.scrollContainer = container;
    if (container) {
      // we handle scroll position compensation ourselves (see measureRows)
      container.style.overflowAnchor = 'none';
      container.addEventListener('scroll', this.onScrollOrResize, { passive: true });
      window.addEventListener('resize', this.onScrollOrResize);
      this.onScrollOrResize();
    }
  };
  detachScrollContainer = () => {
    if (this.scrollContainer) {
      this.scrollContainer.style.overflowAnchor = '';
      this.scrollContainer.removeEventListener('scroll', this.onScrollOrResize);
      window.removeEventListener('resize', this.onScrollOrResize);
    }
    this.scrollContainer = null;
    if (this.rafId) cancelAnimationFrame(this.rafId);
    this.rafId = null;
  };
  getRowHeight = (id) => this.rowHeights.get(id) || ESTIMATED_ROW_HEIGHT;
  // Compute the [start, end) range of rows to render for the current scroll position
  computeRange = () => {
    const banks = this.filteredBanksForRange || [];
    const container = this.scrollContainer;
    if (!container || !this.tbodyRef) return { start: 0, end: Math.min(banks.length, 50) };
    const containerRect = container.getBoundingClientRect();
    const tbodyTop = this.tbodyRef.getBoundingClientRect().top;
    const viewTop = containerRect.top - tbodyTop - OVERSCAN_PX;
    const viewBottom = containerRect.bottom - tbodyTop + OVERSCAN_PX;
    let y = 0;
    let start = 0;
    while (start < banks.length && y + this.getRowHeight(banks[start].id) < viewTop) {
      y += this.getRowHeight(banks[start].id);
      start++;
    }
    let end = start;
    while (end < banks.length && y < viewBottom) {
      y += this.getRowHeight(banks[end].id);
      end++;
    }
    return { start, end };
  };
  measureRows = () => {
    if (!this.tbodyRef) return;
    const container = this.scrollContainer;
    const containerTop = container ? container.getBoundingClientRect().top : 0;
    let changed = false;
    let scrollDelta = 0;
    this.tbodyRef.querySelectorAll('tr[data-bank-id]').forEach((tr) => {
      const id = tr.getAttribute('data-bank-id');
      const h = tr.offsetHeight;
      const previous = this.rowHeights.get(id);
      if (h && Math.abs((previous || 0) - h) > 1) {
        this.rowHeights.set(id, h);
        changed = true;
        // A row located above the viewport changed height: the content below it moved.
        // Compensate manually so that the visible content stays still.
        if (tr.getBoundingClientRect().bottom <= containerTop) {
          scrollDelta += h - (previous || ESTIMATED_ROW_HEIGHT);
        }
      }
    });
    if (container && scrollDelta) container.scrollTop += scrollDelta;
    if (changed) this.onScrollOrResize();
  };
  askDeleteBank = (id) => {
    this.setState({ bankToDeleteId: id });
  };
  toggleAllSettings = () => {
    this.setState((s) => {
      if (s.showAllSettings) {
        return { ...s, showAllSettings: false, showBankSettings: {} };
      }
      return { ...s, showAllSettings: true };
    });
  };
  toggleShowBankSettings = (bankId) => {
    this.setState((s) => {
      return { ...s, showBankSettings: { [bankId]: !s.showBankSettings[bankId] } };
    });
  };

  handleSort = (sortType) => {
    this.setState((prevState) => ({
      sortType,
      sortDirection:
        prevState.sortType === sortType && prevState.sortDirection === 'asc' ? 'desc' : 'asc',
    }));
  };

  getSortIcon = (columnSortType) => {
    if (this.state.sortType !== columnSortType) {
      return '↕'; // No sort icon when not active
    }
    return this.state.sortDirection === 'asc' ? '↑' : '↓';
  };

  sortByReseller = (a, b, ascending) => {
    let comparison;
    const resellerA = a.reseller_name?.toLowerCase();
    const resellerB = b.reseller_name?.toLowerCase();
    if (resellerA === resellerB) {
      // resellers are sorted using selected order, but banks are always sorted in natural order.
      return this.sortByBank(a, b, true);
    } else if (!resellerA) comparison = 1;
    else if (!resellerB) comparison = -1;
    else if (resellerA && resellerB) comparison = resellerA.localeCompare(resellerB);
    return ascending ? comparison : -comparison;
  };
  sortByBank = (a, b, ascending) => {
    let comparison = a.name.toLowerCase().localeCompare(b.name.toLowerCase());
    return ascending ? comparison : -comparison;
  };
  sortByRemainingTrialDays = (a, b, ascending) => {
    const getExpirationValue = (bank) => {
      if (!bank.settings?.IS_TESTING || !bank.settings?.TESTING_EXPIRATION_DATE) {
        return Infinity; // Non-testing banks go to the end
      }
      const today = new Date();
      const expirationDate = new Date(bank.settings.TESTING_EXPIRATION_DATE);
      return expirationDate - today; // Sort by time remaining (expired first)
    };
    const expA = getExpirationValue(a);
    const expB = getExpirationValue(b);
    if (expA === expB) {
      return this.sortByReseller(a, b, true);
    } else if (expA < expB) {
      return ascending ? 1 : -1;
    } else {
      return ascending ? -1 : 1;
    }
  };
  handleSearch = (value) => {
    this.setState({ search: value });
    localStorage.setItem('search', value);
  };

  _filteredCache = { key: null, result: [] };
  getFilteredBanks = () => {
    const { search, filterType, sortType, sortDirection } = this.state;
    const banks = this.props.banks;
    const c = this._filteredCache;
    if (
      c.key &&
      c.key.banks === banks &&
      c.key.search === search &&
      c.key.filterType === filterType &&
      c.key.sortType === sortType &&
      c.key.sortDirection === sortDirection
    ) {
      return c.result;
    }
    const ascending = sortDirection === 'asc';
    const result = SearchByFields(banks, search, [
      'id',
      'name',
      'reseller_name',
      'settings.SALES_REP',
    ])
      .filter((bank) => filterType === 0 || bank.settings?.IS_TESTING)
      .sort((a, b) => {
        switch (sortType) {
          case 0:
            return this.sortByBank(a, b, ascending);
          case 2:
            return this.sortByRemainingTrialDays(a, b, ascending);
          case 1:
          default:
            return this.sortByReseller(a, b, ascending);
        }
      });
    this._filteredCache = { key: { banks, search, filterType, sortType, sortDirection }, result };
    return result;
  };

  render() {
    const bankToDelete = this.props.banks.find((g) => g.id === this.state.bankToDeleteId);
    if (bankToDelete) {
      return (
        <div>
          <h2>{i18n.t('sasettings_banks')}</h2>
          <div
            className={`delete-confirmation-container ${isRestrictedSuperadmin ? 'disabledUI' : ''}`}
          >
            <h3>{i18n.t('sasettings_bank_delete_warning')}</h3>
            <div style={{ marginBottom: 10 }}>
              {i18n.t('sasetting_confirm_bank_delete', {
                name: bankToDelete.name,
              })}
            </div>
            <input ref={(r) => (this.deleteBankInputRef = r)} />
            <div className="button-group">
              <div
                className="danger-button"
                onClick={() => {
                  if (this.deleteBankInputRef.value === bankToDelete.name) {
                    this.deleteBank(bankToDelete.id);
                  } else {
                    this.deleteBankInputRef.style.borderColor = 'red';
                  }
                }}
              >
                {i18n.t('validate')}
              </div>
              <div className="button" onClick={() => this.setState({ bankToDeleteId: null })}>
                {i18n.t('cancel')}
              </div>
            </div>
          </div>
        </div>
      );
    }

    const filteredBanks = this.getFilteredBanks();
    this.filteredBanksForRange = filteredBanks;
    const rangeStart = Math.min(this.state.range.start, filteredBanks.length);
    const rangeEnd = Math.min(Math.max(this.state.range.end, rangeStart), filteredBanks.length);
    let topSpacerHeight = 0;
    for (let i = 0; i < rangeStart; i++) topSpacerHeight += this.getRowHeight(filteredBanks[i].id);
    let bottomSpacerHeight = 0;
    for (let i = rangeEnd; i < filteredBanks.length; i++)
      bottomSpacerHeight += this.getRowHeight(filteredBanks[i].id);
    const visibleBanks = filteredBanks.slice(rangeStart, rangeEnd);
    const spacerRow = (key, height) =>
      height > 0 ? (
        <tr key={key} className="detailContainer" style={{ height }} aria-hidden="true">
          <td colSpan={99} style={{ padding: 0, border: 'none', height }} />
        </tr>
      ) : null;
    return (
      <div>
        <h2>{i18n.t('sasettings_banks')}</h2>
        <p>{i18n.t('sasettings_banks_explanation')}</p>
        <div className="newBankForm">
          <div className="newBankFormTitle">{i18n.t('sasettings_new_bank_form_title')}</div>
          <div className="newBankInputContainer">
            <label htmlFor="bankNameInput">{i18n.t('sasettings_new_bank_form_bank_name')}*</label>
            <input
              id="bankNameInput"
              ref={(r) => {
                this.newBankNameInputRef = r;
              }}
              placeholder={i18n.t('sasettings_new_bank_form_bank_name')}
            />
          </div>
          {isSaasServer && (
            <div className="newBankInputContainer">
              <label htmlFor="isTestingCheckbox">
                {i18n.t('sasettings_new_bank_form_is_testing')}
              </label>
              <input
                id="isTestingCheckbox"
                type="checkbox"
                defaultChecked
                disabled={!!this.state.selectedResellerIdForNewBank}
                ref={(r) => {
                  this.isTestingCheckboxRef = r;
                }}
              />
            </div>
          )}
          {isSaasServer && (
            <div className="newBankInputContainer">
              <label htmlFor="resellerName">{i18n.t('sasettings_bank_reseller')}</label>
              <ResellerSelector
                value={this.state.selectedResellerIdForNewBank}
                onChange={(value) => {
                  if (value && this.isTestingCheckboxRef) {
                    this.isTestingCheckboxRef.checked = false;
                  }
                  this.setState({ selectedResellerIdForNewBank: value });
                }}
                placeholder={i18n.t('sasettings_select_reseller')}
                resellers={this.state.resellers}
              />
            </div>
          )}
          <div
            className="newBankInputContainer"
            style={this.state.selectedResellerIdForNewBank ? { display: 'none' } : null}
          >
            <div>
              <label htmlFor="adminEmailInput">
                {i18n.t('sasettings_new_bank_form_admin_email_label')}
              </label>
              <input
                id="adminEmailInput"
                ref={(r) => {
                  this.newAdminEmailInputRef = r;
                }}
                placeholder={i18n.t('sasettings_new_bank_form_admin_email')}
                type="email"
              />
            </div>
          </div>
          <div className="newBankInputContainer">
            <label htmlFor="salesEmail">{i18n.t('sasettings_new_bank_form_sales_email')}</label>
            <input
              id="salesEmail"
              ref={(r) => {
                this.salesEmailRef = r;
              }}
              placeholder={i18n.t('sasettings_new_bank_form_sales_email_placeholder')}
              defaultValue={localStorage.getItem('newBankSalesEmail')}
              type="email"
            />
          </div>

          <div className="action" onClick={this.insertBank}>
            {i18n.t('add')}
          </div>
        </div>
        {isSaasServer && (
          <div className="filters-container">
            <div>
              <Toggler
                choices={[
                  {
                    key: 0,
                    title: i18n.t('sasettings_filter_all_banks'),
                    isCurrent: this.state.filterType === 0,
                  },
                  {
                    key: 1,
                    title: i18n.t('sasettings_filter_testing_banks'),
                    isCurrent: this.state.filterType === 1,
                  },
                ]}
                onSelect={(filterType) => this.setState({ filterType })}
              />
            </div>
            <Search
              placeholder={i18n.t('search_placeholder')}
              onChange={this.handleSearch}
              value={this.state.search || ''}
              tooltip={i18n.t('search_bank_or_sale_tooltip')}
            />
          </div>
        )}
        {(this.state.search || this.state.filterType !== 0) && (
          <div className="filter-warning">⚠️ {i18n.t('sasettings_filtered_list_warning')}</div>
        )}
        {this.props.banks.length > 0 && (
          <table>
            <thead>
              <tr>
                <th></th>
                <th>{i18n.t('sasettings_bank_id')}</th>
                {isSaasServer && (
                  <th
                    className="sortable-header"
                    onClick={() => this.handleSort(1)}
                    title={i18n.t('sasettings_click_to_sort')}
                  >
                    {i18n.t('sasettings_bank_reseller')}
                    <br />
                    {this.getSortIcon(1)}
                  </th>
                )}
                <th
                  className="sortable-header"
                  style={{ minWidth: 100 }}
                  onClick={() => this.handleSort(0)}
                  title={i18n.t('sasettings_click_to_sort')}
                >
                  {i18n.t('sasettings_bank_name')}
                  <br />
                  {this.getSortIcon(0)}
                </th>
                <th>{i18n.t('sasettings_nb_associated_licences')}</th>
                <th>{i18n.t('sasettings_nb_users')}</th>
                <th>{i18n.t('sasettings_bank_created_at')}</th>
                {isSaasServer && <th>{i18n.t('sasettings_bank_is_testing')}</th>}
                {isSaasServer && <th>{i18n.t('sasettings_bank_test_expires_at')}</th>}
                {isSaasServer && (
                  <th
                    className="sortable-header"
                    onClick={() => this.handleSort(2)}
                    title={i18n.t('sasettings_click_to_sort')}
                  >
                    {i18n.t('sasettings_bank_test_days_remaining')}
                    <br />
                    {this.getSortIcon(2)}
                  </th>
                )}
                {isSaasServer && <th>{i18n.t('sasettings_bank_sales_rep')}</th>}
                {!isRestrictedSuperadmin && (
                  <th style={{ minWidth: 200 }}>
                    <div>{i18n.t('settings_bank_settings')}</div>
                    <div
                      className="action"
                      style={{ color: 'white' }}
                      onClick={this.toggleAllSettings}
                    >
                      {i18n.t('settings_bank_settings_toggle_all_settings')}
                    </div>
                  </th>
                )}
                {!isRestrictedSuperadmin && <th>{i18n.t('actions')}</th>}
              </tr>
            </thead>
            <tbody ref={(r) => (this.tbodyRef = r)}>
              {spacerRow('top-spacer', topSpacerHeight)}
              {visibleBanks.map((bank) => (
                <BankRow
                  key={bank.id}
                  bank={bank}
                  resellers={this.state.resellers}
                  showSettings={!!(this.state.showAllSettings || this.state.showBankSettings[bank.id])}
                  updateResellerId={this.updateResellerId}
                  updateBankName={this.updateBankName}
                  toggleBankSetting={this.toggleBankSetting}
                  toggleShowBankSettings={this.toggleShowBankSettings}
                  onAskDelete={this.askDeleteBank}
                />
              ))}
              {spacerRow('bottom-spacer', bottomSpacerHeight)}
              <tr className="total-row">
                <td>{i18n.t('total')}</td>
                <td></td>
                {isSaasServer && <td></td>}
                <td></td>
                <td></td>
                <td>{filteredBanks.reduce((r, g) => r + parseInt(g.nb_users), 0)}</td>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
                {isSaasServer && <td></td>}
                {!isRestrictedSuperadmin && <td></td>}
                {!isRestrictedSuperadmin && <td></td>}
              </tr>
            </tbody>
          </table>
        )}
      </div>
    );
  }
}

const BankRow = React.memo(function BankRow(props) {
  const {
    bank,
    resellers,
    showSettings,
    updateResellerId,
    updateBankName,
    toggleBankSetting,
    toggleShowBankSettings,
    onAskDelete,
  } = props;
  return (
          <tr key={bank.id} data-bank-id={bank.id}>
            <td>
              <span
                className="action"
                onClick={() => {
                  window.location.href = baseFrontUrl + '/' + bank.id + '/';
                }}
              >
                {i18n.t('sasettings_bank_open')}
              </span>
            </td>
            <td>{bank.id}</td>
            {isSaasServer && (
              <EditableResellerCell
                value={bank.reseller_id}
                onChange={(newId) => {
                  updateResellerId(bank.id, newId);
                }}
                resellers={resellers}
              />
            )}
            <EditableCell
              value={bank.name}
              onChange={(newVal) => {
                if (!newVal) return;
                updateBankName(bank.id, newVal);
              }}
            />
            <td>{bank.nb_licences}</td>
            <td className={bank.nb_users > bank.nb_licences ? 'user-count-warning' : ''}>
              {bank.nb_users}
            </td>
            <td>{new Date(bank.created_at).toLocaleDateString()}</td>
            {isSaasServer && (
              <td>
                <div className="testing-checkbox-container">
                  <input
                    type="checkbox"
                    checked={bank.settings?.IS_TESTING}
                    onChange={() => {
                      toggleBankSetting(bank.id, {
                        ...bank.settings,
                        IS_TESTING: !bank.settings?.IS_TESTING,
                      });
                    }}
                    disabled={isRestrictedSuperadmin}
                  ></input>
                  &nbsp;{bank.settings?.IS_TESTING ? i18n.t('yes') : i18n.t('no')}
                </div>
              </td>
            )}
            {isSaasServer &&
              (bank.settings?.IS_TESTING ? (
                <EditableCell
                  type="date"
                  value={bank.settings?.TESTING_EXPIRATION_DATE}
                  className={
                    !bank.settings?.TESTING_EXPIRATION_DATE ||
                    new Date(bank.settings?.TESTING_EXPIRATION_DATE) < new Date()
                      ? 'expired-date'
                      : ''
                  }
                  onChange={(newVal) => {
                    toggleBankSetting(bank.id, {
                      ...bank.settings,
                      TESTING_EXPIRATION_DATE: newVal,
                    });
                  }}
                  disabled={isRestrictedSuperadmin}
                />
              ) : (
                <td>N/A</td>
              ))}
            {isSaasServer && (
              <td>
                {bank.settings?.IS_TESTING && bank.settings?.TESTING_EXPIRATION_DATE
                  ? (() => {
                      const today = new Date();
                      const expirationDate = new Date(
                        bank.settings.TESTING_EXPIRATION_DATE,
                      );
                      const diffTime = expirationDate - today;
                      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                      if (diffDays <= 0) {
                        const expiredDays = Math.abs(diffDays);
                        return (
                          <span className="expired-text">
                            {i18n.t('sasettings_bank_expired_since', {
                              days: expiredDays,
                              s: expiredDays > 1 ? 's' : '',
                            })}
                          </span>
                        );
                      } else if (diffDays <= 7) {
                        return (
                          <span className="expiring-soon-text">
                            {i18n.t('sasettings_bank_days_remaining', {
                              days: diffDays,
                              s: diffDays > 1 ? 's' : '',
                            })}
                          </span>
                        );
                      } else {
                        return (
                          <span>
                            {i18n.t('sasettings_bank_days_remaining', {
                              days: diffDays,
                              s: diffDays > 1 ? 's' : '',
                            })}
                          </span>
                        );
                      }
                    })()
                  : 'N/A'}
              </td>
            )}
            {isSaasServer && (
              <EditableCell
                value={bank.settings?.SALES_REP || ''}
                onChange={(newVal) => {
                  if (
                    newVal &&
                    !newVal
                      .toLowerCase()
                      .match(
                        /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|.(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
                      )
                  ) {
                    toast.warn(i18n.t('sasettings_bank_sales_rep_must_be_email'));
                    return;
                  }
                  toggleBankSetting(bank.id, {
                    ...bank.settings,
                    SALES_REP: newVal,
                  });
                }}
              />
            )}
            {!isRestrictedSuperadmin && (
              <td className={showSettings ? 'settings-column-expanded' : ''}>
                <div
                  className="action"
                  onClick={() => toggleShowBankSettings(bank.id)}
                >
                  {i18n.t('settings_bank_settings_toggle_bank_settings')}
                </div>
                {showSettings && (
                  <>
                    {Object.keys(settingsConfig).map((k) => (
                      <InlineSetting
                        key={k}
                        bank={bank}
                        settingNameInDB={k}
                        toggleBankSetting={toggleBankSetting}
                      />
                    ))}
                    {Object.keys(autolockDelaySettings).map((k) => (
                      <AutolockDelaySetting
                        key={k}
                        bank={bank}
                        settingNameInDB={k}
                        toggleBankSetting={toggleBankSetting}
                      />
                    ))}
                  </>
                )}
              </td>
            )}
            {!isRestrictedSuperadmin && (
              <td>
                <div
                  className={`action ${isRestrictedSuperadmin ? 'disabledUI' : ''}`}
                  onClick={() => onAskDelete(bank.id)}
                >
                  {i18n.t('delete')}
                </div>
              </td>
            )}
          </tr>
  );
});

const InlineSetting = (props) => {
  const { bank, settingNameInDB, toggleBankSetting } = props;
  const settingConf = settingsConfig[settingNameInDB];
  const resValue =
    bank.settings?.[settingNameInDB] == null
      ? settingConf.recommendedValue
      : bank.settings?.[settingNameInDB];
  const isRecommendedValue = resValue === settingConf.recommendedValue;
  return (
    <div className="inline-setting">
      <div className="inline-setting-content">{i18n.t(settingConf.banksTitle)}</div>
      <div
        onClick={() => {
          toggleBankSetting(bank.id, {
            ...bank.settings,
            [settingNameInDB]: !resValue,
          });
        }}
        className={`action ${isRestrictedSuperadmin ? 'disabledUI' : ''}`}
      >
        {isRecommendedValue ? (
          <div className="recommendedParam">
            {i18n.t(settingConf.recommendedValue ? 'yes' : 'no')}
          </div>
        ) : (
          <div className="unrecommendedParam">
            {i18n.t(settingConf.recommendedValue ? 'no' : 'yes')}
          </div>
        )}
      </div>
    </div>
  );
};

const AutolockDelaySetting = (props) => {
  const { bank, settingNameInDB, toggleBankSetting } = props;
  const settingConf = autolockDelaySettings[settingNameInDB];
  const resValue = bank.settings?.[settingNameInDB] ?? -1;

  let maxDuration = null;
  if (settingConf.maxSettingKey != null) {
    maxDuration =
      bank.settings?.[settingConf.maxSettingKey] == null
        ? autolockDelaySettings[settingConf.maxSettingKey].recommendedOption
        : bank.settings?.[settingConf.maxSettingKey];
  }
  let defaultSettingDuration = null;
  if (settingConf.defaultSettingKey != null) {
    defaultSettingDuration =
      bank.settings?.[settingConf.defaultSettingKey] == null
        ? autolockDelaySettings[settingConf.defaultSettingKey].recommendedOption
        : bank.settings?.[settingConf.defaultSettingKey];
  }

  return (
    <div className="inline-setting">
      <div className="inline-setting-content">{i18n.t(settingConf.banksTitle)}</div>
      <div>
        <select
          onChange={(ev) => {
            toggleBankSetting(
              bank.id,
              settingConf.defaultSettingKey != null
                ? {
                    ...bank.settings,
                    [settingNameInDB]: Number.parseInt(ev.target.value),
                    [settingConf.defaultSettingKey]: Math.min(
                      Number.parseInt(ev.target.value),
                      defaultSettingDuration,
                    ),
                  }
                : {
                    ...bank.settings,
                    [settingNameInDB]: Number.parseInt(ev.target.value),
                  },
            );
          }}
          value={resValue}
          className="autolock-setting-select"
        >
          {/* important to avoid visual incoherence between the default here and the default in the app if this setting is never changed */}
          <option value={-1} disabled={isRestrictedSuperadmin}></option>
          {settingConf.options.map((op) => {
            return (
              <option
                key={op.seconds}
                value={op.seconds}
                disabled={
                  (maxDuration != null && op.seconds > maxDuration) || isRestrictedSuperadmin
                }
              >
                {op.title}
                {op.seconds == settingConf.recommendedOption ? ' (sugg.)' : ''}
              </option>
            );
          })}
        </select>
      </div>
    </div>
  );
};

export { Banks };
