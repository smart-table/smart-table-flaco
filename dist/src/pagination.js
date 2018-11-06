import { paginationDirective } from 'smart-table-core';
import { onMount, onUnMount, update } from 'flaco';
export const withPagination = (comp) => (conf) => {
    let updateFunc;
    // @ts-ignore
    const { stTable, ...otherConfProps } = conf;
    const directive = paginationDirective({ table: stTable });
    const listener = (newSummary) => {
        const { page, size, filteredCount } = newSummary;
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
        const { stState = directive.state(), stTable, ...otherProps } = props;
        const fullProps = Object.assign({}, otherConfProps, otherProps);
        return comp(fullProps, { state: stState, config: { stTable }, directive });
    };
    const subscribe = onMount((vnode) => {
        updateFunc = update(WrappingComponent, vnode);
    });
    const unsubscribe = onUnMount(() => {
        directive.off("SUMMARY_CHANGED" /* SUMMARY_CHANGED */);
    });
    return unsubscribe(subscribe(WrappingComponent));
};
