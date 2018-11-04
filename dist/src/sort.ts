import {onMount, onUnMount, update, VNode} from 'flaco';
import {SmartTableEvents, SortConfiguration, SortDirective, sortDirective} from 'smart-table-core';
import {StDirective} from './interfaces';

export interface StSortConfiguration<T> extends StDirective<T> {
    stPointer: string;
    stCycle?: boolean;
}

export interface StSortArguments<T> {
    state: SortConfiguration;
    config: StSortConfiguration<T>;
    directive: SortDirective;
}

export interface StSortComponentFunction<T, K> {
    (props: K, directiveData: StSortArguments<T>): VNode;
}


export const withSort = <T, K>(comp: StSortComponentFunction<T, K>) => (conf: StSortConfiguration<T> & K): (props: K) => VNode => {
    let updateFunction;

    // @ts-ignore
    const {stTable, stPointer, stCycle = false, ...otherConfProps} = conf;
    const normalizedConf: StSortConfiguration<T> = {
        stPointer,
        stCycle,
        stTable
    };
    const {stPointer: pointer, stTable: table, stCycle: cycle} = normalizedConf; //convenient aliases
    const directive = sortDirective({table, pointer, cycle});
    const listener = (newState) => updateFunction({stState: newState});
    directive.onSortToggle(listener);

    const WrappingComponent = props => {
        const {stState = directive.state(), stTable, stCycle, stPointer, ...otherProps} = props;
        const fullProps = Object.assign({}, otherConfProps, otherProps);
        return comp(fullProps, {state: stState, config: normalizedConf, directive});
    };

    const subscribe = onMount((vnode: VNode) => {
        updateFunction = update(WrappingComponent, vnode);
    });

    const unsubscribe = onUnMount(() => {
        directive.off(SmartTableEvents.TOGGLE_SORT);
    });

    return unsubscribe(subscribe(WrappingComponent));
};
