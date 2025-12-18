const { User, Message, Role, Dealer, Territory, Area, Region, sequelize} = require('../models');
const { Op } = require('sequelize');

// ------------------------------------------------------------
// COMPREHENSIVE CHAT HIERARCHY IMPLEMENTATION
// ------------------------------------------------------------

/**
 * Helper: Load current user with full details including role
 */
async function loadCurrentUser(userId) {
  return User.findByPk(userId, {
    attributes: ['id', 'username', 'dealerId', 'regionId', 'areaId', 'territoryId', 'roleId'],
    include: [{ model: Role, as: 'roleDetails', attributes: ['id', 'name'] }]
  });
}

/**
 * Helper: Fetch users by role slug with optional scoping filters
 */
async function fetchUsersByRoleSlug(roleSlug, filters = {}) {
  const where = {};
  
  // Find role by name
  const role = await Role.findOne({ where: { name: roleSlug }, attributes: ['id', 'name'] });
  if (!role) return [];
  
  where.roleId = role.id;
  where.isActive = true; // Only active users
  
  // Apply scoping filters
  if (filters.regionId) where.regionId = filters.regionId;
  if (filters.areaId) where.areaId = filters.areaId;
  if (filters.territoryId) where.territoryId = filters.territoryId;
  if (filters.dealerId) where.dealerId = filters.dealerId;
  if (filters.dealerIds && filters.dealerIds.length > 0) {
    where.dealerId = { [Op.in]: filters.dealerIds };
  }
  if (filters.excludeDealerIds && filters.excludeDealerIds.length > 0) {
    where.dealerId = { [Op.notIn]: filters.excludeDealerIds };
  }
  
  return User.findAll({
    where,
    attributes: ['id', 'username', 'email', 'roleId', 'dealerId', 'regionId', 'areaId', 'territoryId'],
    include: [{ model: Role, as: 'roleDetails', attributes: ['id', 'name'] }],
    order: [['username', 'ASC']],
  });
}

/**
 * Helper: Get dealers in a specific region
 */
async function getDealersInRegion(regionId) {
  const dealers = await Dealer.findAll({
    where: { regionId, isActive: true },
    attributes: ['id']
  });
  return dealers.map(d => d.id);
}

/**
 * Helper: Get dealers in a specific territory
 */
async function getDealersInTerritory(territoryId) {
  const dealers = await Dealer.findAll({
    where: { territoryId, isActive: true },
    attributes: ['id']
  });
  return dealers.map(d => d.id);
}

/**
 * Helper: Get dealers in a specific area
 */
async function getDealersInArea(areaId) {
  const dealers = await Dealer.findAll({
    where: { areaId, isActive: true },
    attributes: ['id']
  });
  return dealers.map(d => d.id);
}

/**
 * Helper: Get user's assigned territory dealers (for Territory Manager)
 */
async function getTerritoryManagerDealers(user) {
  if (!user.territoryId) return [];
  return getDealersInTerritory(user.territoryId);
}

// ------------------------------------------------------------
// GET ALLOWED USERS - Comprehensive Hierarchy Implementation
// ------------------------------------------------------------

/**
 * Main: GET /api/chat/allowed-users
 * Implements the complete chat hierarchy as specified
 */
