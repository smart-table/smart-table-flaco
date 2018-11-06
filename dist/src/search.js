import { onMount, onUnMount, update } from 'flaco';
import { searchDirective } from 'smart-table-core';
export const withSearch = (comp) => (conf) => {
    let updateFunction;
    // @ts-ignore
    const { stTable, stScope, ...otherConfProps } = conf;
    const normalizedConf = {
        stTable,
        stScope
    };
    const { stTable: table, stScope: scope } = normalizedConf;
    const directive = searchDirective({ table, scope });
    const listener = (newState) => updateFunction({ stState: newState });
    directive.onSearchChange(listener);
    const WrappingComponent = props => {
        const { stState = directive.state(), stTable, stScope, ...otherProps } = props;
        const fullProps = Object.assign({}, otherConfProps, otherProps);
        return comp(fullProps, { state: stState, config: normalizedConf, directive });
    };
    const subscribe = onMount((vnode) => {
        updateFunction = update(WrappingComponent, vnode);
    });
    const unsubscribe = onUnMount(() => {
        directive.off("SEARCH_CHANGED" /* SEARCH_CHANGED */);
    });
    return unsubscribe(subscribe(WrappingComponent));
};
