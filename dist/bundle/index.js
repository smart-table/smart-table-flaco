'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var flaco = require('flaco');

var __rest = (undefined && undefined.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) if (e.indexOf(p[i]) < 0)
            t[p[i]] = s[p[i]];
    return t;
};
const withListChange = (comp) => (conf) => {
    let updateFunc;
    // @ts-ignore
    const normalizedConf = Object.assign({}, conf.stConfig || conf);
    const table = normalizedConf.stTable;
    const listener = (items) => {
        updateFunc({ items });
    };
    table.onDisplayChange(listener);
    const WrappingComponent = props => {
        const { stTable } = normalizedConf, left = __rest(normalizedConf, ["stTable"]);
        const { items, stTable: whatever } = props, otherProps = __rest(props, ["items", "stTable"]);
        const stConfig = { stTable };
        const stState = items || [];
        const fullProps = Object.assign({}, left, otherProps);
        return comp(fullProps, { state: stState, config: stConfig });
    };
    const subsribe = flaco.onMount((vnode) => {
        updateFunc = flaco.update(WrappingComponent, vnode);
        table.exec();
    });
    const unsubscribe = flaco.onUnMount(() => {
        table.off("DISPLAY_CHANGED" /* DISPLAY_CHANGED */, listener);
    });
    return unsubscribe(subsribe(WrappingComponent));
};

exports.withListChange = withListChange;
