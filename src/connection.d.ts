import { MongoClientOptions } from "mongodb";

type connectionConfig = {
  host?: string;
  port?: number;
  dbName?: string;
  replica?: {
    use: boolean;
    name: string;
    servers: { host: string; port: number }[];
  };
  auth?: {
    use: boolean;
  },
  options?: MongoClientOptions,
}