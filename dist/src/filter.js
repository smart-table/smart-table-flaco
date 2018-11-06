import { onMount, onUnMount, update } from 'flaco';
import { filterDirective } from 'smart-table-core';
export const withFilter = (comp) => (conf) => {
    let updateFunction;
    // @ts-ignore
    const { stTable, stType = "string" /* STRING */, stOperator = "includes" /* INCLUDES */, stPointer, ...otherConfProps } = conf;
    const normalizedConf = {
        stTable, stType, stOperator, stPointer
    };
    const { stTable: table, stOperator: operator, stType: type, stPointer: pointer } = normalizedConf;
    const directive = filterDirective({
        table, operator, pointer, type
    });
    const listener = newState => updateFunction({ stState: newState });
    directive.onFilterChange(listener);
    const WrappingComponent = props => {
        const { stState = directive.state(), stTable, stType, stOperator, stPointer, ...otherProps } = props;
        const fullProps = Object.assign({}, otherConfProps, otherProps);
        return comp(fullProps, { state: stState, config: normalizedConf, directive });
    };
    const subscribe = onMount((vnode) => {
        updateFunction = update(WrappingComponent, vnode);
    });
    const unsubscribe = onUnMount(() => {
        directive.off("FILTER_CHANGED" /* FILTER_CHANGED */);
    });
    return unsubscribe(subscribe(WrappingComponent));
};
