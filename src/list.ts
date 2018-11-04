import {onMount, update, onUnMount, VNode} from 'flaco';
import {DisplayedItem, SmartTable, SmartTableEvents} from 'smart-table-core';
import {StDirective} from './interfaces';


export interface StListArguments<T> {
    state: DisplayedItem<T>[];
    config: StDirective<T>;
}

export interface StListComponentFunction<T, K> {
    (props: K, listData: StListArguments<T>): VNode;
}

export const withListChange = <T, K>(comp: StListComponentFunction<T, K>) => (conf: StDirective<T> & K): (props: K) => VNode => {
    let updateFunc;

    // @ts-ignore
    const {stTable, ...otherConf} = conf;
    const normalizedConf: StDirective<T> = {stTable};
    const table: SmartTable<T> = normalizedConf.stTable;

    const listener = (items) => {
        updateFunc({items});
    };

    table.onDisplayChange(listener);

    const WrappingComponent = props => {
        const {items, stTable: whatever, ...otherProps} = props;
        const stState = items || [];
        const fullProps = Object.assign({}, otherConf, otherProps);
        return comp(fullProps, {state: stState, config: normalizedConf});
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
