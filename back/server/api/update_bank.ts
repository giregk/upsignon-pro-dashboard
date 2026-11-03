import { db } from '../helpers/db';
import { logError } from '../helpers/logger';
import Joi from 'joi';

// Keep in sync with front/src/helpers/settingsConfig.js (settingsConfig + autolockDelaySettings keys).
// Any key NOT in this list (e.g. IS_TESTING, TESTING_EXPIRATION_DATE, SALES_REP) is reserved for
// reseller/superadmin management and must never be settable by a bank-level admin.
const EDITABLE_BANK_SETTINGS_KEYS = [
  'DISABLE_MANUAL_VALIDATION_FOR_PASSWORD_FORGOTTEN',
  'DISABLE_OFFLINE_MODE_DEFAULT_DESKTOP',
  'DISABLE_OFFLINE_MODE_DEFAULT_MOBILE',
  'ALLOWED_TO_EXPORT',
  'ALLOWED_WINDOWS',
  'ALLOWED_MACOS',
  'ALLOWED_LINUX',
  'ALLOWED_IOS',
  'ALLOWED_ANDROID',
  'REQUIRE_ADMIN_CHECK_FOR_SECOND_DEVICE',
  'PREVENT_UPDATE_POPUP',
  'FORCE_SAFE_BROWSER_SETUP',
  'DEFAULT_AUTOLOCK_DELAY_DESKTOP',
  'MAX_AUTOLOCK_DELAY_DESKTOP',
  'DEFAULT_AUTOLOCK_DELAY_MOBILE',
  'MAX_AUTOLOCK_DELAY_MOBILE',
];

export const update_bank = async (req: any, res: any): Promise<void> => {
  try {
    if (req.body.name) {
      await db.query('UPDATE banks SET name=$1 WHERE id=$2', [
        req.body.name,
        req.proxyParamsBankId,
      ]);
    }
    if (req.body.settings) {
      if (req.session.adminRole === 'restricted_superadmin') {
        return res.status(401).end();
      }
      const prevSettingsRes = await db.query('SELECT settings FROM banks WHERE id=$1', [
        req.proxyParamsBankId,
      ]);
      const prevSettings = prevSettingsRes.rows[0]?.settings ?? {};
      const newSettings = { ...prevSettings };
      for (const key of EDITABLE_BANK_SETTINGS_KEYS) {
        if (key in req.body.settings) {
          newSettings[key] = req.body.settings[key];
        }
      }
      await db.query('UPDATE banks SET settings=$1 WHERE id=$2', [
        newSettings,
        req.proxyParamsBankId,
      ]);
    }
    if (req.body.msEntraConfig) {
      if (req.session.adminRole === 'restricted_superadmin') {
        return res.status(401).end();
      }
      if (
        typeof req.body.msEntraConfig.clientSecret === 'string' &&
        /^[*]+$/.test(req.body.msEntraConfig.clientSecret)
      ) {
        // clientSecret contains only asterisques, do not update it.
        const dbRes = await db.query(`SELECT ms_entra_config FROM banks WHERE id=$1`, [
          req.proxyParamsBankId,
        ]);
        const previousConfig = dbRes.rows[0].ms_entra_config || {};
        req.body.msEntraConfig.clientSecret = previousConfig.clientSecret;
      }

      await db.query('UPDATE banks SET ms_entra_config=$1 WHERE id=$2', [
        req.body.msEntraConfig,
        req.proxyParamsBankId,
      ]);
    }
    if (req.body.msEntraVaultsPasswordlessAuth !== undefined) {
      if (req.session.adminRole === 'restricted_superadmin') {
        return res.status(401).end();
      }
      try {
        Joi.assert(req.body.msEntraVaultsPasswordlessAuth, Joi.boolean().required());
      } catch (e) {
        console.error(e);
        return res.status(400).end();
      }
      await db.query('UPDATE banks SET ms_entra_vaults_use_passwordless_auth=$1 WHERE id=$2', [
        req.body.msEntraVaultsPasswordlessAuth,
        req.proxyParamsBankId,
      ]);
    }
    res.status(200).end();
  } catch (e) {
    logError('update_bank', e);
    res.status(400).end();
  }
};
