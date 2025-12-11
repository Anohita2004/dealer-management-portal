const { Dealer, Invoice, Region, Territory, sequelize } = require('../models');
const { Op } = require('sequelize');

/* ---------------------- DATE PARSER ---------------------- */
const parseDates = (qs) => {
  const start = qs.start ? new Date(qs.start) : new Date(0);
  const end = qs.end ? new Date(qs.end) : new Date();
  return { start, end };
};

/* ============================================================
   📌 GET DEALER PIN MARKERS
   GET /api/maps/dealers?regionId=&territoryId=&start=&end=
============================================================== */
exports.getDealerPins = async (req, res) => {
  try {
    const { regionId, territoryId } = req.query;
    const { start, end } = parseDates(req.query);

    const whereDealer = {};
    if (territoryId) whereDealer.territoryId = territoryId;
    if (regionId) whereDealer.regionId = regionId;

    // Apply hierarchical scoping
    if (req.scope?.dealers) {
      Object.assign(whereDealer, req.scope.dealers);
    } else {
      const role = req.user?.role;
      if (role === 'regional_admin' || role === 'regional_manager') whereDealer.regionId = req.user.regionId;
      if (role === 'area_manager') whereDealer.areaId = req.user.areaId;
      if (role === 'territory_manager') whereDealer.territoryId = req.user.territoryId;
      if (role && role.startsWith('dealer_')) whereDealer.id = req.user.dealerId;
    }

    const dealers = await Dealer.findAll({
      where: whereDealer,
      attributes: [
        'id',
        'businessName',
        'dealerCode',
        'lat',
        'lng',
        'territoryId',
        'regionId',
        [
          sequelize.literal(
            `(SELECT COALESCE(SUM("totalAmount"),0)
              FROM invoices
              WHERE "invoices"."dealerId" = "Dealer"."id"
              AND "invoiceDate" BETWEEN '${start.toISOString()}' AND '${end.toISOString()}'
            )`
          ),
          'totalSales'
        ]
      ],
      group: ['Dealer.id'],
      raw: false
    });

    // 🚀 FIX: Filter invalid coords + normalize output
    const out = dealers
      .filter((d) => d.lat !== null && d.lng !== null)
      .map((d) => ({
        id: d.id,
        name: d.businessName,
        dealerCode: d.dealerCode,
        lat: Number(d.lat),
        lng: Number(d.lng),
        regionId: d.regionId,
        territoryId: d.territoryId,
        totalSales: Number(d.getDataValue('totalSales') || 0)
      }));

    return res.json(out);
  } catch (err) {
    console.error('getDealerPins error', err);
    return res.status(500).json({ error: 'Failed to fetch dealer pins' });
  }
};

