# smart-table-json-pointer

[![CircleCI](https://circleci.com/gh/smart-table/smart-table-json-pointer.svg?style=svg)](https://circleci.com/gh/smart-table/smart-table-json-pointer)

1. Access nested property within an object
2. Merge sub object with a new object.

For nodejs and browsers.

## Installation

### npm

``npm install --save smart-table-json-pointer``

### yarn

``yarn add smart-table-json-pointer

## Usage

```Javascript
import jsonPointer from 'smart-table-json-pointer'

const pointer = jsonPointer('foo.bar.woot');

pointer.get({foo:'value'});
// > undefined

pointer.get({foo:{bar:{woot:'value'}}});
// > 'value'

const target = {foo:{bar:{woot:{blah:'nut'}}}};
pointer.set(target,{ni:'bup'});

console.log(target);
// >  {foo:{bar:{woot:{blah:'nut',ni:'bup'}}}};
```
