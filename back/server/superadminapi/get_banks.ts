import { db } from '../helpers/db';
import { logError } from '../helpers/logger';

export const get_banks = async (req: any, res: any): Promise<void> => {
  try {
    const dbRes = await db.query(
      `SELECT
        banks.created_at,
        banks.id,
        banks.name,
        banks.settings,
        COUNT(users.id) AS nb_users,
        banks.reseller_id,
        resellers.name as reseller_name
      FROM banks
      LEFT JOIN resellers ON resellers.id=banks.reseller_id
      LEFT JOIN users ON users.bank_id=banks.id AND (users.archived IS NOT TRUE)
      GROUP BY banks.id, resellers.id
      ORDER BY resellers.name ASC, banks.name ASC`,
    );
    const banks = dbRes.rows;
    for (let i = 0; i < banks.length; i++) {
      const nbLicences = await countAvailableLicences(banks[i].id);
      banks[i].nb_licences = nbLicences;
    }
    res.status(200).send(dbRes.rows);
  } catch (e) {
    logError('get_banks', e);
    res.status(400).end();
  }
};

const countAvailableLicences = async (bankId: number) => {
  const internalLicences = await db.query(
    `SELECT
    il.nb_licences
    FROM internal_licences AS il
    INNER JOIN external_licences AS el ON il.external_licences_id=el.ext_id
    WHERE il.bank_id=$1
    AND (el.valid_from <= current_timestamp(0) AND ((el.is_monthly=true AND el.to_be_renewed != false) OR current_timestamp(0) < el.valid_until))
    `,
    [bankId],
  );
  const externalLicences = await db.query(
    `SELECT
    el.nb_licences
    FROM external_licences AS el
    WHERE el.bank_id=$1
    AND (el.valid_from <= current_timestamp(0) AND ((el.is_monthly=true AND el.to_be_renewed != false) OR current_timestamp(0) < el.valid_until))
    `,
    [bankId],
  );
  let bankSpecificNbLicences = 0;
  if (internalLicences.rows.length > 0) {
    for (let i = 0; i < internalLicences.rows.length; i++) {
      bankSpecificNbLicences += internalLicences.rows[i].nb_licences;
    }
  }
  if (externalLicences.rows.length > 0) {
    for (let i = 0; i < externalLicences.rows.length; i++) {
      bankSpecificNbLicences += externalLicences.rows[i].nb_licences;
    }
  }
  return bankSpecificNbLicences;
};
