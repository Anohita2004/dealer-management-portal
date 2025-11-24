const { User, Message, Role, Dealer, sequelize, Op } = require('../models');


// ------------------------------------------------------------
// ROLE CHAT RULES BASED ON YOUR REAL ROLES TABLE
// ------------------------------------------------------------
//
// 1 → super_admin
// 2 → technical_admin
// 3 → regional_admin
// 4 → finance_admin
// 5 → regional_manager
// 6 → area_manager
// 7 → territory_manager
// 8 → dealer_admin
// 9 → dealer_staff
// 10 → inventory_user
// 11 → accounts_user
//
// ------------------------------------------------------------
// CHAT FLOW BASED ON REAL-WORLD USE
// ------------------------------------------------------------
const CHAT_FLOW = {
  dealer_staff: ["dealer_admin"],
  dealer_admin: ["area_manager", "regional_manager"],

  area_manager: ["regional_manager"],
  regional_manager: ["territory_manager"],

  territory_manager: ["regional_admin", "finance_admin"],

  finance_admin: ["technical_admin"],
  regional_admin: ["technical_admin"],
  technical_admin: ["super_admin"],

  super_admin: [],

  inventory_user: [],
  accounts_user: [],
};

function normalize(role) {
  return String(role || "").toLowerCase().trim();
}

// ------------------------------------------------------------
// FIND USERS BASED ON REAL DB STRUCTURE
// ------------------------------------------------------------
async function findTargets(me, targetRoleSlug) {
  const where = {};

  const targetRole = await Role.findOne({ where: { name: targetRoleSlug } });
  if (!targetRole) return [];

  where.roleId = targetRole.id;

  // relationship rules ONLY using fields your DB actually contains
  if (targetRoleSlug.includes("dealer")) {
    if (!me.dealerId) return [];
    where.dealerId = me.dealerId;
  }

  if (targetRoleSlug.includes("regional") || targetRoleSlug.includes("finance")) {
    if (!me.regionId) return [];
    where.regionId = me.regionId;
  }

  return await User.findAll({
    where,
    attributes: ["id", "username", "email", "roleId", "dealerId", "regionId"],
    include: [{ model: Role, as: "roleDetails" }],
    order: [["username", "ASC"]],
  });
}

// ------------------------------------------------------------
// GET ALLOWED USERS
// ------------------------------------------------------------
// src/controllers/chatController.js  (only the getAllowedUsers part / helper functions)





/**
 * Helper: load current user fresh including role slug
 */
async function loadCurrentUser(userId) {
  return User.findByPk(userId, {
    attributes: ['id', 'username', 'dealerId', 'regionId', 'roleId'],
    include: [{ model: Role, as: 'roleDetails', attributes: ['id', 'name'] }]
  });
}

/**
 * Helper: fetch users by role slug with optional filters
 */
async function fetchUsersByRoleSlug(roleSlug, filters = {}) {
  const where = {};
  if (filters.regionId) where.regionId = filters.regionId;
  if (filters.dealerId) where.dealerId = filters.dealerId;

  // Find roleId for the slug if exists
  const role = await Role.findOne({ where: { name: roleSlug }, attributes: ['id', 'name'] });
  if (role) {
    where.roleId = role.id;
  } else {
    // fallback: try to match Users.role text column (legacy)
    where.role = roleSlug;
  }

  // Don't return system users that are disabled etc (optional)
  // where.isActive = true;

  return User.findAll({
    where,
    attributes: ['id', 'username', 'roleId', 'dealerId', 'regionId'],
    order: [['username', 'ASC']],
  });
}

/**
 * Main: GET /api/chat/allowed-users
 */
