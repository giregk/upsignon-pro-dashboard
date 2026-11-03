import Joi from 'joi';
import { db } from '../helpers/db';
import { logError } from '../helpers/logger';

export const toggle_passwordless_auth = async (req: any, res: any): Promise<void> => {
  try {
    if (req.session.adminRole === 'restricted_superadmin') {
      return res.status(401).end();
    }
    const allowedEmailId = req.body.allowedEmailId;
    const usesPasswordlessAuth = req.body.usesPasswordlessAuth;
    try {
      Joi.assert(allowedEmailId, Joi.number().integer().required());
      Joi.assert(usesPasswordlessAuth, Joi.boolean().required());
    } catch (e) {
      console.error(e);
      return res.status(400).end();
    }
    await db.query(
      `UPDATE allowed_emails SET uses_passwordless_auth=$1 WHERE id=$2 AND bank_id=$3`,
      [usesPasswordlessAuth, allowedEmailId, req.proxyParamsBankId],
    );
    res.status(200).end();
  } catch (e) {
    logError('toggle_passwordless_auth', e);
    res.status(400).end();
  }
};
