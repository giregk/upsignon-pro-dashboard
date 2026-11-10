import { Request } from 'express';
import { AdminRoles } from './adminRoles';
import { db } from './db';
import env from './env';
import { logError } from './logger';

export type SessionData = {
  adminEmail: string;
  adminId: string;
  adminRole: AdminRoles;
  banks: number[];
  resellerId: string | null;
};
export const recomputeSessionAuthorizationsForAdminByEmail = async (
  email: string,
  req?: Request,
): Promise<void> => {
  try {
    const adminRes = await db.query(`SELECT id FROM admins WHERE email=$1`, [email]);

    if (adminRes.rows.length === 0) {
      return;
    }
    await recomputeSessionAuthorizationsForAdminById(adminRes.rows[0].id, req);
  } catch (e) {
    logError('updateSessionAuthorizations', e);
    return;
  }
};

const computeAdminRole = (adminEmail: string, dbRole: AdminRoles): AdminRoles => {
  if (
    !env.IS_PRODUCTION &&
    !env.DEV_FALLBACK_USE_DB_ROLE &&
    adminEmail === env.DEV_FALLBACK_ADMIN_EMAIL
  ) {
    return 'superadmin';
  }
  return dbRole;
};

// Recomputes the authorizations of all the admins of a reseller using a constant number of
// queries (it does not depend on the number of admins).
// The current admin's session (req.session) is updated before this function resolves, so that the
// response can safely be sent right after. The sessions stored in DB for the other admins are
// updated in the background (errors are logged), the caller does not need to wait for them.
export const recomputeSessionAuthorizationsForAdminsByResellerId = async (
  resellerId: string,
  req?: Request,
): Promise<void> => {
  try {
    const [adminsRes, banksInResellerRes] = await Promise.all([
      db.query('SELECT id, email, admin_role FROM admins WHERE reseller_id=$1', [resellerId]),
      db.query('SELECT id FROM banks WHERE reseller_id=$1', [resellerId]),
    ]);
    if (adminsRes.rows.length === 0) {
      return;
    }
    const adminIds: string[] = adminsRes.rows.map((a) => a.id);
    const adminBanksRes = await db.query(
      'SELECT admin_id, bank_id FROM admin_banks WHERE admin_id = ANY($1)',
      [adminIds],
    );
    const resellerBankIds: number[] = banksInResellerRes.rows.map((b) => b.id);
    const directBanksByAdmin = new Map<string, number[]>();
    for (const row of adminBanksRes.rows) {
      const list = directBanksByAdmin.get(row.admin_id) ?? [];
      list.push(row.bank_id);
      directBanksByAdmin.set(row.admin_id, list);
    }

    // @ts-ignore
    const currentAdminId = req?.session?.adminId;
    const otherAdmins: {
      adminId: string;
      adminEmail: string;
      adminRole: AdminRoles;
      banks: number[];
    }[] = [];
    for (const admin of adminsRes.rows) {
      const bankIds = [...(directBanksByAdmin.get(admin.id) ?? [])];
      for (const b of resellerBankIds) {
        if (bankIds.indexOf(b) === -1) {
          bankIds.push(b);
        }
      }
      const adminRole = computeAdminRole(admin.email, admin.admin_role);
      if (req && admin.id === currentAdminId) {
        // @ts-ignore
        req.session.adminEmail = admin.email;
        // @ts-ignore
        req.session.adminId = admin.id;
        // @ts-ignore
        req.session.adminRole = adminRole;
        // @ts-ignore
        req.session.banks = bankIds;
        // @ts-ignore
        req.session.resellerId = resellerId;
        // NB, do not do 'req.session =', this breaks the system
      } else {
        otherAdmins.push({ adminId: admin.id, adminEmail: admin.email, adminRole, banks: bankIds });
      }
    }

    if (otherAdmins.length > 0) {
      updateStoredSessions(otherAdmins, resellerId).catch((e) =>
        logError('updateSessionAuthorizations background', e),
      );
    }
  } catch (e) {
    logError('updateSessionAuthorizations', e);
    return;
  }
};

const updateStoredSessions = async (
  admins: { adminId: string; adminEmail: string; adminRole: AdminRoles; banks: number[] }[],
  resellerId: string,
): Promise<void> => {
  const sessionsRes = await db.query(
    "SELECT session_id, session_data FROM admin_sessions WHERE session_data ->> 'adminEmail' = ANY($1)",
    [admins.map((a) => a.adminEmail)],
  );
  const adminsByEmail = new Map(admins.map((a) => [a.adminEmail, a]));
  for (const session of sessionsRes.rows) {
    const admin = adminsByEmail.get(session.session_data.adminEmail);
    if (!admin) continue;
    const newSession = {
      ...session.session_data,
      adminEmail: admin.adminEmail,
      adminId: admin.adminId,
      adminRole: admin.adminRole,
      banks: admin.banks,
      resellerId,
    };
    await db.query(`UPDATE admin_sessions SET session_data = $1 WHERE session_id = $2`, [
      newSession,
      session.session_id,
    ]);
  }
};

export const recomputeSessionAuthorizationsForAdminById = async (
  adminId: string,
  req?: Request | null,
): Promise<void> => {
  try {
    const adminRes = await db.query(
      'SELECT email, admin_role, reseller_id FROM admins WHERE id=$1',
      [adminId],
    );
    if (adminRes.rows.length === 0) {
      return;
    }
    const adminEmail = adminRes.rows[0].email;

    let adminRole = adminRes.rows[0].admin_role;
    if (
      !env.IS_PRODUCTION &&
      !env.DEV_FALLBACK_USE_DB_ROLE &&
      adminEmail === env.DEV_FALLBACK_ADMIN_EMAIL
    ) {
      adminRole = 'superadmin';
    }
    const resellerId = adminRes.rows[0].reseller_id;
    const banksRes = await db.query('SELECT bank_id FROM admin_banks WHERE admin_id=$1', [adminId]);
    const banksInResellerRes = await db.query('SELECT id FROM banks WHERE reseller_id=$1', [
      resellerId,
    ]);
    const bankIds = [...banksRes.rows.map((b) => b.bank_id)];
    for (let b of banksInResellerRes.rows) {
      if (bankIds.indexOf(b.id) === -1) {
        bankIds.push(b.id);
      }
    }
    if (req) {
      // @ts-ignore
      req.session.adminEmail = adminEmail;
      // @ts-ignore
      req.session.adminId = adminId;
      // @ts-ignore
      req.session.adminRole = adminRole;
      // @ts-ignore
      req.session.banks = bankIds;
      // @ts-ignore
      req.session.resellerId = resellerId;
      // NB, do not do 'req.session =', this breaks the system
    } else {
      const sessionRes = await db.query(
        "SELECT session_id, session_data FROM admin_sessions WHERE session_data ->> 'adminEmail' = $1",
        [adminEmail],
      );
      if (sessionRes.rows.length > 0) {
        const newSession = {
          ...sessionRes.rows[0].session_data,
          adminEmail,
          adminId,
          adminRole,
          banks: bankIds,
          resellerId,
        };
        await db.query(`UPDATE admin_sessions SET session_data = $1 WHERE session_id = $2`, [
          newSession,
          sessionRes.rows[0].session_id,
        ]);
      }
    }
  } catch (e) {
    logError('updateSessionAuthorizationsForAdmin', e);
  }
};
