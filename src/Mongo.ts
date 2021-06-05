import events from "events";
import {
  Db,
  MongoClient,
  MongoClientOptions,
  Logger as MongoLogger,
  ObjectId,
  ReadPreference,
} from "mongodb";

export interface Server {
  host: string;
  port: number;
}

export interface AuthConfig {
  username: string;
  password: string;
  authSource?: string;
}

export interface UserConfig {
  db: string;
  auth?: AuthConfig;
  getServers(): Promise<Server[]>;
}

interface Mongo {
  log(message: string, data?: Record<string, any>): void;
  success(message: string, data?: Record<string, any>): void;
  error(err: Error, data?: Record<string, any>): void;
  connect(): Promise<Mongo>;
}

class MongoConnect implements Mongo {
  name: string;
  emitter: events.EventEmitter;
  mongoClient: MongoClient;
  client: Db;
  connected: boolean;
  userConfig: UserConfig;
  config: MongoClientOptions;
  mode: string;

  constructor(
    name: string,
    emitter: events.EventEmitter,
    userConfig: UserConfig,
    mode: string
  ) {
    this.name = name;
    this.emitter = emitter;
    this.userConfig = userConfig;
    this.config = {
      keepAlive: true,
      autoReconnect: true,
      poolSize: 5,
      connectTimeoutMS: 30000,
      socketTimeoutMS: 30000,
      useUnifiedTopology: true,
      connectWithNoPrimary: false,
      readPreference: ReadPreference.SECONDARY,
    };
    if (userConfig.auth) {
      this.config.auth = {
        user: userConfig.auth.username,
        password: userConfig.auth.password,
      };
      this.config.authSource = userConfig.auth.authSource;
    }
    this.mode = mode;
  }

  log(message: string, data?: Record<string, any>) {
    this.emitter.emit("log", {
      service: this.name,
      message,
      data,
    });
  }

  success(message: string, data?: Record<string, any>) {
    this.emitter.emit("success", {
      service: this.name,
      message,
      data,
    });
  }

  error(err: Error, data?: Record<string, any>) {
    this.emitter.emit("error", {
      service: this.name,
      data,
      err,
    });
  }

  private async getConnectionUrl() {
    const servers = await this.userConfig.getServers();
    const joiner = ["mongodb://"];

    if (this.userConfig.auth) {
      const { username, password } = this.userConfig.auth;
      joiner.push(`${username}:${password}@`);
    }

    joiner.push(
      servers.map((server) => `${server.host}:${server.port}`).join(",")
    );

    return joiner.join("");
  }

  async connect(): Promise<Mongo> {
    if (this.client) {
      return Promise.resolve(this);
    }
    const connectionUrl = await this.getConnectionUrl();
    this.mongoClient = await MongoClient.connect(connectionUrl, this.config);
    this.client = this.mongoClient.db(this.userConfig.db);
    this.connected = true;
    this.success(`Successfully connected in ${this.mode} mode`);
    MongoLogger.setLevel("info");
    MongoLogger.setCurrentLogger((msg, context) => {
      this.log(msg, context);
    });
    return this;
  }
}

export enum MODES {
  STANDALONE = "standalone",
  PSA = "psa",
  SHARD = "shard",
}

export interface StandaloneConfig {
  host: string;
  port: number;
  db: string;
  auth?: AuthConfig;
}

export interface ReplicaConfig {
  db: string;
  replica: {
    name: string;
    servers: Server[];
  };
  auth?: AuthConfig;
}

export interface ShardConfig {
  db: string;
  shard: {
    getServers: () => Promise<Server[]>;
  };
  auth?: AuthConfig;
}

export function MongoFactory(
  mode: string,
  name: string,
  emitter: events.EventEmitter,
  config: StandaloneConfig | ReplicaConfig | ShardConfig
) {
  switch (mode) {
    case MODES.STANDALONE:
      return new StandaloneMongo(name, emitter, config as StandaloneConfig);
    case MODES.PSA:
      return new PsaMongo(name, emitter, config as ReplicaConfig);
    case MODES.SHARD:
      return new ShardMongo(name, emitter, config as ShardConfig);
    default:
      throw new Error("Invalid architecture");
  }
}

class StandaloneMongo extends MongoConnect {
  constructor(
    name: string,
    emitter: events.EventEmitter,
    config: StandaloneConfig
  ) {
    const { db, host, port, auth } = config;
    const userConfig: UserConfig = {
      db,
      getServers: () => Promise.resolve([{ host, port }]),
      auth,
    };
    super(name, emitter, userConfig, MODES.STANDALONE);
  }
}

class PsaMongo extends MongoConnect {
  constructor(
    name: string,
    emitter: events.EventEmitter,
    replicaConfig: ReplicaConfig
  ) {
    const { db, replica, auth } = replicaConfig;
    const config: UserConfig = {
      db: db,
      getServers: () => Promise.resolve(replica.servers),
      auth,
    };
    super(name, emitter, config, MODES.PSA);
    this.config.replicaSet = replica.name;
  }
}

class ShardMongo extends MongoConnect {
  constructor(
    name: string,
    emitter: events.EventEmitter,
    shardConfig: ShardConfig
  ) {
    const { db, shard, auth } = shardConfig;
    super(
      name,
      emitter,
      { db, getServers: shard.getServers, auth },
      MODES.SHARD
    );
  }
}

export function isValidObjectId(value: string | number | ObjectId) {
  const regex = /[0-9a-f]{24}/;
  const matched = String(value).match(regex);
  if (!matched) {
    return false;
  }

  return ObjectId.isValid(value);
}

export function castToObjectId(value: string) {
  if (isValidObjectId(value) === false) {
    throw new TypeError(`Value passed is not valid objectId, is [ ${value} ]`);
  }
  return ObjectId.createFromHexString(value);
}

export { ObjectId } from "mongodb";
