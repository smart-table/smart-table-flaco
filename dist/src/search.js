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
import { searchDirective } from 'smart-table-core';
export const withSearch = (comp) => (conf) => {
    let updateFunction;
    // @ts-ignore
    const { stTable, stScope } = conf, otherConfProps = __rest(conf, ["stTable", "stScope"]);
    const normalizedConf = {
        stTable,
        stScope
    };
    const { stTable: table, stScope: scope } = normalizedConf;
    const directive = searchDirective({ table, scope });
    const listener = (newState) => updateFunction({ stState: newState });
    directive.onSearchChange(listener);
    const WrappingComponent = props => {
        const { stState = directive.state(), stTable, stScope } = props, otherProps = __rest(props, ["stState", "stTable", "stScope"]);
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