exports.getAllowedUsers = async (req, res) => {
  try {
    const meId = req.user.id;
    const me = await loadCurrentUser(meId);
    if (!me) return res.status(404).json({ error: 'User not found' });

    const myRoleSlug = me.roleDetails?.name || null;
    if (!myRoleSlug) return res.json({ users: [] });

    // Accumulate allowed users
    const results = [];
    const pushUnique = (list) => {
      for (const u of list) {
        if (!results.some(x => String(x.id) === String(u.id)) && String(u.id) !== String(meId)) {
          results.push(u);
        }
      }
    };

    // Implement hierarchy based on role
    switch (myRoleSlug) {
      case 'super_admin':
        // 1️⃣ SUPER ADMIN - Can message everyone (no restrictions)
        {
          const allUsers = await User.findAll({
            where: { isActive: true },
            attributes: ['id', 'username', 'email', 'roleId', 'dealerId', 'regionId', 'areaId', 'territoryId'],
            include: [{ model: Role, as: 'roleDetails', attributes: ['id', 'name'] }],
            order: [['username', 'ASC']],
          });
          pushUnique(allUsers);
        }
        break;

      case 'technical_admin':
        // 2️⃣ TECHNICAL ADMIN
        // CAN: Super Admin, Regional Admin, Regional Manager, Finance Admin, Dealer Admin (only for tech issues)
        // CANNOT: Dealer staff, Territory manager, Area manager
        {
          pushUnique(await fetchUsersByRoleSlug('super_admin'));
          pushUnique(await fetchUsersByRoleSlug('regional_admin'));
          pushUnique(await fetchUsersByRoleSlug('regional_manager'));
          pushUnique(await fetchUsersByRoleSlug('finance_admin'));
          pushUnique(await fetchUsersByRoleSlug('dealer_admin'));
        }
        break;

      case 'regional_admin':
        // 3️⃣ REGIONAL ADMIN
        // CAN: Super Admin, Technical Admin, Finance Admin, Regional Manager, Area Managers, Territory Managers, Dealer Admins, Dealer Staff (rare but allowed)
        {
          pushUnique(await fetchUsersByRoleSlug('super_admin'));
          pushUnique(await fetchUsersByRoleSlug('technical_admin'));
          pushUnique(await fetchUsersByRoleSlug('finance_admin'));
          
          if (me.regionId) {
            pushUnique(await fetchUsersByRoleSlug('regional_manager', { regionId: me.regionId }));
            pushUnique(await fetchUsersByRoleSlug('area_manager', { regionId: me.regionId }));
            pushUnique(await fetchUsersByRoleSlug('territory_manager', { regionId: me.regionId }));
            
            // Dealer Admins and Staff in same region
            const dealerIds = await getDealersInRegion(me.regionId);
            if (dealerIds.length > 0) {
              pushUnique(await fetchUsersByRoleSlug('dealer_admin', { dealerIds }));
              pushUnique(await fetchUsersByRoleSlug('dealer_staff', { dealerIds }));
            }
          }
        }
        break;

      case 'regional_manager':
        // 4️⃣ REGIONAL MANAGER
        // CAN: Regional Admin, Technical Admin, Super Admin, Area Managers, Territory Managers, Dealer Admins, Dealer Staff (in their region)
        // CANNOT: Other regions' users
        {
          pushUnique(await fetchUsersByRoleSlug('super_admin'));
          pushUnique(await fetchUsersByRoleSlug('technical_admin'));
          
          if (me.regionId) {
            pushUnique(await fetchUsersByRoleSlug('regional_admin', { regionId: me.regionId }));
            pushUnique(await fetchUsersByRoleSlug('area_manager', { regionId: me.regionId }));
            pushUnique(await fetchUsersByRoleSlug('territory_manager', { regionId: me.regionId }));
            
            // Dealer Admins and Staff in same region
            const dealerIds = await getDealersInRegion(me.regionId);
            if (dealerIds.length > 0) {
              pushUnique(await fetchUsersByRoleSlug('dealer_admin', { dealerIds }));
              pushUnique(await fetchUsersByRoleSlug('dealer_staff', { dealerIds }));
            }
          }
        }
        break;

      case 'area_manager':
        // 5️⃣ AREA MANAGER
        // CAN: Regional Manager, Regional Admin, Territory Manager, Dealer Admins, Dealer Staff, Super Admin (for escalation)
        {
          pushUnique(await fetchUsersByRoleSlug('super_admin'));
          
          if (me.regionId) {
            pushUnique(await fetchUsersByRoleSlug('regional_manager', { regionId: me.regionId }));
            pushUnique(await fetchUsersByRoleSlug('regional_admin', { regionId: me.regionId }));
            pushUnique(await fetchUsersByRoleSlug('territory_manager', { regionId: me.regionId }));
            
            // Dealer Admins and Staff in same region/area
            let dealerIds = [];
            if (me.areaId) {
              dealerIds = await getDealersInArea(me.areaId);
            } else if (me.regionId) {
              dealerIds = await getDealersInRegion(me.regionId);
            }
            if (dealerIds.length > 0) {
              pushUnique(await fetchUsersByRoleSlug('dealer_admin', { dealerIds }));
              pushUnique(await fetchUsersByRoleSlug('dealer_staff', { dealerIds }));
            }
          }
        }
        break;

      case 'territory_manager':
        // 6️⃣ TERRITORY MANAGER
        // CAN: Area Manager, Regional Manager, Dealer Admins (in assigned territory), Dealer Staff (for operations), Finance Admin (rare), Super Admin (escalations)
        // CANNOT: Other territories, Other areas
        {
          pushUnique(await fetchUsersByRoleSlug('super_admin'));
          pushUnique(await fetchUsersByRoleSlug('finance_admin'));
          
          if (me.regionId) {
            pushUnique(await fetchUsersByRoleSlug('regional_manager', { regionId: me.regionId }));
            pushUnique(await fetchUsersByRoleSlug('area_manager', { regionId: me.regionId }));
            
            // Dealer Admins and Staff in assigned territory only
            if (me.territoryId) {
              const dealerIds = await getDealersInTerritory(me.territoryId);
              if (dealerIds.length > 0) {
                pushUnique(await fetchUsersByRoleSlug('dealer_admin', { dealerIds }));
                pushUnique(await fetchUsersByRoleSlug('dealer_staff', { dealerIds }));
              }
            }
          }
        }
        break;

      case 'dealer_admin':
        // 7️⃣ DEALER ADMIN
        // CAN: Dealer Staff, Territory Manager, Area Manager, Regional Manager, Regional Admin, Finance Admin, Technical Admin, Super Admin
        // CANNOT: Other dealers unless allowed by special permission
        {
          pushUnique(await fetchUsersByRoleSlug('super_admin'));
          pushUnique(await fetchUsersByRoleSlug('technical_admin'));
          pushUnique(await fetchUsersByRoleSlug('regional_admin'));
          pushUnique(await fetchUsersByRoleSlug('finance_admin'));
          
          // Dealer Staff in same dealer
          if (me.dealerId) {
            pushUnique(await fetchUsersByRoleSlug('dealer_staff', { dealerId: me.dealerId }));
            
            // Get dealer info to find managers
            const dealer = await Dealer.findByPk(me.dealerId, {
              attributes: ['id', 'regionId', 'areaId', 'territoryId', 'managerId']
            });
            
            if (dealer) {
              // Regional Manager in dealer's region
              if (dealer.regionId) {
                pushUnique(await fetchUsersByRoleSlug('regional_manager', { regionId: dealer.regionId }));
              }
              
              // Area Manager in dealer's area
              if (dealer.areaId) {
                pushUnique(await fetchUsersByRoleSlug('area_manager', { areaId: dealer.areaId }));
              }
              
              // Territory Manager in dealer's territory
              if (dealer.territoryId) {
                pushUnique(await fetchUsersByRoleSlug('territory_manager', { territoryId: dealer.territoryId }));
              }
            }
          }
        }
        break;

      case 'dealer_staff':
        // 8️⃣ DEALER STAFF
        // CAN: Dealer Admin, Territory Manager, Area Manager, Regional Manager, Regional Admin, Technical Admin (system issues)
        // CANNOT: Super Admin, Other dealer staff from different dealerships, Other dealer admins
        {
          pushUnique(await fetchUsersByRoleSlug('technical_admin'));
          
          // Dealer Admin in same dealer
          if (me.dealerId) {
            pushUnique(await fetchUsersByRoleSlug('dealer_admin', { dealerId: me.dealerId }));
            
            // Get dealer info to find managers
            const dealer = await Dealer.findByPk(me.dealerId, {
              attributes: ['id', 'regionId', 'areaId', 'territoryId']
            });
            
            if (dealer) {
              // Regional Manager in dealer's region
              if (dealer.regionId) {
                pushUnique(await fetchUsersByRoleSlug('regional_manager', { regionId: dealer.regionId }));
                pushUnique(await fetchUsersByRoleSlug('regional_admin', { regionId: dealer.regionId }));
              }
              
              // Area Manager in dealer's area
              if (dealer.areaId) {
                pushUnique(await fetchUsersByRoleSlug('area_manager', { areaId: dealer.areaId }));
              }
              
              // Territory Manager in dealer's territory
              if (dealer.territoryId) {
                pushUnique(await fetchUsersByRoleSlug('territory_manager', { territoryId: dealer.territoryId }));
              }
            }
          }
        }
        break;

      case 'finance_admin':
        // 9️⃣ FINANCE ADMIN
        // CAN: Super Admin, Technical Admin, Regional Admin, Dealer Admin, Accounts User, Territory / Area Managers (for clarifications)
        // CANNOT: Dealer Staff directly (unless needed)
        {
          pushUnique(await fetchUsersByRoleSlug('super_admin'));
          pushUnique(await fetchUsersByRoleSlug('technical_admin'));
          pushUnique(await fetchUsersByRoleSlug('regional_admin'));
          pushUnique(await fetchUsersByRoleSlug('accounts_user'));
          
          // Territory and Area Managers (for clarifications)
          if (me.regionId) {
            pushUnique(await fetchUsersByRoleSlug('territory_manager', { regionId: me.regionId }));
            pushUnique(await fetchUsersByRoleSlug('area_manager', { regionId: me.regionId }));
            
            // Dealer Admins in same region
            const dealerIds = await getDealersInRegion(me.regionId);
            if (dealerIds.length > 0) {
              pushUnique(await fetchUsersByRoleSlug('dealer_admin', { dealerIds }));
            }
          }
        }
        break;

      case 'accounts_user':
        // 🔟 ACCOUNTS USER
        // CAN: Finance Admin, Dealer Admin, Territory Manager
        // CANNOT: Super Admin, Technical Admin
        {
          pushUnique(await fetchUsersByRoleSlug('finance_admin'));
          
          if (me.regionId) {
            pushUnique(await fetchUsersByRoleSlug('territory_manager', { regionId: me.regionId }));
            
            // Dealer Admins in same region
            const dealerIds = await getDealersInRegion(me.regionId);
            if (dealerIds.length > 0) {
              pushUnique(await fetchUsersByRoleSlug('dealer_admin', { dealerIds }));
            }
          }
        }
        break;

      case 'inventory_user':
        // 1️⃣1️⃣ INVENTORY USER
        // CAN: Dealer Admin, Territory Manager, Area Manager, Regional Manager
        {
          if (me.regionId) {
            pushUnique(await fetchUsersByRoleSlug('regional_manager', { regionId: me.regionId }));
            pushUnique(await fetchUsersByRoleSlug('area_manager', { regionId: me.regionId }));
            pushUnique(await fetchUsersByRoleSlug('territory_manager', { regionId: me.regionId }));
            
            // Dealer Admins in same region
            const dealerIds = await getDealersInRegion(me.regionId);
            if (dealerIds.length > 0) {
              pushUnique(await fetchUsersByRoleSlug('dealer_admin', { dealerIds }));
            }
          }
        }
        break;

      default:
        // Fallback: return empty list for unknown roles
        break;
    }

    // Format & return
    const payload = results.map(u => ({
      id: u.id,
      username: u.username,
      email: u.email || null,
      roleId: u.roleId,
      dealerId: u.dealerId,
      regionId: u.regionId,
      areaId: u.areaId,
      territoryId: u.territoryId,
      roleName: u.roleDetails?.name || null
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

    if (!partnerId) {
      return res.status(400).json({ error: "partnerId is required" });
    }

    console.log("Fetching conversation:", { meId, partnerId });

    const messages = await Message.findAll({
      where: {
        [Op.or]: [
          { senderId: meId, recipientId: partnerId },
          { senderId: partnerId, recipientId: meId },
        ],
      },
      include: [
        { model: User, as: "sender", attributes: ["id", "username", "role"] },
        { model: User, as: "recipient", attributes: ["id", "username", "role"] },
      ],
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
// Uses the same hierarchy logic as getAllowedUsers
exports.getAllowedUsersInternal = async (me) => {
  try {
    // Ensure me has roleDetails loaded
    if (!me.roleDetails) {
      me = await loadCurrentUser(me.id);
      if (!me) return [];
    }

    const myRoleSlug = me.roleDetails?.name || null;
    if (!myRoleSlug) return [];

    const results = [];
    const pushUnique = (list) => {
      for (const u of list) {
        if (!results.some(x => String(x.id) === String(u.id)) && String(u.id) !== String(me.id)) {
          results.push(u);
        }
      }
    };

    // Use the same switch logic as getAllowedUsers
    switch (myRoleSlug) {
      case 'super_admin':
        {
          const allUsers = await User.findAll({
            where: { isActive: true },
            attributes: ['id'],
          });
          pushUnique(allUsers);
        }
        break;

      case 'technical_admin':
        {
          pushUnique(await fetchUsersByRoleSlug('super_admin'));
          pushUnique(await fetchUsersByRoleSlug('regional_admin'));
          pushUnique(await fetchUsersByRoleSlug('regional_manager'));
          pushUnique(await fetchUsersByRoleSlug('finance_admin'));
          pushUnique(await fetchUsersByRoleSlug('dealer_admin'));
        }
        break;

      case 'regional_admin':
        {
          pushUnique(await fetchUsersByRoleSlug('super_admin'));
          pushUnique(await fetchUsersByRoleSlug('technical_admin'));
          pushUnique(await fetchUsersByRoleSlug('finance_admin'));
          
          if (me.regionId) {
            pushUnique(await fetchUsersByRoleSlug('regional_manager', { regionId: me.regionId }));
            pushUnique(await fetchUsersByRoleSlug('area_manager', { regionId: me.regionId }));
            pushUnique(await fetchUsersByRoleSlug('territory_manager', { regionId: me.regionId }));
            
            const dealerIds = await getDealersInRegion(me.regionId);
            if (dealerIds.length > 0) {
              pushUnique(await fetchUsersByRoleSlug('dealer_admin', { dealerIds }));
              pushUnique(await fetchUsersByRoleSlug('dealer_staff', { dealerIds }));
            }
          }
        }
        break;

      case 'regional_manager':
        {
          pushUnique(await fetchUsersByRoleSlug('super_admin'));
          pushUnique(await fetchUsersByRoleSlug('technical_admin'));
          
          if (me.regionId) {
            pushUnique(await fetchUsersByRoleSlug('regional_admin', { regionId: me.regionId }));
            pushUnique(await fetchUsersByRoleSlug('area_manager', { regionId: me.regionId }));
            pushUnique(await fetchUsersByRoleSlug('territory_manager', { regionId: me.regionId }));
            
            const dealerIds = await getDealersInRegion(me.regionId);
            if (dealerIds.length > 0) {
              pushUnique(await fetchUsersByRoleSlug('dealer_admin', { dealerIds }));
              pushUnique(await fetchUsersByRoleSlug('dealer_staff', { dealerIds }));
            }
          }
        }
        break;

      case 'area_manager':
        {
          pushUnique(await fetchUsersByRoleSlug('super_admin'));
          
          if (me.regionId) {
            pushUnique(await fetchUsersByRoleSlug('regional_manager', { regionId: me.regionId }));
            pushUnique(await fetchUsersByRoleSlug('regional_admin', { regionId: me.regionId }));
            pushUnique(await fetchUsersByRoleSlug('territory_manager', { regionId: me.regionId }));
            
            let dealerIds = [];
            if (me.areaId) {
              dealerIds = await getDealersInArea(me.areaId);
            } else if (me.regionId) {
              dealerIds = await getDealersInRegion(me.regionId);
            }
            if (dealerIds.length > 0) {
              pushUnique(await fetchUsersByRoleSlug('dealer_admin', { dealerIds }));
              pushUnique(await fetchUsersByRoleSlug('dealer_staff', { dealerIds }));
            }
          }
        }
        break;

      case 'territory_manager':
        {
          pushUnique(await fetchUsersByRoleSlug('super_admin'));
          pushUnique(await fetchUsersByRoleSlug('finance_admin'));
          
          if (me.regionId) {
            pushUnique(await fetchUsersByRoleSlug('regional_manager', { regionId: me.regionId }));
            pushUnique(await fetchUsersByRoleSlug('area_manager', { regionId: me.regionId }));
            
            if (me.territoryId) {
              const dealerIds = await getDealersInTerritory(me.territoryId);
              if (dealerIds.length > 0) {
                pushUnique(await fetchUsersByRoleSlug('dealer_admin', { dealerIds }));
                pushUnique(await fetchUsersByRoleSlug('dealer_staff', { dealerIds }));
              }
            }
          }
        }
        break;

      case 'dealer_admin':
        {
          pushUnique(await fetchUsersByRoleSlug('super_admin'));
          pushUnique(await fetchUsersByRoleSlug('technical_admin'));
          pushUnique(await fetchUsersByRoleSlug('regional_admin'));
          pushUnique(await fetchUsersByRoleSlug('finance_admin'));
          
          if (me.dealerId) {
            pushUnique(await fetchUsersByRoleSlug('dealer_staff', { dealerId: me.dealerId }));
            
            const dealer = await Dealer.findByPk(me.dealerId, {
              attributes: ['id', 'regionId', 'areaId', 'territoryId', 'managerId']
            });
            
            if (dealer) {
              if (dealer.regionId) {
                pushUnique(await fetchUsersByRoleSlug('regional_manager', { regionId: dealer.regionId }));
              }
              if (dealer.areaId) {
                pushUnique(await fetchUsersByRoleSlug('area_manager', { areaId: dealer.areaId }));
              }
              if (dealer.territoryId) {
                pushUnique(await fetchUsersByRoleSlug('territory_manager', { territoryId: dealer.territoryId }));
              }
            }
          }
        }
        break;

      case 'dealer_staff':
        {
          pushUnique(await fetchUsersByRoleSlug('technical_admin'));
          
          if (me.dealerId) {
            pushUnique(await fetchUsersByRoleSlug('dealer_admin', { dealerId: me.dealerId }));
            
            const dealer = await Dealer.findByPk(me.dealerId, {
              attributes: ['id', 'regionId', 'areaId', 'territoryId']
            });
            
            if (dealer) {
              if (dealer.regionId) {
                pushUnique(await fetchUsersByRoleSlug('regional_manager', { regionId: dealer.regionId }));
                pushUnique(await fetchUsersByRoleSlug('regional_admin', { regionId: dealer.regionId }));
              }
              if (dealer.areaId) {
                pushUnique(await fetchUsersByRoleSlug('area_manager', { areaId: dealer.areaId }));
              }
              if (dealer.territoryId) {
                pushUnique(await fetchUsersByRoleSlug('territory_manager', { territoryId: dealer.territoryId }));
              }
            }
          }
        }
        break;

      case 'finance_admin':
        {
          pushUnique(await fetchUsersByRoleSlug('super_admin'));
          pushUnique(await fetchUsersByRoleSlug('technical_admin'));
          pushUnique(await fetchUsersByRoleSlug('regional_admin'));
          pushUnique(await fetchUsersByRoleSlug('accounts_user'));
          
          if (me.regionId) {
            pushUnique(await fetchUsersByRoleSlug('territory_manager', { regionId: me.regionId }));
            pushUnique(await fetchUsersByRoleSlug('area_manager', { regionId: me.regionId }));
            
            const dealerIds = await getDealersInRegion(me.regionId);
            if (dealerIds.length > 0) {
              pushUnique(await fetchUsersByRoleSlug('dealer_admin', { dealerIds }));
            }
          }
        }
        break;

      case 'accounts_user':
        {
          pushUnique(await fetchUsersByRoleSlug('finance_admin'));
          
          if (me.regionId) {
            pushUnique(await fetchUsersByRoleSlug('territory_manager', { regionId: me.regionId }));
            
            const dealerIds = await getDealersInRegion(me.regionId);
            if (dealerIds.length > 0) {
              pushUnique(await fetchUsersByRoleSlug('dealer_admin', { dealerIds }));
            }
          }
        }
        break;

      case 'inventory_user':
        {
          if (me.regionId) {
            pushUnique(await fetchUsersByRoleSlug('regional_manager', { regionId: me.regionId }));
            pushUnique(await fetchUsersByRoleSlug('area_manager', { regionId: me.regionId }));
            pushUnique(await fetchUsersByRoleSlug('territory_manager', { regionId: me.regionId }));
            
            const dealerIds = await getDealersInRegion(me.regionId);
            if (dealerIds.length > 0) {
              pushUnique(await fetchUsersByRoleSlug('dealer_admin', { dealerIds }));
            }
          }
        }
        break;

      default:
        return [];
    }

    return results.map(u => ({ id: u.id }));
  } catch (err) {
    console.error('getAllowedUsersInternal error:', err);
    return [];
  }
};

// ------------------------------------------------------------
// MARK MESSAGE AS READ
// ------------------------------------------------------------
// controllers/chatController.js
// PATCH /api/chat/:partnerId/read
exports.markAsRead = async (req, res) => {
  try {
    const userId = req.user.id;
    // support both partnerId (user-to-user) and conversationId (conversation-based read)
    const { partnerId } = req.params;
    const conversationId = req.params.id || req.params.conversationId || null;

    if (!partnerId && !conversationId) {
      return res.status(400).json({ error: 'partnerId or conversationId is required' });
    }

    let updated;
    if (conversationId) {
      // mark all unread messages in the conversation where recipient is current user
      updated = await Message.update(
        { status: 'read' },
        {
          where: {
            status: 'unread',
            conversationId,
            recipientId: userId,
          },
        }
      );
    } else {
      // partnerId flow: mark messages between partner and user as read
      updated = await Message.update(
        { status: 'read' },
        {
          where: {
            status: 'unread',
            [Op.or]: [
              { senderId: partnerId, recipientId: userId },
              { senderId: userId, recipientId: partnerId },
            ],
          },
        }
      );
    }

    res.json({ success: true, updated: updated[0] });
  } catch (err) {
    console.error("Error marking messages as read:", err);
    res.status(500).json({ error: err.message });
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