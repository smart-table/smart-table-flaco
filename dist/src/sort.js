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
import { sortDirective } from 'smart-table-core';
export const withSort = (comp) => (conf) => {
    let updateFunction;
    // @ts-ignore
    const { stTable, stPointer, stCycle = false } = conf, otherConfProps = __rest(conf, ["stTable", "stPointer", "stCycle"]);
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
        const { stState = directive.state(), stTable, stCycle, stPointer } = props, otherProps = __rest(props, ["stState", "stTable", "stCycle", "stPointer"]);
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
