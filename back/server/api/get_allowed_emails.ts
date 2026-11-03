import { db } from '../helpers/db';
import { logError } from '../helpers/logger';

export const get_allowed_emails = async (req: any, res: any): Promise<void> => {
  try {
    const dbRes = await db.query(
      'SELECT id, pattern, uses_passwordless_auth FROM allowed_emails WHERE bank_id=$1 ORDER BY id ASC',
      [req.proxyParamsBankId],
    );
    res.status(200).send(dbRes.rows);
  } catch (e) {
    logError('get_allowed_emails', e);
    res.status(400).end();
  }
};
