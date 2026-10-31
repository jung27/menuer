import "server-only";
import { MongoClient } from "mongodb";

const mongoGlobal = globalThis as typeof globalThis & {
  menuerMongoConnection?: Promise<MongoClient>;
};

// 개발 서버의 새로고침과 여러 요청에서 동일한 연결 풀을 재사용합니다.
export async function getDatabase() {
  const uri = process.env.MONGODB_URI;
  const databaseName = process.env.MONGODB_DB;
  if (!uri || !databaseName || uri.includes("<db_password>")) {
    throw new Error("MongoDB environment configuration is incomplete.");
  }

  if (!mongoGlobal.menuerMongoConnection) {
    const client = new MongoClient(uri, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000,
    });
    mongoGlobal.menuerMongoConnection = client.connect().catch(async (error) => {
      mongoGlobal.menuerMongoConnection = undefined;
      await client.close().catch(() => undefined);
      throw error;
    });
  }
  const client = await mongoGlobal.menuerMongoConnection;
  return client.db(databaseName);
}
