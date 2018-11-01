import {onMount, update, onUnMount, VNode, ComponentFunction} from 'flaco';
import {DisplayedItem, SmartTable, SmartTableEvents} from 'smart-table-core';

export interface ListChangeConfigurationObject<T> {
    stTable: SmartTable<T>;
}

export type ListChangeConfiguration<T> = ListChangeConfigurationObject<T> | {
    stConfig: ListChangeConfigurationObject<T>
}

export interface ListChangeArguments<T> {
    state: DisplayedItem<T>[];
    config: ListChangeConfigurationObject<T>;
}

export interface ListChangeComponentFunction<T, K> {
    (props: K, listDate: ListChangeArguments<T>)
}

export const withListChange = <T, K>(comp: ListChangeComponentFunction<T, K>) => (conf: ListChangeConfiguration<T> & K): (props: K) => VNode => {
    let updateFunc;

    // @ts-ignore
    const normalizedConf: ListChangeConfigurationObject<T> = Object.assign({}, conf.stConfig || conf);
    const table: SmartTable<T> = normalizedConf.stTable;

    const listener = (items) => {
        updateFunc({items});
    };

    table.onDisplayChange(listener);

    const WrappingComponent = props => {
        const {stTable, ...left} = normalizedConf;
        const {items, stTable: whatever, ...otherProps} = props;
        const stConfig = {stTable};
        const stState = items || [];
        const fullProps = Object.assign({}, left, otherProps);
        return comp(fullProps, {state: stState, config: stConfig});
    };

    const subsribe = onMount((vnode: VNode) => {
        updateFunc = update(WrappingComponent, vnode);
        table.exec();
    });

    const unsubscribe = onUnMount(() => {
        table.off(SmartTableEvents.DISPLAY_CHANGED, listener);
    });

    return unsubscribe(subsribe(WrappingComponent));
};
