import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";
import dotEnv from "dotenv"
import fs from 'fs'

dotEnv.config()
neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

const certPath = process.env.NODE_EXTRA_CA_CERTS ?? ""

// const decodedBuffer = Buffer.from(process.env.DATABASE_CA_CERT ?? "", 'base64')
// const decodedString = decodedBuffer.toString('utf-8')

export const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: process.env.NODE_ENV === "production" && process.env.NODE_EXTRA_CA_CERTS ? {
  rejectUnauthorized: true,
  ca: fs.readFileSync(certPath).toString()
  //ca: decodedString
} : true });
export const db = drizzle({ client: pool, schema });