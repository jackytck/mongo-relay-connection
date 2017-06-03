[![build status][travis-image]][travis-url]
[![NPM version][npm-image]][npm-url]
[![Coverage Status][coverall-image]][coverall-url]
[![js-standard-style][standard-image]][standard-url]
[![devDependency Status][david-image]][david-url]
[![devDevDependency Status][david-image-dev]][david-url-dev]

[travis-image]: https://travis-ci.org/jackytck/mongo-relay-connection.svg?branch=master
[travis-url]: https://travis-ci.org/jackytck/mongo-relay-connection
[npm-image]: https://img.shields.io/npm/v/mongo-relay-connection.svg
[npm-url]: https://npmjs.org/package/mongo-relay-connection
[coverall-image]: https://coveralls.io/repos/jackytck/mongo-relay-connection/badge.svg?branch=master
[coverall-url]: https://coveralls.io/github/jackytck/mongo-relay-connection?branch=master
[standard-image]: https://img.shields.io/badge/code%20style-standard-brightgreen.svg
[standard-url]: http://standardjs.com
[david-image]: https://david-dm.org/jackytck/mongo-relay-connection.svg
[david-url]: https://david-dm.org/jackytck/mongo-relay-connection
[david-image-dev]: https://david-dm.org/jackytck/mongo-relay-connection/dev-status.svg
[david-url-dev]: https://david-dm.org/jackytck/mongo-relay-connection#info=devDependencies

### Install

```bash
yarn add mongo-relay-connection graphql graphql-relay
```

`graphql` and `graphql-relay` are required as peer dependencies.

### Overview
To assist building a **Relay Connection** type from a mongoose schema. It supports **dynamic collection**. The order could be based on a field that is **not necessarily unique**. And existing schema **need not be changed** at all.

It is based on the Relay [pagination algorithm](https://facebook.github.io/relay/graphql/connections.htm#sec-Pagination-algorithm). But as including a value for both first and last is confusing, the last is ignored if both are given.

|  # 	| after 	| first 	| before 	| last 	|   remarks   	| support 	|
|:--:	|:-----:	|:-----:	|:------:	|:----:	|:-----------:	|:-------:	|
|  1 	|       	|       	|        	|      	| returns all 	|    ✓    	|
|  2 	|       	|       	|        	|   ✓  	|             	|    ✓    	|
|  3 	|       	|       	|    ✓   	|      	|             	|    ✓    	|
|  4 	|       	|       	|    ✓   	|   ✓  	|             	|    ✓    	|
|  5 	|       	|   ✓   	|        	|      	|             	|    ✓    	|
|  6 	|       	|   ✓   	|        	|   ✓  	|  same as #5 	|    ✗    	|
|  7 	|       	|   ✓   	|    ✓   	|      	|             	|    ✓    	|
|  8 	|       	|   ✓   	|    ✓   	|   ✓  	|  same as #7 	|    ✗    	|
|  9 	|   ✓   	|       	|        	|      	|             	|    ✓    	|
| 10 	|   ✓   	|       	|        	|   ✓  	|             	|    ✓    	|
| 11 	|   ✓   	|       	|    ✓   	|      	|             	|    ✓    	|
| 12 	|   ✓   	|       	|    ✓   	|   ✓  	|             	|    ✓    	|
| 13 	|   ✓   	|   ✓   	|        	|      	|             	|    ✓    	|
| 14 	|   ✓   	|   ✓   	|        	|   ✓  	| same as #13 	|    ✗    	|
| 15 	|   ✓   	|   ✓   	|    ✓   	|      	|             	|    ✓    	|
| 16 	|   ✓   	|   ✓   	|    ✓   	|   ✓  	| same as #15 	|    ✗    	|

### Usage
Suppose you want to do cursor based pagination over a collection:
``` js
// models/product.js

import mongoose, { Schema } from 'mongoose'

const ProductSchema = new Schema({
  name: String,
  type: String,
  price: Number
})

export default mongoose.model('Product', ProductSchema)
```

First create a corresponding GraphQLObjectType:
``` js
// types/product.js

import {
  GraphQLObjectType,
  GraphQLID,
  GraphQLString,
  GraphQLInt
} from 'graphql'

const Product = new GraphQLObjectType({
  name: 'Product',
  fields: {
    id: { type: GraphQLID },
    name: { type: GraphQLString },
    type: { type: GraphQLString },
    price: { type: GraphQLInt }
  }
})

export default Product
```

Then create your query by defining the type, args, and resolve function.
Here all the food product is selected and sorted by price descendingly:
``` js
import {
  GraphQLObjectType
} from 'graphql'
import {
  mrType,
  mrArgs,
  mrResolve
} from 'mongo-relay-connection'
import Product from './types/product'
import ProductModel from './models/product'

const foodTypes = [
  "Bacon",
  "Cheese",
  "Chicken",
  "Chips",
  "Fish",
  "Pizza",
  "Salad",
  "Sausages",
  "Tuna"
]

const RootQuery = new GraphQLObjectType({
  name: 'RootQuery',
  fields: {
    allFoodProducts: {
      type: mrType('FoodProduct', Product),
      args: mrArgs,
      resolve (parentValue, args) {
        const query = {
          type: { $in: foodTypes }
        }
        const opts = {
          cursorField: 'price',
          direction: -1
        }
        return mrResolve(args, ProductModel, query, opts)
      }
    }
  }
})

export default RootQuery
```
Boom, you're done! No third step. All the hard work of resolving is done for you.


### Limitation
It is based on sorting on a single given field (default is _id). If the field is not unique, it is compounded with _id as the secondary sort. So it could only be
sorted in one given dimension.

### License

MIT
