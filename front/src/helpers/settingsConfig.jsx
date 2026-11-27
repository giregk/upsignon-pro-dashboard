export const settingsConfig = {
  DISABLE_MANUAL_VALIDATION_FOR_PASSWORD_FORGOTTEN: {
    banksTitle: 'sasettings_disable_reset_pwd_manual_admin_check',
    recommendedValue: false,
    userTitle: null,
  },
  DISABLE_OFFLINE_MODE_DEFAULT_DESKTOP: {
    banksTitle: 'sasettings_disable_offline_desktop',
    recommendedValue: false,
    userTitle: 'user_allowed_offline_desktop',
    reverseMeaningForUser: true,
    dbNameForUser: 'allowed_offline_desktop',
  },
  DISABLE_OFFLINE_MODE_DEFAULT_MOBILE: {
    banksTitle: 'sasettings_disable_offline_mobile',
    recommendedValue: false,
    userTitle: 'user_allowed_offline_mobile',
    reverseMeaningForUser: true,
    dbNameForUser: 'allowed_offline_mobile',
  },
  ALLOWED_TO_EXPORT: {
    banksTitle: 'sasettings_allow_csv_export',
    recommendedValue: false,
    userTitle: 'user_allowed_csv_export',
    reverseMeaningForUser: false,
    dbNameForUser: 'allowed_to_export',
  },
  ALLOWED_WINDOWS: {
    banksTitle: 'sasettings_allow_windows',
    recommendedValue: true,
    userTitle: 'user_allow_windows',
    reverseMeaningForUser: false,
  },
  ALLOWED_MACOS: {
    banksTitle: 'sasettings_allow_macos',
    recommendedValue: true,
    userTitle: 'user_allow_macos',
    reverseMeaningForUser: false,
  },
  ALLOWED_LINUX: {
    banksTitle: 'sasettings_allow_linux',
    recommendedValue: true,
    userTitle: 'user_allow_linux',
    reverseMeaningForUser: false,
  },
  ALLOWED_IOS: {
    banksTitle: 'sasettings_allow_ios',
    recommendedValue: true,
    userTitle: 'user_allow_ios',
    reverseMeaningForUser: false,
  },
  ALLOWED_ANDROID: {
    banksTitle: 'sasettings_allow_android',
    recommendedValue: true,
    userTitle: 'user_allow_android',
    reverseMeaningForUser: false,
  },
  ALLOWED_WEB: {
    banksTitle: 'sasettings_allow_web',
    recommendedValue: true,
    userTitle: 'user_allow_web',
    reverseMeaningForUser: false,
  },
  REQUIRE_ADMIN_CHECK_FOR_SECOND_DEVICE: {
    banksTitle: 'sasettings_require_admin_check_for_second_device',
    recommendedValue: false,
    userTitle: null,
  },
  PREVENT_UPDATE_POPUP: {
    banksTitle: 'sasettings_prevent_update_popup',
    recommendedValue: false,
    userTitle: null,
  },
  FORCE_SAFE_BROWSER_SETUP: {
    banksTitle: 'sasettings_force_safe_browser_setup',
    recommendedValue: false,
    userTitle: 'user_force_safe_browser_setup',
  },
};

// NB :
//  - When null, the value will be considered as "recommendedValue"
const autolockDelaysDesktop = [
  { title: '0s', seconds: 0 },
  { title: '30s', seconds: 30 },
  { title: '45s', seconds: 45 },
  { title: '1min', seconds: 60 },
  { title: '3min', seconds: 180 },
  { title: '5min', seconds: 300 },
  { title: '15min', seconds: 900 },
  { title: '30min', seconds: 1800 },
  { title: '1h', seconds: 3600 },
  { title: '3h', seconds: 10800 },
  { title: '6h', seconds: 21600 },
  { title: '12h', seconds: 43200 },
];
const autolockDelaysMobile = [
  { title: '0s', seconds: 0 },
  { title: '30s', seconds: 30 },
  { title: '45s', seconds: 45 },
  { title: '1min', seconds: 60 },
  { title: '3min', seconds: 180 },
  { title: '5min', seconds: 300 },
  { title: '15min', seconds: 900 },
  { title: '30min', seconds: 1800 },
];
export const autolockDelaySettings = {
  DEFAULT_AUTOLOCK_DELAY_DESKTOP: {
    banksTitle: 'sasettings_default_autolock_delay_desktop',
    recommendedOption: 1800, // 30'
    options: autolockDelaysDesktop,
    maxSettingKey: 'MAX_AUTOLOCK_DELAY_DESKTOP',
  },
  MAX_AUTOLOCK_DELAY_DESKTOP: {
    banksTitle: 'sasettings_max_autolock_delay_desktop',
    recommendedOption: 43200, // 12h
    options: autolockDelaysDesktop,
    defaultSettingKey: 'DEFAULT_AUTOLOCK_DELAY_DESKTOP',
  },
  DEFAULT_AUTOLOCK_DELAY_MOBILE: {
    banksTitle: 'sasettings_default_autolock_delay_mobile',
    recommendedOption: 30, // 30"
    options: autolockDelaysMobile,
    maxSettingKey: 'MAX_AUTOLOCK_DELAY_MOBILE',
  },
  MAX_AUTOLOCK_DELAY_MOBILE: {
    banksTitle: 'sasettings_max_autolock_delay_mobile',
    recommendedOption: 1800, // 30'
    options: autolockDelaysMobile,
    defaultSettingKey: 'DEFAULT_AUTOLOCK_DELAY_MOBILE',
  },
};
