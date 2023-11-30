# mongo-wrapper

## Description

This repository contains a node/TS wrapper which simplifies the process of communication with Mongo.

## How do I Use It?

Install a specific or the latest release in your `package.json` dependencies:

```json
"@quizizz/mongo": "github:quizizz/mongo-wrapper#v0.2.2"
```

Import and use in your code as follows:

```js
import Mongo from "@quizizz/mongo";

const eventEmitter = new EventEmitter();
const config = {...};

const mongoClient = MongoFactoryAuto("mongo", eventEmitter, config);
```

## How do I contribute?

We work based on releases. Steps:

- Branch out from `main`
  - Label the branch accordingly - `chore/...`, `feat/...`, `fix/...`
- Make a PR to `main` once done & tested
- Once approved and merged, create a new release from the `main` branch following the SEMVER approach to versioning
