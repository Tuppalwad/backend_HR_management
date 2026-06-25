import mongoose from "mongoose";

const dropAllCollections = async () => {
  try {
    await mongoose.connect(
      "mongodb+srv://vyankatesh:NZ4xVnxSeog9Dowm@cluster0.oc1lhcd.mongodb.net/EMSadmin1"
    );

    const collections = mongoose.connection.collections;

    for (const key in collections) {
      await collections[key].drop();
      console.log(`🗑️ Dropped ${key}`);
    }

    console.log("🎉 All collections dropped");

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
};

dropAllCollections();