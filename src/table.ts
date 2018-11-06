import {SmartTable} from 'smart-table-core';

export const withTable = <T>(table: SmartTable<T>) => (comp) => (props, ...rest) => comp(Object.assign({stTable: table}, props), ...rest);
