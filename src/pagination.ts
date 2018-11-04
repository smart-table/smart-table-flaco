import {StDirective} from './interfaces';
import {
    PaginationDirective,
    paginationDirective,
    PaginationDirectiveConfiguration,
    SmartTableEvents,
    Summary
} from 'smart-table-core';
import {onMount, onUnMount, update, VNode} from 'flaco';

export interface StSummary extends Summary {
    lowerBoundIndex: number;
    higherBoundIndex: number;

}

export interface StPaginationArguments<T> {
    state: StSummary;
    config: StDirective<T>;
    directive: PaginationDirective;
}

export interface StPaginationComponentFunction<T, K> {
    (props: K, directiveDate: StPaginationArguments<T>): VNode;
}

export const withPagination = <T, K>(comp: StPaginationComponentFunction<T, K>) => (conf: StDirective<T> & K): (props: K) => VNode => {
    let updateFunc;
    // @ts-ignore
    const {stTable, ...otherConfProps} = conf;
    const directive = paginationDirective({table: stTable});

    const listener = (newSummary: Summary) => {
        const {page, size, filteredCount} = newSummary;
        updateFunc({
            stState: {
                lowerBoundIndex: (page - 1) * size,
                higherBoundIndex: Math.min(page * size - 1, filteredCount - 1),
                ...newSummary
            }
        });
    };
    directive.onSummaryChange(listener);

    const WrappingComponent = props => {
        const {stState = directive.state(), stTable, ...otherProps} = props;
        const fullProps = Object.assign({}, otherConfProps, otherProps);
        return comp(fullProps, {state: stState, config: {stTable}, directive});
    };

    const subscribe = onMount((vnode: VNode) => {
        updateFunc = update(WrappingComponent, vnode);
    });

    const unsubscribe = onUnMount(() => {
        directive.off(SmartTableEvents.SUMMARY_CHANGED);
    });

    return unsubscribe(subscribe(WrappingComponent));
};
