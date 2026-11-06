import { db } from './helpers/db';
import { logError } from './helpers/logger';

export const get_available_banks = async (req: any, res: any): Promise<void> => {
  try {
    const directBanks = await db.query(
      `SELECT
        b.id,
        b.name,
        b.reseller_id,
        b.created_at,
        COUNT(DISTINCT u.id) AS nb_users
      FROM banks AS b
      LEFT JOIN users AS u
        ON u.bank_id=b.id AND (u.archived IS NOT TRUE)
      GROUP BY b.id
      ORDER BY b.name ASC`,
    );

    if (
      req.session.adminRole !== 'superadmin' &&
      req.session.adminRole !== 'restricted_superadmin'
    ) {
      const resellersRes = await db.query(
        `SELECT
          resellers.id,
          resellers.name
        FROM resellers
        INNER JOIN admins on admins.reseller_id=resellers.id
        WHERE admins.id=$1
        ORDER BY name ASC`,
        [req.session.adminId],
      );
      const filteredBanks = directBanks.rows.filter((b) => req.session.banks?.includes(b.id));
      if (filteredBanks.length === 0 && resellersRes.rows.length === 0) {
        // this case should not happen
        req.destroy();
        logError('get_available_banks filteredBanks.length === 0');
        return res.status(401).end();
      }
      return res.status(200).json({
        banks: filteredBanks,
        resellers: resellersRes.rows,
        adminRole: req.session.adminRole,
      });
    }

    // superadmin or restricted_superadmin case
    const resellersRes = await db.query(
      `SELECT
        id,
        name
      FROM resellers
      ORDER BY name ASC`,
    );
    res.status(200).json({
      banks: directBanks.rows,
      resellers: resellersRes.rows,
      adminRole: req.session.adminRole,
    });
  } catch (e) {
    logError('get_available_banks', e);
    res.status(400).end();
  }
};
