const express = require('express');
const { addAsset, editAsset, deleteAsset, retireAsset, markAssetDead, getAsset, getAllAssets, searchAsset, getAssetsByEmpId, getEmployeeAssetHistory, assignAsset, returnAsset, transferAsset, getAssetHistory, correctAssignmentEmployee, getAssetCategories } = require('../controller/asset');
const router = express.Router();

router.post('/add', addAsset);
router.put('/edit', editAsset);
router.delete('/delete', deleteAsset);
router.post('/retire', retireAsset);
router.post('/markdead', markAssetDead);
router.get('/get', getAsset);
router.get('/getall', getAllAssets);
router.get('/search', searchAsset);
router.get('/getbyempid', getAssetsByEmpId);
router.get('/employeehistory', getEmployeeAssetHistory);
router.post('/assign', assignAsset);
router.post('/return', returnAsset);
router.post('/transfer', transferAsset);
router.get('/history', getAssetHistory);
router.put('/history/assign', correctAssignmentEmployee);
router.get('/categories', getAssetCategories);

module.exports = router;
