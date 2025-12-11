const { FeatureToggle, AuditLog } = require('../models');

// Get all feature toggles
const getFeatureToggles = async (req, res) => {
  try {
    const toggles = await FeatureToggle.findAll({
      order: [['key', 'ASC']]
    });
    res.json({ toggles });
  } catch (error) {
    console.error('Get feature toggles error:', error);
    res.status(500).json({ error: 'Failed to fetch feature toggles' });
  }
};

// Get single feature toggle
const getFeatureToggle = async (req, res) => {
  try {
    const toggle = await FeatureToggle.findOne({
      where: { key: req.params.key }
    });
    if (!toggle) return res.status(404).json({ error: 'Feature toggle not found' });
    res.json(toggle);
  } catch (error) {
    console.error('Get feature toggle error:', error);
    res.status(500).json({ error: 'Failed to fetch feature toggle' });
  }
};

// Create/Update feature toggle
const upsertFeatureToggle = async (req, res) => {
  try {
    const { key, name, description, isEnabled, config } = req.body;

    const [toggle, created] = await FeatureToggle.upsert({
      key,
      name,
      description,
      isEnabled: isEnabled !== undefined ? isEnabled : true,
      config: config || {}
    }, {
      returning: true
    });

    await AuditLog.create({
      userId: req.user.id,
      action: created ? 'CREATE_FEATURE_TOGGLE' : 'UPDATE_FEATURE_TOGGLE',
      entity: 'FeatureToggle',
      entityId: toggle.id,
      changes: { key, name, isEnabled, config },
      ipAddress: req.ip
    });

    res.json({ toggle, created });
  } catch (error) {
    console.error('Upsert feature toggle error:', error);
    res.status(500).json({ error: 'Failed to save feature toggle' });
  }
};

// Check if feature is enabled (utility function)
const isFeatureEnabled = async (key) => {
  try {
    const toggle = await FeatureToggle.findOne({ where: { key } });
    return toggle ? toggle.isEnabled : true; // Default to enabled if not found
  } catch (error) {
    console.error('Check feature toggle error:', error);
    return true; // Fail open
  }
};

module.exports = {
  getFeatureToggles,
  getFeatureToggle,
  upsertFeatureToggle,
  isFeatureEnabled
};

