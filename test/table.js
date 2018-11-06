import test from 'zora';
import { withTable } from '../dist/src';
import { h } from 'flaco';
import { smartTable } from 'smart-table-core';
test('withTable: should make sure a component get stTable reference', t => {
    const table = smartTable({ data: [] });
    let stTableRef;
    const comp = withTable(table)(props => {
        stTableRef = props.stTable;
        return h('span', {}, 'whatever');
    });
    const vnode = comp({});
    t.equal(vnode.stTable, table, 'should have passed the smart table reference along');
});
