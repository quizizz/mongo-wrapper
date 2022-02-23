import { MongoClient } from "mongodb";
import { EventEmitter } from 'events';
import { connectionConfig } from "./connection";

export class MongoWrapper {
  client: MongoClient;
  constructor(name: string, emitter: EventEmitter, config: connectionConfig);
  init(): Promise<MongoWrapper>
}
