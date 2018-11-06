import { onMount, onUnMount, update } from 'flaco';
import { sortDirective } from 'smart-table-core';
export const withSort = (comp) => (conf) => {
    let updateFunction;
    // @ts-ignore
    const { stTable, stPointer, stCycle = false, ...otherConfProps } = conf;
    const normalizedConf = {
        stPointer,
        stCycle,
        stTable
    };
    const { stPointer: pointer, stTable: table, stCycle: cycle } = normalizedConf; //convenient aliases
    const directive = sortDirective({ table, pointer, cycle });
    const listener = (newState) => updateFunction({ stState: newState });
    directive.onSortToggle(listener);
    const WrappingComponent = props => {
        const { stState = directive.state(), stTable, stCycle, stPointer, ...otherProps } = props;
        const fullProps = Object.assign({}, otherConfProps, otherProps);
        return comp(fullProps, { state: stState, config: normalizedConf, directive });
    };
    const subscribe = onMount((vnode) => {
        updateFunction = update(WrappingComponent, vnode);
    });
    const unsubscribe = onUnMount(() => {
        directive.off("TOGGLE_SORT" /* TOGGLE_SORT */);
    });
    return unsubscribe(subscribe(WrappingComponent));
};
