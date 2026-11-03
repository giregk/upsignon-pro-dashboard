import express from 'express';
import { authorize_device } from './authorize_device';
import { copy_urls_from_bank } from './copy_urls_from_bank';
import { count_password_reset_requests } from './count_password_reset_requests';
import { count_shared_devices } from './count_shared_devices';
import { count_users } from './count_users';
import { deactivate_device } from './deactivate_device';
import { deactivate_device_all_users } from './deactivate_device_all_users';
import { delete_allowed_email } from './delete_allowed_email';
import { delete_device } from './delete_device';
import { delete_bank_admin } from './delete_bank_admin';
import { delete_pwd_reset_request } from './delete_pwd_reset_request';
import { delete_url } from './delete_url';
import { delete_user } from './delete_user';
import { check_user_shamir_involvement } from './shamir/check_user_shamir_involvement';
import { extract_database } from './extract_database';
import { extract_emails_for_duplicate_passwords } from './extract_emails_for_duplicate_passwords';
import { extract_emails_for_long_unused } from './extract_emails_for_long_unused';
import { extract_emails_for_medium_passwords } from './extract_emails_for_medium_passwords';
import { extract_emails_for_shared_device } from './extract_emails_for_shared_device';
import { extract_emails_for_weak_passwords } from './extract_emails_for_weak_passwords';
import { get_allowed_emails } from './get_allowed_emails';
import { get_bank_admins } from './get_bank_admins';
import { get_bank_settings } from './get_bank_settings';
import { get_password_stats } from './get_password_stats';
import { get_password_reset_requests } from './get_password_reset_requests';
import { get_shared_devices } from './get_shared_devices';
import { get_urls } from './get_urls';
import { get_usage_stats } from './get_usage_stats';
import { get_users } from './get_users';
import { get_user_devices } from './get_user_devices';
import { grant_pwd_reset_request } from './grant_pwd_reset_request';
import { insert_allowed_email } from './insert_allowed_email';
import { insert_bank_admin } from './insert_bank_admin';
import { insert_url } from './insert_url';
import { update_allowed_email } from './update_allowed_email';
import { toggle_passwordless_auth } from './toggle_passwordless_auth';
import { update_bank } from './update_bank';
import { update_url } from './update_url';
import { update_user_email } from './update_user_email';
import { get_shared_vaults } from './get_shared_vaults';
import { count_shared_vaults } from './count_shared_vaults';
import { delete_shared_vault_user } from './delete_shared_vault_user';
import { update_shared_vault_access_level } from './update_shared_vault_access_level';
import { send_email, send_email_precheck } from './send_email';
import { update_user_setting } from './update_user_setting';
import { extract_emails_msi_install } from './extract_emails_msi_install';
import { getRedirectionUrl } from './get_redirection_url';
import { get_bank_entra_config } from './get_bank_entra_config';
import { test_ms_entra } from './test_ms_entra';
import { reactivate_user } from './reactivate_user';
import { get_licences } from './get_licences';
import { listMSEntraAPIs, reloadMSEntraInstance } from './reload_ms_entra_instance';
import { get_bank_url } from './get_bank_url';
import { resend_bank_setup_email } from './resend_bank_setup_email';
import { get_bank_sso_config } from './sso/get_bank_sso_config';
import { add_bank_sso_config } from './sso/add_bank_sso_config';
import { delete_bank_sso_config } from './sso/delete_bank_sso_config';
import { getNextShamirConfigIndex } from './shamir/shamir_next_config_index';
import { shamirSearchUsers } from './shamir/shamir_search_users';
import { shamirCreateConfig } from './shamir/shamir_create_config';
import { getShamirConfigs } from './shamir/shamir_configs';
import { cancelPendingConfig } from './shamir/shamir_cancel_pending_config';
import { shamirRequests } from './shamir/shamir_requests';
import { inviteRateLimiter, sendAdminInviteAuthenticated } from '../login/get_admin_invite';

export const apiRouter = express.Router();

apiRouter.use(async (req: any, res: any, next) => {
  if (
    req.session.adminRole !== 'superadmin' &&
    req.session.adminRole !== 'restricted_superadmin' &&
    !req.session.banks?.includes(req.proxyParamsBankId)
  ) {
    console.error('Unauthorized for bank ' + req.proxyParamsBankId);
    return res.status(401).end();
  }
  next();
});

apiRouter.get('/bank_url', get_bank_url);
apiRouter.post('/resend-bank-setup-email', resend_bank_setup_email);

// Users
apiRouter.get('/users', get_users);
apiRouter.get('/count-users', count_users);
apiRouter.post('/delete-user/:userId', delete_user);
apiRouter.post('/update-user-email', update_user_email);
apiRouter.post('/update-user-setting', update_user_setting);
apiRouter.post('/reactivate-user/:userId', reactivate_user);

// Devices
apiRouter.get('/user-devices/:userId', get_user_devices);
apiRouter.post('/delete-device/:deviceId', delete_device);
apiRouter.post('/deactivate-device/:deviceId', deactivate_device);
apiRouter.post('/authorize-device/:deviceId', authorize_device);

