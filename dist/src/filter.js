var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) if (e.indexOf(p[i]) < 0)
            t[p[i]] = s[p[i]];
    return t;
};
import { onMount, onUnMount, update } from 'flaco';
import { filterDirective } from 'smart-table-core';
export const withFilter = (comp) => (conf) => {
    let updateFunction;
    // @ts-ignore
    const { stTable, stType = "string" /* STRING */, stOperator = "includes" /* INCLUDES */, stPointer } = conf, otherConfProps = __rest(conf, ["stTable", "stType", "stOperator", "stPointer"]);
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
        const { stState = directive.state(), stTable, stType, stOperator, stPointer } = props, otherProps = __rest(props, ["stState", "stTable", "stType", "stOperator", "stPointer"]);
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
