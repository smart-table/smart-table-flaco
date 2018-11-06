import { workingIndicatorDirective } from 'smart-table-core';
import { onMount, onUnMount, update } from 'flaco';
export const withIndicator = (comp) => (conf) => {
    let updateFunction;
    // @ts-ignore
    const { stTable, ...otherConfProps } = conf;
    const normalizedConf = {
        stTable
    };
    const { stTable: table } = normalizedConf;
    const directive = workingIndicatorDirective({ table });
    const listener = (newState) => updateFunction({ stState: newState });
    directive.onExecutionChange(listener);
    const WrappingComponent = props => {
        const { stState = { working: false }, stTable, ...otherProps } = props;
        const fullProps = Object.assign({}, otherConfProps, otherProps);
        return comp(fullProps, { state: stState, config: normalizedConf, directive });
    };
    const subscribe = onMount((vnode) => {
        updateFunction = update(WrappingComponent, vnode);
    });
    const unsubscribe = onUnMount(() => {
        directive.off("EXEC_CHANGED" /* EXEC_CHANGED */);
    });
    return unsubscribe(subscribe(WrappingComponent));
};