/* ============================================================
   📌 GET HEATMAP DATA
   GET /api/maps/heatmap?granularity=dealer|territory|region
============================================================== */
exports.getHeatmap = async (req, res) => {
  try {
    const granularity = req.query.granularity || 'dealer';
    const { start, end } = parseDates(req.query);

    // scoped filters
    const regionFilter = req.scope?.dealers?.regionId ? `AND d."regionId" = '${req.scope.dealers.regionId}'` : '';
    const areaFilter = req.scope?.dealers?.areaId ? `AND d."areaId" = '${req.scope.dealers.areaId}'` : '';
    const territoryFilter = req.scope?.dealers?.territoryId ? `AND d."territoryId" = '${req.scope.dealers.territoryId}'` : '';
    const dealerFilter = req.scope?.dealers?.id ? `AND d.id = '${req.scope.dealers.id}'` : '';
    const scopedWhere = `${regionFilter} ${areaFilter} ${territoryFilter} ${dealerFilter}`;

    /* ------------------ REGION HEATMAP ------------------ */
    if (granularity === 'region') {
      const rows = await sequelize.query(
        `SELECT r.id, r."centroidLat" AS lat, r."centroidLng" AS lng,
                COALESCE(SUM(i."totalAmount"),0) AS weight
         FROM regions r
         LEFT JOIN dealers d ON d."regionId" = r.id
         LEFT JOIN invoices i ON i."dealerId" = d.id 
           AND i."invoiceDate" BETWEEN :start AND :end
         WHERE 1=1 ${regionFilter} ${areaFilter} ${territoryFilter} ${dealerFilter}
         GROUP BY r.id, r."centroidLat", r."centroidLng"
         HAVING r."centroidLat" IS NOT NULL AND r."centroidLng" IS NOT NULL`,
        { replacements: { start, end }, type: sequelize.QueryTypes.SELECT }
      );

      return res.json(
        rows.map((r) => ({
          lat: Number(r.lat),
          lng: Number(r.lng),
          weight: Number(r.weight)
        }))
      );
    }

    /* ------------------ TERRITORY HEATMAP ------------------ */
    if (granularity === 'territory') {
      const rows = await sequelize.query(
        `SELECT t.id,
                AVG(d.lat) AS lat,
                AVG(d.lng) AS lng,
                COALESCE(SUM(i."totalAmount"),0) AS weight
         FROM territories t
         LEFT JOIN dealers d ON d."territoryId" = t.id
         LEFT JOIN invoices i ON i."dealerId" = d.id 
            AND i."invoiceDate" BETWEEN :start AND :end
         WHERE 1=1 ${regionFilter} ${areaFilter} ${territoryFilter} ${dealerFilter}
         GROUP BY t.id
         HAVING AVG(d.lat) IS NOT NULL AND AVG(d.lng) IS NOT NULL`,
        { replacements: { start, end }, type: sequelize.QueryTypes.SELECT }
      );

      return res.json(
        rows.map((r) => ({
          lat: Number(r.lat),
          lng: Number(r.lng),
          weight: Number(r.weight)
        }))
      );
    }

    /* ------------------ DEALER HEATMAP ------------------ */
    const dealers = await sequelize.query(
      `SELECT d.id, d.lat, d.lng,
              COALESCE(SUM(i."totalAmount"),0) AS weight
       FROM dealers d
       LEFT JOIN invoices i ON i."dealerId" = d.id
         AND i."invoiceDate" BETWEEN :start AND :end
       WHERE d.lat IS NOT NULL AND d.lng IS NOT NULL ${scopedWhere}
       GROUP BY d.id, d.lat, d.lng`,
      { replacements: { start, end }, type: sequelize.QueryTypes.SELECT }
    );

    return res.json(
      dealers.map((d) => ({
        lat: Number(d.lat),
        lng: Number(d.lng),
        weight: Number(d.weight)
      }))
    );
  } catch (err) {
    console.error('getHeatmap error', err);
    return res.status(500).json({ error: 'Failed to fetch heatmap data' });
  }
};

/* ============================================================
   📌 GET REGIONS AS GEOJSON
   GET /api/maps/regions
============================================================== */
exports.getRegionsGeo = async (req, res) => {
  try {
    const regions = await Region.findAll({
      attributes: ['id', 'name', 'geojson', 'centroidLat', 'centroidLng']
    });

    const features = regions.map((r) => ({
      type: 'Feature',
      // FIX: Leaflet hates "geometry: null"
      geometry:
        r.geojson || {
          type: 'Polygon',
          coordinates: []
        },
      properties: {
        id: r.id,
        name: r.name,
        centroidLat: r.centroidLat,
        centroidLng: r.centroidLng
      }
    }));

    return res.json({ type: 'FeatureCollection', features });
  } catch (err) {
    console.error('getRegionsGeo error', err);
    return res.status(500).json({ error: 'Failed to fetch regions' });
  }
};

/* ============================================================
   📌 GET TERRITORIES AS GEOJSON
   GET /api/maps/territories?regionId=
============================================================== */
exports.getTerritoriesGeo = async (req, res) => {
  try {
    const where = {};
    if (req.query.regionId) where.regionId = req.query.regionId;

    if (req.scope?.territories) Object.assign(where, req.scope.territories);

    const territories = await Territory.findAll({
      where,
      attributes: ['id', 'name', 'geojson', 'regionId', 'centroidLat', 'centroidLng']
    });

    const features = territories.map((t) => ({
      type: 'Feature',
      geometry:
        t.geojson || {
          type: 'Polygon',
          coordinates: []
        },
      properties: {
        id: t.id,
        name: t.name,
        regionId: t.regionId,
        centroidLat: t.centroidLat,
        centroidLng: t.centroidLng
      }
    }));

    return res.json({ type: 'FeatureCollection', features });
  } catch (err) {
    console.error('getTerritoriesGeo error', err);
    return res.status(500).json({ error: 'Failed to fetch territories' });
  }
};
