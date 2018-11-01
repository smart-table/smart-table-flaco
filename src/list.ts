import {onMount, update, onUnMount, VNode} from 'flaco';
import {DisplayedItem, SmartTable, SmartTableEvents} from 'smart-table-core';

export interface stListConfigurationObject<T> {
    stTable: SmartTable<T>;
}

export type stListConfiguration<T> = stListConfigurationObject<T> | {
    stConfig: stListConfigurationObject<T>
}

export interface stListArguments<T> {
    state: DisplayedItem<T>[];
    config: stListConfigurationObject<T>;
}

export interface stListComponentFunction<T, K> {
    (props: K, listDate: stListArguments<T>)
}

export const withListChange = <T, K>(comp: stListComponentFunction<T, K>) => (conf: stListConfiguration<T> & K): (props: K) => VNode => {
    let updateFunc;

    // @ts-ignore
    const normalizedConf: stListConfigurationObject<T> = Object.assign({}, conf.stConfig || conf);
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
