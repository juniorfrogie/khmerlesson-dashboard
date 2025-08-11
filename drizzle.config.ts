import { defineConfig } from "drizzle-kit";
// import fs from 'fs';
// import path from 'path';

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL, ensure the database is provisioned");
}

//const certPath = path.resolve(import.meta.dirname, '../certs/ca-certificate.crt')
//const certPath = process.env.DATABASE_CA_CERT ?? ""


const decodedBuffer = Buffer.from(process.env.DATABASE_CA_CERT ?? "", 'base64')
const decodedString = decodedBuffer.toString('utf-8')

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === "production" && process.env.DATABASE_CA_CERT ? {
      rejectUnauthorized: true,
      //ca: fs.readFileSync(certPath).toString()
      ca: decodedString
    } : "require"
  },
});
