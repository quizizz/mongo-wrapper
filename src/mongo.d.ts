import { Db, Collection } from "mongodb";
import { EventEmitter } from 'events';
import { connectionConfig } from "./connection";

export class MongoWrapper {
  client: Db;
  constructor(name: string, emitter: EventEmitter, config: connectionConfig);
  init(): Promise<MongoWrapper>
  getCollection<T>(name: string): Collection<T>;
}

export type Collection = Collection;
