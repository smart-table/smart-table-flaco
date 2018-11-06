import test from 'zora';
import {wait} from './util';
import {smartTable, SortDirection} from 'smart-table-core';
import {withListChange} from '../dist/src';
import {mount, ul, li} from 'flaco';

interface Dummy {
    id: number;
    foo: string;
}

const fixture: Dummy[] = [{id: 1, foo: 'bar'}, {id: 2, foo: 'barbis'}];

const getVirtualContent = vnode => vnode.children.map(li => li.children[0].props.value);

const fixtureComponent = (props, stProps) => {
    const items = stProps.state;
    return ul(
        // @ts-ignore
        items.map(({value}) => li(`${value.id} ${value.foo}`))
    );
};

test('withList: should register to list change', async t => {
    const container = document.createDocumentFragment();
    const table = smartTable<Dummy>({
        data: fixture
    });

    let vnode = null;

    const comp = withListChange<Dummy, any>((props, stProps) => {
        return vnode = fixtureComponent(props, stProps);
    })({stTable: table});

    mount(comp, {}, container);

    await wait();

    t.deepEqual(getVirtualContent(vnode), ['1 bar', '2 barbis']);

    table.sort({pointer: 'id', direction: SortDirection.DESC});

    await wait();

    t.deepEqual(getVirtualContent(vnode), ['2 barbis', '1 bar']);
});

test('withList: should pass the stProps as second argument', async t => {
    const container = document.createDocumentFragment();
    const table = smartTable<Dummy>({
        data: fixture
    });

    let stProps = null;

    const comp = withListChange<Dummy, any>((props, other) => {
        stProps = other;
        return fixtureComponent(props, other);
    })({stTable: table});

    mount(comp, {}, container);

    await wait();

    t.deepEqual(stProps.config, {stTable: table});
    t.deepEqual(stProps.state, [{index: 0, value: {id: 1, foo: 'bar'}}, {
        index: 1,
        value: {id: 2, foo: 'barbis'}
    }]);
});
