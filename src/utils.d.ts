import { ObjectId } from "mongodb";

export function isValidObjectId(value: unknown): boolean;
export function castToObjectId(value: string | ObjectId): ObjectId | never;