exports.getAllowedUsers = async (req, res) => {
  try {
    const meId = req.user.id;
    const me = await loadCurrentUser(meId);
    if (!me) return res.status(404).json({ error: 'User not found' });

    const myRoleSlug = me.roleDetails?.name || null;
    if (!myRoleSlug) return res.json({ users: [] });

    // We'll accumulate candidates in this array
    const results = [];
    const pushUnique = (list) => {
      for (const u of list) {
        if (!results.some(x => String(x.id) === String(u.id)) && String(u.id) !== String(meId)) {
          results.push(u);
        }
      }
    };

    // Admin roles (global contacts)
    const adminRoles = ['super_admin', 'technical_admin', 'regional_admin', 'finance_admin'];

    // RULES mapping (based on your Option B)
    switch (myRoleSlug) {
      case 'super_admin':
      case 'technical_admin':
        // Both can talk to all admins (global) and to everyone else if desired — we'll return all admins + managers + dealers
        {
          // all admins (global)
          const admins = await User.findAll({
            include: [{ model: Role, as: 'roleDetails', attributes: ['name'] }],
            where: {
              [Op.or]: [
                { roleId: { [Op.in]: sequelize.literal(`(SELECT id FROM roles WHERE name IN ('super_admin','technical_admin','regional_admin','finance_admin'))`) } },
                { role: 'admin' } // fallback
              ]
            },
            attributes: ['id', 'username', 'roleId', 'dealerId', 'regionId'],
            order: [['username', 'ASC']],
            limit: 500
          });
          pushUnique(admins);
          // Also include managers and dealer admins (global)
          const managerRoles = ['regional_manager', 'territory_manager', 'area_manager'];
          for (const m of managerRoles) {
            const list = await fetchUsersByRoleSlug(m);
            pushUnique(list);
          }
          const dealers = await fetchUsersByRoleSlug('dealer_admin');
          const dealerStaff = await fetchUsersByRoleSlug('dealer_staff');
          pushUnique(dealers);
          pushUnique(dealerStaff);
        }
        break;

      case 'regional_admin':
        // regional_admin: admins (global) + regional_manager in same region
        {
          // admins global
          const admins = await fetchUsersByRoleSlug('technical_admin');
          pushUnique(admins);
          pushUnique(await fetchUsersByRoleSlug('super_admin'));
          pushUnique(await fetchUsersByRoleSlug('finance_admin'));
          // regional managers in same region
          if (me.regionId) {
            pushUnique(await fetchUsersByRoleSlug('regional_manager', { regionId: me.regionId }));
          }
        }
        break;

      case 'finance_admin':
        // finance_admin -> accounts_user (same region) + admins
        {
          pushUnique(await fetchUsersByRoleSlug('super_admin'));
          pushUnique(await fetchUsersByRoleSlug('technical_admin'));
          if (me.regionId) {
            pushUnique(await fetchUsersByRoleSlug('accounts_user', { regionId: me.regionId }));
          }
        }
        break;

      case 'regional_manager':
        // regional_manager -> territory_manager (same region) + regional_admin (same region) + dealers in region
        {
          if (me.regionId) {
            pushUnique(await fetchUsersByRoleSlug('territory_manager', { regionId: me.regionId }));
            pushUnique(await fetchUsersByRoleSlug('regional_admin', { regionId: me.regionId })); // regional_admin may be global; filtering by region is safe
            // dealer admins & staff in same region
            // join via dealer -> users with dealerId that has regionId = me.regionId
            const dealersInRegion = await Dealer.findAll({ where: { regionId: me.regionId }, attributes: ['id'] });
            const dealerIds = dealersInRegion.map(d => d.id);
            if (dealerIds.length) {
              const dealerAdmins = await User.findAll({
                where: { roleId: { [Op.in]: sequelize.literal(`(SELECT id FROM roles WHERE name = 'dealer_admin')`) }, dealerId: { [Op.in]: dealerIds } },
                attributes: ['id','username','roleId','dealerId','regionId']
              }).catch(()=>[]);
              pushUnique(dealerAdmins);
              const dealerStaff = await User.findAll({
                where: { roleId: { [Op.in]: sequelize.literal(`(SELECT id FROM roles WHERE name = 'dealer_staff')`) }, dealerId: { [Op.in]: dealerIds } },
                attributes: ['id','username','roleId','dealerId','regionId']
              }).catch(()=>[]);
              pushUnique(dealerStaff);
            }
          }
          // also include regional_admin as admin contact (global)
          pushUnique(await fetchUsersByRoleSlug('regional_admin'));
        }
        break;

      case 'territory_manager':
        // territory_manager -> area_manager (same region) + dealer_admins in same territory (best-effort)
        {
          // area managers in same region
          if (me.regionId) {
            pushUnique(await fetchUsersByRoleSlug('area_manager', { regionId: me.regionId }));
          }
          // dealer admins by territory: since territory is stored on dealer row, get dealers in same territory (best-effort)
          // We'll try to get the territory of a dealer this TM manages (if any), otherwise fallback to same region
          const myDealer = me.dealerId ? await Dealer.findByPk(me.dealerId) : null;
          if (myDealer && myDealer.territory) {
            const dealersSameTerritory = await Dealer.findAll({ where: { territory: myDealer.territory }, attributes: ['id'] });
            const dids = dealersSameTerritory.map(d => d.id);
            if (dids.length) {
              const dd = await User.findAll({ where: { roleId: (await Role.findOne({where:{name:'dealer_admin'}})).id, dealerId: { [Op.in]: dids } }, attributes:['id','username','dealerId','regionId'] });
              pushUnique(dd);
            }
          } else if (me.regionId) {
            // fallback: dealers in same region
            const dealersInRegion = await Dealer.findAll({ where: { regionId: me.regionId }, attributes: ['id'] });
            const dids2 = dealersInRegion.map(d => d.id);
            if (dids2.length) {
              const dd2 = await User.findAll({ where: { roleId: (await Role.findOne({where:{name:'dealer_admin'}})).id, dealerId: { [Op.in]: dids2 } }, attributes:['id','username','dealerId','regionId'] });
              pushUnique(dd2);
            }
          }
        }
        break;

      case 'area_manager':
        // area_manager -> dealer_admins in same region (since no areaId)
        {
          if (me.regionId) {
            const dealers = await Dealer.findAll({ where: { regionId: me.regionId }, attributes: ['id'] });
            const dids = dealers.map(d => d.id);
            if (dids.length) {
              const da = await User.findAll({ where: { roleId: (await Role.findOne({where:{name:'dealer_admin'}})).id, dealerId: { [Op.in]: dids } }, attributes:['id','username','dealerId','regionId']});
              pushUnique(da);
            }
          }
          // include regional_manager as contact
          pushUnique(await fetchUsersByRoleSlug('regional_manager'));
        }
        break;

      case 'dealer_admin':
        // dealer_admin -> dealer_staff (same dealer) + area_manager + regional manager + admins
        {
          if (me.dealerId) {
            const ds = await User.findAll({ where: { roleId: (await Role.findOne({where:{name:'dealer_staff'}})).id, dealerId: me.dealerId }, attributes:['id','username','dealerId','regionId'] });
            pushUnique(ds);
          }
          // area manager for this dealer (via dealer.managerId)
          const dealer = me.dealerId ? await Dealer.findByPk(me.dealerId) : null;
          if (dealer && dealer.managerId) {
            const am = await User.findByPk(dealer.managerId, { attributes:['id','username','roleId','regionId'] });
            if (am) pushUnique([am]);
          }
          // regional manager for dealer.regionId
          if (dealer && dealer.regionId) {
            pushUnique(await fetchUsersByRoleSlug('regional_manager', { regionId: dealer.regionId }));
          }
          // admins
          pushUnique(await fetchUsersByRoleSlug('technical_admin'));
          pushUnique(await fetchUsersByRoleSlug('super_admin'));
        }
        break;

      case 'dealer_staff':
        // dealer_staff -> dealer_admin (same dealer) + admins + regional manager of dealer region
        {
          if (me.dealerId) {
            const dad = await User.findAll({ where: { roleId: (await Role.findOne({where:{name:'dealer_admin'}})).id, dealerId: me.dealerId }, attributes:['id','username','dealerId','regionId'] });
            pushUnique(dad);
          }
          // regional manager of dealer's region
          if (me.dealerId) {
            const dealer = await Dealer.findByPk(me.dealerId);
            if (dealer && dealer.regionId) {
              pushUnique(await fetchUsersByRoleSlug('regional_manager', { regionId: dealer.regionId }));
            }
          }
          // admins
          pushUnique(await fetchUsersByRoleSlug('technical_admin'));
          pushUnique(await fetchUsersByRoleSlug('super_admin'));
        }
        break;

      case 'accounts_user':
        // accounts_user -> finance_admin + admins + dealer_admin in same region
        {
          pushUnique(await fetchUsersByRoleSlug('finance_admin'));
          pushUnique(await fetchUsersByRoleSlug('super_admin'));
          if (me.regionId) {
            const dealers = await Dealer.findAll({ where: { regionId: me.regionId }, attributes: ['id'] });
            const dids = dealers.map(d => d.id);
            if (dids.length) {
              const dd = await User.findAll({ where: { roleId: (await Role.findOne({where:{name:'dealer_admin'}})).id, dealerId: { [Op.in]: dids } }, attributes:['id','username','dealerId','regionId'] });
              pushUnique(dd);
            }
          }
        }
        break;

      case 'inventory_user':
        // inventory_user -> admins + dealer_admin in same region
        {
          pushUnique(await fetchUsersByRoleSlug('technical_admin'));
          if (me.regionId) {
            const dealers = await Dealer.findAll({ where: { regionId: me.regionId }, attributes: ['id'] });
            const dids = dealers.map(d => d.id);
            if (dids.length) {
              pushUnique(await User.findAll({ where: { roleId: (await Role.findOne({where:{name:'dealer_admin'}})).id, dealerId: { [Op.in]: dids } }, attributes:['id','username','dealerId','regionId']}));
            }
          }
        }
        break;

      default:
        // fallback: return admins + direct dealer contacts if any
        pushUnique(await fetchUsersByRoleSlug('super_admin'));
        if (me.dealerId) {
          pushUnique(await User.findAll({ where: { roleId: (await Role.findOne({where:{name:'dealer_admin'}})).id, dealerId: me.dealerId }, attributes:['id','username','dealerId','regionId'] }));
          pushUnique(await User.findAll({ where: { roleId: (await Role.findOne({where:{name:'dealer_staff'}})).id, dealerId: me.dealerId }, attributes:['id','username','dealerId','regionId'] }));
        }
        break;
    }

    // format & return
    const payload = results.map(u => ({
      id: u.id,
      username: u.username,
      roleId: u.roleId,
      dealerId: u.dealerId,
      regionId: u.regionId
    }));

    return res.json({ users: payload });
  } catch (err) {
    console.error('getAllowedUsers error:', err);
    return res.status(500).json({ error: 'Failed to fetch allowed users' });
  }
};


