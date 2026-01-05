// src/utils/filterHelper.js
const { Op } = require('sequelize');

/**
 * Common filter builder for advanced search and filtering
 * @param {Object} query - req.query object
 * @param {Object} options - Configuration for specific entity
 * @returns {Object} Sequelize where object
 */
const buildAdvancedWhere = (query, options = {}) => {
    const where = {};
    const {
        searchFields = [],
        dateFields = ['createdAt'],
        numberFields = [],
        booleanFields = [],
        exactFields = []
    } = options;

    // 1. Global Search
    if (query.search && searchFields.length > 0) {
        // Use Op.iLike for case-insensitive search in PostgreSQL
        // For MySQL, Sequelize will fall back to Op.like
        // Escape special characters are already handled in controller
        // Exclude fields that are also in exactFields to avoid conflicts
        const searchableFields = searchFields.filter(field => !exactFields.includes(field) || !query[field]);
        
        // Try to use iLike for PostgreSQL (case-insensitive), fallback to like for MySQL
        const likeOperator = Op.iLike || Op.like;
        
        const searchConditions = searchableFields.map(field => ({
            [field]: { [likeOperator]: `%${query.search}%` }
        }));
        
        if (searchConditions.length > 0) {
            // Merge with existing Op.or if it exists
            if (where[Op.or]) {
                where[Op.or] = [...where[Op.or], ...searchConditions];
            } else {
                where[Op.or] = searchConditions;
            }
        }
    }

    // 2. Date Range Filters (e.g., createdAt_from, createdAt_to)
    dateFields.forEach(field => {
        const from = query[`${field}_from`] || query.startDate; // Support legacy startDate
        const to = query[`${field}_to`] || query.endDate;    // Support legacy endDate

        if (from || to) {
            where[field] = {};
            if (from) where[field][Op.gte] = new Date(from);
            if (to) {
                const toDate = new Date(to);
                toDate.setHours(23, 59, 59, 999); // End of day
                where[field][Op.lte] = toDate;
            }
        }
    });

    // 3. Number Range Filters (e.g., totalAmount_min, totalAmount_max)
    numberFields.forEach(field => {
        const min = query[`${field}_min`];
        const max = query[`${field}_max`];

        if ((min !== undefined && min !== '') || (max !== undefined && max !== '')) {
            where[field] = {};
            if (min !== undefined && min !== '') where[field][Op.gte] = Number(min);
            if (max !== undefined && max !== '') where[field][Op.lte] = Number(max);
        }
    });

    // 4. Boolean Filters
    booleanFields.forEach(field => {
        if (query[field] !== undefined && query[field] !== '') {
            where[field] = query[field] === 'true';
        }
    });

    // 5. Exact Match / Multi-Select (e.g. status=paid,unpaid)
    // This takes precedence over search for the same field
    exactFields.forEach(field => {
        if (query[field]) {
            const values = query[field].split(',').map(v => v.trim()).filter(v => v);
            if (values.length > 1) {
                where[field] = { [Op.in]: values };
            } else if (values.length === 1) {
                where[field] = values[0];
            }
        }
    });

    return where;
};

module.exports = { buildAdvancedWhere };
