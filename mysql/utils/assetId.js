const prisma = require('./prismaClient');

// `AST-<CAT>-<NNNN>` is the Asset table's PRIMARY KEY, and the 4-digit space is only 9000 wide
// per category prefix — narrow enough that picking at random without checking collides often
// once a few hundred assets exist.
//
// Not a hard guarantee under true concurrency (two requests can clear the check with the same ID
// before either writes), but every caller handles P2002 and the race is negligible here.
const generateAssetId = async (category) => {
    const prefix = category.substring(0, 3).toUpperCase();

    const isFree = async (assetId) => {
        const existing = await prisma.asset.findUnique({ where: { assetId }, select: { assetId: true } });
        return !existing;
    };

    // Keep the familiar 4-digit shape while it still has room.
    for (let attempt = 0; attempt < 10; attempt++) {
        const assetId = `AST-${prefix}-${Math.floor(1000 + Math.random() * 9000)}`;
        if (await isFree(assetId)) return assetId;
    }

    // Ten misses means this prefix's 4-digit space is crowded — widen it rather than keep gambling.
    for (let attempt = 0; attempt < 10; attempt++) {
        const assetId = `AST-${prefix}-${Math.floor(100000 + Math.random() * 900000)}`;
        if (await isFree(assetId)) return assetId;
    }

    throw new Error(`Could not generate a unique asset ID for category "${category}"`);
};

module.exports = { generateAssetId };
