import {onMount, onUnMount,update, VNode} from 'flaco';
import {StDirective} from './interfaces';
import {
    filterDirective,
    FilterType,
    FilterOperator,
    FilterConfiguration,
    FilterDirective, SmartTableEvents
} from 'smart-table-core';

export interface StFilterConfiguration<T> extends StDirective<T> {
    stPointer: string;
    stOperator?: FilterOperator;
    stType?: FilterType;
}

export interface StFilterArguments<T> {
    state: FilterConfiguration;
    config: StFilterConfiguration<T>;
    directive: FilterDirective;
}

export interface StFilterComponentFunction<T, K> {
    (props: K, directiveData: StFilterArguments<T>): VNode;
}

export const withFilter = <T, K>(comp: StFilterComponentFunction<T, K>) => (conf: StFilterConfiguration<T> & K): (props: K) => VNode => {
    let updateFunction;
    // @ts-ignore
    const {stTable, stType = FilterType.STRING, stOperator = FilterOperator.INCLUDES, stPointer, ...otherConfProps} = conf;
    const normalizedConf: StFilterConfiguration<T> = {
        stTable, stType, stOperator, stPointer
    };
    const {stTable: table, stOperator: operator, stType: type, stPointer: pointer} = normalizedConf;
    const directive: FilterDirective = filterDirective({
        table, operator, pointer, type
    });
    const listener = newState => updateFunction({stState: newState});
    directive.onFilterChange(listener);

    const WrappingComponent = props => {
        const {stState = directive.state(), stTable, stType, stOperator, stPointer, ...otherProps} = props;
        const fullProps = Object.assign({}, otherConfProps, otherProps);
        return comp(fullProps, {state: stState, config: normalizedConf, directive});
    };

    const subscribe = onMount((vnode: VNode)=>{
        updateFunction = update(WrappingComponent, vnode);
    });

    const unsubscribe = onUnMount(()=>{
        directive.off(SmartTableEvents.FILTER_CHANGED);
    });

    return unsubscribe(subscribe(WrappingComponent));
};
