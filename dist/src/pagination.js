var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) if (e.indexOf(p[i]) < 0)
            t[p[i]] = s[p[i]];
    return t;
};
import { paginationDirective } from 'smart-table-core';
import { onMount, onUnMount, update } from 'flaco';
export const withPagination = (comp) => (conf) => {
    let updateFunc;
    // @ts-ignore
    const { stTable } = conf, otherConfProps = __rest(conf, ["stTable"]);
    const directive = paginationDirective({ table: stTable });
    const listener = (newSummary) => {
        const { page, size, filteredCount } = newSummary;
        updateFunc({
            stState: Object.assign({ lowerBoundIndex: (page - 1) * size, higherBoundIndex: Math.min(page * size - 1, filteredCount - 1) }, newSummary)
        });
    };
    directive.onSummaryChange(listener);
    const WrappingComponent = props => {
        const { stState = directive.state(), stTable } = props, otherProps = __rest(props, ["stState", "stTable"]);
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
