import { db } from '../helpers/db';
import { logError } from '../helpers/logger';
import { hasAvailableLicence } from '../helpers/licenceCheck';

export const unarchive_user = async (req: any, res: any): Promise<void> => {
  try {
    if (req.session.adminRole === 'restricted_superadmin') {
      return res.status(401).end();
    }
    const userId = req.params.userId;
    const bankId = req.proxyParamsBankId;
    if (!(await hasAvailableLicence(bankId))) {
      return res.status(403).json({ error: 'no_more_licence' });
    }
    await db.query(`UPDATE users SET archived=null WHERE id=$1 AND bank_id=$2`, [
      userId,
      bankId,
    ]);
    res.status(200).end();
  } catch (e) {
    logError('unarchive_user', e);
    res.status(400).end();
  }
};
