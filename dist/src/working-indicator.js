var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) if (e.indexOf(p[i]) < 0)
            t[p[i]] = s[p[i]];
    return t;
};
import { workingIndicatorDirective } from 'smart-table-core';
import { onMount, onUnMount, update } from 'flaco';
export const withIndicator = (comp) => (conf) => {
    let updateFunction;
    // @ts-ignore
    const { stTable } = conf, otherConfProps = __rest(conf, ["stTable"]);
    const normalizedConf = {
        stTable
    };
    const { stTable: table } = normalizedConf;
    const directive = workingIndicatorDirective({ table });
    const listener = (newState) => updateFunction({ stState: newState });
    directive.onExecutionChange(listener);
    const WrappingComponent = props => {
        const { stState = { working: false }, stTable } = props, otherProps = __rest(props, ["stState", "stTable"]);
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
