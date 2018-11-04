var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) if (e.indexOf(p[i]) < 0)
            t[p[i]] = s[p[i]];
    return t;
};
import { onMount, update, onUnMount } from 'flaco';
export const withListChange = (comp) => (conf) => {
    let updateFunc;
    // @ts-ignore
    const { stTable } = conf, otherConf = __rest(conf, ["stTable"]);
    const normalizedConf = { stTable };
    const table = normalizedConf.stTable;
    const listener = (items) => {
        updateFunc({ items });
    };
    table.onDisplayChange(listener);
    const WrappingComponent = props => {
        const { items, stTable: whatever } = props, otherProps = __rest(props, ["items", "stTable"]);
        const stState = items || [];
        const fullProps = Object.assign({}, otherConf, otherProps);
        return comp(fullProps, { state: stState, config: normalizedConf });
    };
    const subsribe = onMount((vnode) => {
        updateFunc = update(WrappingComponent, vnode);
        table.exec();
    });
    const unsubscribe = onUnMount(() => {
        table.off("DISPLAY_CHANGED" /* DISPLAY_CHANGED */, listener);
    });
    return unsubscribe(subsribe(WrappingComponent));
};
