import { MongoClient } from "mongodb";
import { EventEmitter } from 'events';
import { connectionConfig } from "./connection";

export class MongooseWrapper {
  client: MongoClient;
  constructor(name: string, emitter: EventEmitter, config: connectionConfig);
  init(): Promise<MongooseWrapper>
}
