[![build status][travis-image]][travis-url]

[travis-image]: https://travis-ci.org/jackytck/mongo-relay-connection.svg?branch=master
[travis-url]: https://travis-ci.org/jackytck/mongo-relay-connection


### Install

```bash
yarn add mongo-relay-connection graphql graphql-relay
```

`graphql` and `graphql-relay` are required as peer dependencies.

### Overview
To assist building a Relay connection type from a mongoose schema. It supports dynamic collection, based on sorting of a single given field (default is _id). If the field is not unique, it is compounded with _id as the secondary sort.

The exported resolve function implements the Relay [pagination algorithm](https://facebook.github.io/relay/graphql/connections.htm#sec-Pagination-algorithm), except that `first` is treated as the same as `last`, as `after` + `last` or `before` + `first` are rarely used.

### License

MIT
