const { Router } = require('express');
const { getAssetCountByStatus, getAssetCountByCategory, getWarrantyExpiringAssets, getAssetOverview } = require('../controller/assetDashboard');

const router = Router();

router.get('/countbystatus', getAssetCountByStatus);
router.get('/countbycategory', getAssetCountByCategory);
router.get('/warrantyexpiring', getWarrantyExpiringAssets);
router.get('/overview', getAssetOverview);

module.exports = router;