// Shared devices
apiRouter.get('/shared-devices', get_shared_devices);
apiRouter.post('/deactivate-device-all-users/:deviceId', deactivate_device_all_users);
apiRouter.get('/count-shared-devices', count_shared_devices);

// Password reset requests
apiRouter.get('/count-password-reset-requests', (req, res) =>
  count_password_reset_requests(req, res, false),
);
apiRouter.post('/get-password-reset-requests', (req, res) =>
  get_password_reset_requests(req, res, false),
);
apiRouter.post('/delete-pwd-reset-request/:requestId', (req, res) =>
  delete_pwd_reset_request(req, res, false),
);
apiRouter.post('/grant-pwd-reset-request/:requestId', (req, res) =>
  grant_pwd_reset_request(req, res, false),
);

// Shared vaults
apiRouter.get('/shared-vaults', get_shared_vaults);
apiRouter.get('/count-shared-vaults', count_shared_vaults);
apiRouter.post('/delete-shared-vault-user', delete_shared_vault_user);
apiRouter.post('/update-shared-vault-manager', update_shared_vault_access_level);

// Stats
apiRouter.get('/get-password-stats', (req, res) => get_password_stats(req, res, false));
apiRouter.get('/get-usage-stats', (req, res) => get_usage_stats(req, res, false));

// Extracts
apiRouter.get('/extract-database', (req, res) => extract_database(req, res, false));
apiRouter.get('/extract-emails-for-duplicate-passwords', (req, res) =>
  extract_emails_for_duplicate_passwords(req, res, false),
);
apiRouter.get('/extract-emails-for-weak-passwords', (req, res) =>
  extract_emails_for_weak_passwords(req, res, false),
);
apiRouter.get('/extract-emails-for-medium-passwords', (req, res) =>
  extract_emails_for_medium_passwords(req, res, false),
);
apiRouter.get('/extract-emails-for-shared-device', (req, res) =>
  extract_emails_for_shared_device(req, res, false),
);
apiRouter.get('/extract-emails-for-long-unused', (req, res) =>
  extract_emails_for_long_unused(req, res, false),
);
apiRouter.get('/extract-emails-msi-install', (req, res) =>
  extract_emails_msi_install(req, res, false),
);

// Send emails
apiRouter.post('/send-email-precheck', (req, res) => send_email_precheck(req, res, false));
apiRouter.post('/send-email', (req, res) => send_email(req, res, false));

// Allowed emails
apiRouter.get('/allowed-emails', get_allowed_emails);
apiRouter.post('/delete-allowed-email/:id', delete_allowed_email);
apiRouter.post('/update-allowed-email', update_allowed_email);
apiRouter.post('/insert-allowed-email', insert_allowed_email);
apiRouter.post('/toggle-passwordless-auth', toggle_passwordless_auth);

// Urls
apiRouter.get('/urls', get_urls);
apiRouter.post('/delete-url/:id', delete_url);
apiRouter.post('/update-url', update_url);
apiRouter.post('/insert-url', insert_url);
apiRouter.post('/copy_urls_from_bank', copy_urls_from_bank);

// Admins
apiRouter.post('/delete-admin/:id', delete_bank_admin);
apiRouter.post('/insert-admin', insert_bank_admin);
apiRouter.get('/bank-admins', get_bank_admins);
apiRouter.post('/send_admin_invite_if_exists', inviteRateLimiter, sendAdminInviteAuthenticated);

// Settings
apiRouter.get('/bank-settings', get_bank_settings);
apiRouter.post('/bank-settings-update', update_bank);

// SERVER REDIRECTION
apiRouter.get('/redirection_url', getRedirectionUrl);

// Microsoft Entra
apiRouter.get('/bank-entra-config', get_bank_entra_config);
apiRouter.post('/bank-entra-config-update', update_bank);
apiRouter.post('/reload-ms-entra-instance', reloadMSEntraInstance);
apiRouter.post('/test-ms-entra', test_ms_entra);
apiRouter.get('/list-ms-entra-apis', listMSEntraAPIs);

// SSO CONFIG
apiRouter.get('/sso_configurations', get_bank_sso_config);
apiRouter.post('/add_sso_configuration', add_bank_sso_config);
apiRouter.post('/delete_sso_configuration', delete_bank_sso_config);

// Licences
apiRouter.get('/licences', (req, res) => get_licences(req, res, false));

// SHAMIR
apiRouter.post('/shamir-index', getNextShamirConfigIndex);
apiRouter.post('/shamir-search-users', shamirSearchUsers);
apiRouter.post('/shamir-create-config', shamirCreateConfig);
apiRouter.post('/shamir-configs', getShamirConfigs);
apiRouter.post('/shamir-cancel-pending-config', cancelPendingConfig);
apiRouter.post('/shamir-requests', shamirRequests);
apiRouter.post('/check-user-shamir-involvement/:userId', check_user_shamir_involvement);
