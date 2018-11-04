import {
    SmartTableEvents,
    WorkingIndicator,
    workingIndicatorDirective,
    WorkingIndicatorDirective
} from 'smart-table-core';
import {StDirective} from './interfaces';
import {onMount, onUnMount, update, VNode} from 'flaco';

export interface StWorkingArguments<T> {
    state: WorkingIndicator;
    config: StDirective<T>;
    directive: WorkingIndicatorDirective;
}

export interface StWorkingComponentFunction<T, K> {
    (props: K, directiveData: StWorkingArguments<T>): VNode
}

export const withIndicator = <T, K>(comp: StWorkingComponentFunction<T, K>) => (conf: StDirective<T> & K): (props: K) => VNode => {
    let updateFunction;

    // @ts-ignore
    const {stTable, ...otherConfProps} = conf;
    const normalizedConf: StDirective<T> = {
        stTable
    };
    const {stTable: table} = normalizedConf;
    const directive = workingIndicatorDirective({table});
    const listener = (newState) => updateFunction({stState: newState});
    directive.onExecutionChange(listener);

    const WrappingComponent = props => {
        const {stState = {working: false}, stTable, ...otherProps} = props;
        const fullProps = Object.assign({}, otherConfProps, otherProps);
        return comp(fullProps, {state: stState, config: normalizedConf, directive});
    };

    const subscribe = onMount((vnode: VNode) => {
        updateFunction = update(WrappingComponent, vnode);
    });

    const unsubscribe = onUnMount(() => {
        directive.off(SmartTableEvents.EXEC_CHANGED);
    });

    return unsubscribe(subscribe(WrappingComponent));
};