// ------------------------------------------------------------
// GET CONVERSATION
// ------------------------------------------------------------
exports.getConversation = async (req, res) => {
  try {
    const meId = req.user.id;
    const { partnerId } = req.params;

    const messages = await Message.findAll({
      where: {
        [Op.or]: [
          { senderId: meId, recipientId: partnerId },
          { senderId: partnerId, recipientId: meId },
        ],
      },
      order: [["createdAt", "ASC"]],
    });

    return res.json({ messages });
  } catch (err) {
    console.error("Conversation error:", err);
    return res.status(500).json({ error: "Failed to fetch conversation" });
  }
};

// ------------------------------------------------------------
// SEND MESSAGE
// ------------------------------------------------------------
exports.sendMessage = async (req, res) => {
  try {
    const me = req.user;
    const { recipientId, body } = req.body;

    if (!recipientId || !body)
      return res.status(400).json({ error: "recipientId and body required" });

    // ensure user is allowed
    const allowed = await exports.getAllowedUsersInternal(me);
    if (!allowed.some((u) => String(u.id) === String(recipientId))) {
      return res.status(403).json({ error: "Not allowed to message this user" });
    }

    const msg = await Message.create({
      senderId: me.id,
      recipientId,
      body,
      status: "unread",
      messageType: "chat",
    });

    return res.status(201).json({ message: msg });
  } catch (err) {
    console.error("Send message error:", err);
    return res.status(500).json({ error: "Failed to send message" });
  }
};

