const prisma = require('./prismaClient');

// `AST-<CAT>-<NNNN>` is the Asset table's actual PRIMARY KEY, and the original generator picked
// the number at random with no uniqueness check at all. That number only has 9000 possible values
// per category prefix, so the collision rate is not theoretical: at ~200 laptops roughly 1 insert
// in 44 already lands on an existing ID and fails the request outright with a P2002; at 500 it is
// 1 in 18, and it keeps climbing as the register grows. Checking against the database and retrying
// is what makes "Add Asset" reliable as the asset count grows.
//
// Still not a hard uniqueness guarantee under true concurrency (two simultaneous requests can
// clear the check with the same ID before either writes), but the callers all handle P2002, and
// the odds of that race are now negligible for an internal HR tool.
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
