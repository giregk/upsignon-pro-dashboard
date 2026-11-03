import { db } from '../helpers/db';
import { logError } from '../helpers/logger';

export const get_bank_entra_config = async (req: any, res: any): Promise<void> => {
  try {
    const dbRes = await db.query(
      `SELECT ms_entra_config, ms_entra_vaults_use_passwordless_auth FROM banks WHERE id=$1`,
      [req.proxyParamsBankId],
    );
    const config = dbRes.rows[0].ms_entra_config || {};
    const msEntraVaultsPasswordlessAuth =
      dbRes.rows[0].ms_entra_vaults_use_passwordless_auth || false;
    const maskedConfig = { ...config };
    if (maskedConfig.clientSecret) {
      maskedConfig.clientSecret = '*'.repeat(config.clientSecret.length);
    }

    res.status(200).send({ ...maskedConfig, msEntraVaultsPasswordlessAuth });
  } catch (e) {
    logError('get_bank_entra_config', e);
    res.status(400).end();
  }
};
