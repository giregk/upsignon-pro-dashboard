import { db } from '../helpers/db';
import { logError } from '../helpers/logger';

export const archive_user = async (req: any, res: any): Promise<void> => {
  try {
    if (req.session.adminRole === 'restricted_superadmin') {
      return res.status(401).end();
    }
    const userId = req.params.userId;
    await db.query(`UPDATE users SET archived=true WHERE id=$1 AND bank_id=$2`, [
      userId,
      req.proxyParamsBankId,
    ]);
    res.status(200).end();
  } catch (e) {
    logError('archive_user', e);
    res.status(400).end();
  }
};
