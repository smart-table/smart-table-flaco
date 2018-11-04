import {onMount, onUnMount, update, VNode} from 'flaco';
import {
    SearchConfiguration,
    searchDirective, SearchDirective, SmartTableEvents
} from 'smart-table-core';
import {StDirective} from './interfaces';

export interface StSearchConfiguration<T> extends StDirective<T> {
    stScope: string[];
}

export interface StSearchArguments<T> {
    state: SearchConfiguration;
    config: StSearchConfiguration<T>;
    directive:SearchDirective;
}

export interface StSearchComponentFunction<T, K> {
    (props: K, directiveData: StSearchArguments<T>): VNode;
}

export const withSearch = <T, K>(comp: StSearchComponentFunction<T, K>) => (conf: StSearchConfiguration<T> & K): (props: K) => VNode => {
    let updateFunction;

    // @ts-ignore
    const {stTable, stScope, ...otherConfProps} = conf;
    const normalizedConf: StSearchConfiguration<T> = {
        stTable,
        stScope
    };
    const {stTable: table, stScope: scope} = normalizedConf;
    const directive = searchDirective({table, scope});
    const listener = (newState) => updateFunction({stState: newState});
    directive.onSearchChange(listener);

    const WrappingComponent = props => {
        const {stState = directive.state(), stTable, stScope, ...otherProps} = props;
        const fullProps = Object.assign({}, otherConfProps, otherProps);
        return comp(fullProps, {state: stState, config: normalizedConf, directive});
    };

    const subscribe = onMount((vnode: VNode) => {
        updateFunction = update(WrappingComponent, vnode);
    });

    const unsubscribe = onUnMount(() => {
        directive.off(SmartTableEvents.SEARCH_CHANGED);
    });

    return unsubscribe(subscribe(WrappingComponent));
};
