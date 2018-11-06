import { onMount, update, onUnMount } from 'flaco';
export const withListChange = (comp) => (conf) => {
    let updateFunc;
    // @ts-ignore
    const { stTable, ...otherConf } = conf;
    const normalizedConf = { stTable };
    const table = normalizedConf.stTable;
    const listener = (items) => {
        updateFunc({ items });
    };
    table.onDisplayChange(listener);
    const WrappingComponent = props => {
        const { items, stTable: whatever, ...otherProps } = props;
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
