[![build status][travis-image]][travis-url]

[travis-image]: https://travis-ci.org/jackytck/mongo-relay-connection.svg?branch=master
[travis-url]: https://travis-ci.org/jackytck/mongo-relay-connection


### Install

```bash
yarn add mongo-relay-connection graphql graphql-relay
```

`graphql` and `graphql-relay` are required as peer dependencies.

### Overview
To assist building a relay connection type from a mongoose schema. It supports dynamic collection, based on sorting of a single given field (default is _id). If the field is not unique, it is compounded with _id as the secondary sort.

### License

MIT
