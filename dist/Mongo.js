"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Db = exports.MongoClient = exports.ObjectId = exports.castToObjectId = exports.isValidObjectId = exports.MongoFactoryAuto = exports.MongoFactory = exports.MODES = exports.handleMongoError = exports.MongoConnect = void 0;
const mongodb_1 = require("mongodb");
Object.defineProperty(exports, "Db", { enumerable: true, get: function () { return mongodb_1.Db; } });
Object.defineProperty(exports, "MongoClient", { enumerable: true, get: function () { return mongodb_1.MongoClient; } });
Object.defineProperty(exports, "ObjectId", { enumerable: true, get: function () { return mongodb_1.ObjectId; } });
class MongoConnect {
    name;
    emitter;
    mongoClient;
    client;
    userConfig;
    config;
    mode;
    reconnecting;
    healthyHosts;
    constructor(name, emitter, userConfig, mode) {
        this.name = name;
        this.emitter = emitter;
        this.userConfig = userConfig;
        this.config = {
            maxPoolSize: 5,
            connectTimeoutMS: 30000,
            socketTimeoutMS: 30000,
            serverSelectionTimeoutMS: 10000,
            readPreference: mongodb_1.ReadPreference.SECONDARY_PREFERRED,
        };
        this.config.authSource = (userConfig.auth || {}).authSource;
        this.mode = mode;
    }
    log(message, data) {
        this.emitter.emit("log", {
            service: this.name,
            message,
            data,
        });
    }
    success(message, data) {
        this.emitter.emit("success", {
            service: this.name,
            message,
            data,
        });
    }
    error(err, data) {
        this.emitter.emit("error", {
            service: this.name,
            data,
            err,
        });
    }
    getHealthyHosts() {
        return this.healthyHosts || [];
    }
    async getConnectionUrl() {
        let servers = await this.userConfig.getServers();
        const joiner = ["mongodb://"];
        if (this.userConfig.auth) {
            const { username, password } = this.userConfig.auth;
            joiner.push(`${username}:${password}@`);
        }
        // If no active servers, retry with old servers once again
        if (servers.length == 0) {
            servers = this.getHealthyHosts();
        }
        this.healthyHosts = servers;
        joiner.push(servers.map((server) => `${server.host}:${server.port}`).join(","));
        return joiner.join("");
    }
    static isValidError(err) {
        return err instanceof mongodb_1.MongoError;
    }
    getClient() {
        return this.mongoClient;
    }
    async connect() {
        let connected = false;
        // Reconnection handler
        let attempt = 1;
        // Keep reference to old mongoClient, will need to close it later
        const oldMongoClient = this.mongoClient;
        while (!connected && attempt <= 10) {
            try {
                // Returns connection url with only healthy hosts
                const connectionUrl = await this.getConnectionUrl(); // C * 10 => 10C seconds
                const mongoClient = new mongodb_1.MongoClient(connectionUrl, this.config); // 10 * 10 => 100 seconds
                await mongoClient.connect();
                // Update this.mongoClient ONLY after a valid client has been established; else topology closed error will
                // be thrown will is not being monitored/is valid error for reconnection
                this.mongoClient = mongoClient;
                connected = true;
            }
            catch (err) {
                if (MongoConnect.isValidError(err)) {
                    this.error(err);
                    // 2 + 4 + 6 + 8 + 10 + 12 ... 20 => 2 * (1 + 2 + 3 + 4 ... 10) => 2 * ((10 * 11) / 2) => 110 seconds
                    await new Promise((res) => setTimeout(res, 2 * attempt * 1000));
                    attempt++;
                }
                else {
                    throw new Error(err);
                }
            }
        }
        this.client = this.mongoClient.db(this.userConfig.db);
        this.success(`Successfully connected in ${this.mode} mode`);
        if (oldMongoClient instanceof mongodb_1.MongoClient) {
            // Do NOT wait. If you wait, this might block indefinitely due to the older server being out of action.
            oldMongoClient.close();
        }
        return this;
    }
}
exports.MongoConnect = MongoConnect;
async function handleMongoError(err, mongo) {
    if (MongoConnect.isValidError(err)) {
        if (mongo.reconnecting === null) {
            mongo.reconnecting = mongo.connect().then(() => {
                return null;
            });
        }
        await (mongo.reconnecting || Promise.resolve());
        mongo.reconnecting = null;
        return null;
    }
    return err;
}
exports.handleMongoError = handleMongoError;
var MODES;
(function (MODES) {
    MODES["SERVER"] = "server";
    MODES["REPLSET"] = "replset";
    MODES["SHARD"] = "shard";
})(MODES || (exports.MODES = MODES = {}));
function MongoFactory(mode, name, emitter, config) {
    switch (mode) {
        case MODES.SERVER:
            return new ServerMongo(name, emitter, config);
        case MODES.REPLSET:
            return new ReplSet(name, emitter, config);
        case MODES.SHARD:
            return new ShardMongo(name, emitter, config);
        default:
            throw new Error("Invalid architecture");
    }
}
exports.MongoFactory = MongoFactory;
class ServerMongo extends MongoConnect {
    constructor(name, emitter, config) {
        const { db, host, port, auth } = config;
        const userConfig = {
            db,
            getServers: () => Promise.resolve([{ host, port }]),
            auth,
        };
        super(name, emitter, userConfig, MODES.SERVER);
    }
}
class ReplSet extends MongoConnect {
    constructor(name, emitter, replicaConfig) {
        const { db, replica, auth } = replicaConfig;
        const config = {
            db: db,
            getServers: () => Promise.resolve(replica.servers),
            auth,
        };
        super(name, emitter, config, MODES.REPLSET);
        this.config.replicaSet = replica.name;
    }
}
class ShardMongo extends MongoConnect {
    constructor(name, emitter, shardConfig) {
        const { db, shard, auth } = shardConfig;
        super(name, emitter, { db, getServers: shard.getServers, auth }, MODES.SHARD);
    }
}
function MongoFactoryAuto(name, emitter, config) {
    if (config.replica) {
        return MongoFactory(MODES.REPLSET, name, emitter, config);
    }
    else if (config.shard) {
        return MongoFactory(MODES.SHARD, name, emitter, config);
    }
    else {
        return MongoFactory(MODES.SERVER, name, emitter, config);
    }
}
exports.MongoFactoryAuto = MongoFactoryAuto;
function isValidObjectId(value) {
    const regex = /[0-9a-f]{24}/;
    const matched = String(value).match(regex);
    if (!matched) {
        return false;
    }
    return mongodb_1.ObjectId.isValid(value);
}
exports.isValidObjectId = isValidObjectId;
function castToObjectId(value) {
    if (isValidObjectId(value) === false) {
        throw new TypeError(`Value passed is not valid objectId, is [ ${value} ]`);
    }
    return mongodb_1.ObjectId.createFromHexString(value);
}
exports.castToObjectId = castToObjectId;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiTW9uZ28uanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvTW9uZ28udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQ0EscUNBT2lCO0FBNFNlLG1GQWxUOUIsWUFBRSxPQWtUOEI7QUFBZiw0RkFqVGpCLHFCQUFXLE9BaVRpQjtBQUFyQix5RkE5U1Asa0JBQVEsT0E4U087QUEvUWpCLE1BQWEsWUFBWTtJQUN2QixJQUFJLENBQVM7SUFDYixPQUFPLENBQXNCO0lBQzdCLFdBQVcsQ0FBYztJQUN6QixNQUFNLENBQUs7SUFDWCxVQUFVLENBQWE7SUFDdkIsTUFBTSxDQUFxQjtJQUMzQixJQUFJLENBQVM7SUFDYixZQUFZLENBQWlCO0lBQ3JCLFlBQVksQ0FBVztJQUUvQixZQUNFLElBQVksRUFDWixPQUE0QixFQUM1QixVQUFzQixFQUN0QixJQUFZO1FBRVosSUFBSSxDQUFDLElBQUksR0FBRyxJQUFJLENBQUM7UUFDakIsSUFBSSxDQUFDLE9BQU8sR0FBRyxPQUFPLENBQUM7UUFDdkIsSUFBSSxDQUFDLFVBQVUsR0FBRyxVQUFVLENBQUM7UUFDN0IsSUFBSSxDQUFDLE1BQU0sR0FBRztZQUNaLFdBQVcsRUFBRSxDQUFDO1lBQ2QsZ0JBQWdCLEVBQUUsS0FBSztZQUN2QixlQUFlLEVBQUUsS0FBSztZQUN0Qix3QkFBd0IsRUFBRSxLQUFLO1lBQy9CLGNBQWMsRUFBRSx3QkFBYyxDQUFDLG1CQUFtQjtTQUNuRCxDQUFDO1FBQ0YsSUFBSSxDQUFDLE1BQU0sQ0FBQyxVQUFVLEdBQUcsQ0FBQyxVQUFVLENBQUMsSUFBSSxJQUFJLEVBQUUsQ0FBQyxDQUFDLFVBQVUsQ0FBQztRQUM1RCxJQUFJLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQztJQUNuQixDQUFDO0lBRUQsR0FBRyxDQUFDLE9BQWUsRUFBRSxJQUEwQjtRQUM3QyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUU7WUFDdkIsT0FBTyxFQUFFLElBQUksQ0FB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