// INTERNAL CHECK FOR ALLOWED USERS
exports.getAllowedUsersInternal = async (me) => {
  const myRole = me.roleDetails?.name;
  const allowedSlugs = CHAT_FLOW[myRole] || [];

  let list = [];
  for (const slug of allowedSlugs) {
    const found = await findTargets(me, slug);
    list = list.concat(found.map((u) => ({ id: u.id })));
  }
  return list;
};

// ------------------------------------------------------------
// MARK MESSAGE AS READ
// ------------------------------------------------------------
exports.markAsRead = async (req, res) => {
  try {
    const { id } = req.params;

    const msg = await Message.findByPk(id);
    if (!msg) return res.status(404).json({ error: "Message not found" });

    if (String(msg.recipientId) !== String(req.user.id))
      return res.status(403).json({ error: "Not allowed" });

    msg.status = "read";
    await msg.save();

    return res.json({ message: msg });
  } catch (err) {
    console.error("Mark read error:", err);
    return res.status(500).json({ error: "Failed to mark as read" });
  }
};

// ------------------------------------------------------------
// UNREAD COUNT
// ------------------------------------------------------------
exports.getUnreadCount = async (req, res) => {
  try {
    const count = await Message.count({
      where: { recipientId: req.user.id, status: "unread" },
    });

    return res.json({ count });
  } catch (err) {
    console.error("Unread count error:", err);
    return res.status(500).json({ error: "Failed to fetch unread count" });
  }
};
