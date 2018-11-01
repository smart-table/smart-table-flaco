(function () {
    'use strict';

    const compose = (first, ...fns) => (...args) => fns.reduce((previous, current) => current(previous), first(...args));
    const curry = (fn, arityLeft) => {
        const arity = arityLeft || fn.length;
        return (...args) => {
            const argLength = args.length || 1;
            if (arity === argLength) {
                return fn(...args);
            }
            const func = (...moreArgs) => fn(...args, ...moreArgs);
            return curry(func, arity - args.length);
        };
    };
    const tap = (fn) => arg => {
        fn(arg);
        return arg;
    };

    const onNextTick = (fn) => setTimeout(fn, 0);
    const pairify = (holder) => (key) => [key, holder[key]];
    const isShallowEqual = (a, b) => {
        const aKeys = Object.keys(a);
        const bKeys = Object.keys(b);
        return aKeys.length === bKeys.length && aKeys.every(k => a[k] === b[k]);
    };
    // no attributes
    const NA = Object.freeze({});
    const noop = () => {
    };
    const isVTextNode = (vnode) => vnode.nodeType === 'Text';
    const isVNode = (vnode) => typeof vnode !== 'function';

    const createTextVNode = (value) => ({
        nodeType: 'Text',
        children: [],
        props: { value },
        lifeCycle: 0
    });
    const normalize = (children, currentText = '', normalized = []) => {
        if (children.length === 0) {
            if (currentText) {
                normalized.push(createTextVNode(currentText));
            }
            return normalized;
        }
        const child = children.shift();
        const type = typeof child;
        if (type === 'object' || type === 'function') {
            if (currentText) {
                normalized.push(createTextVNode(currentText));
                currentText = '';
            }
            normalized.push(child);
        }
        else {
            currentText += child;
        }
        return normalize(children, currentText, normalized);
    };
    function h(nodeType, props, ...children) {
        const actualProps = props === null ? NA : props;
        const flatChildren = [];
        for (const c of children) {
            if (Array.isArray(c)) {
                flatChildren.push(...c);
            }
            else {
                flatChildren.push(c);
            }
        }
        const normalizedChildren = normalize(flatChildren);
        if (typeof nodeType !== 'function') { // Regular html/text node
            return {
                nodeType,
                props: actualProps,
                children: normalizedChildren,
                lifeCycle: 0
            };
        }
        const fullProps = Object.assign({ children: normalizedChildren }, actualProps);
        const comp = nodeType(fullProps);
        const compType = typeof comp;
        return compType !== 'function' ? comp : h(comp, actualProps, ...normalizedChildren); // Functional comp vs combinator (HOC)
    }

    const SVG_NP = 'http://www.w3.org/2000/svg';
    var EventSubscriptionMethod;
    (function (EventSubscriptionMethod) {
        EventSubscriptionMethod["removeEventListener"] = "removeEventListener";
        EventSubscriptionMethod["addEventListener"] = "addEventListener";
    })(EventSubscriptionMethod || (EventSubscriptionMethod = {}));
    const updateDomNodeFactory = (method) => (items) => tap(domNode => {
        for (const pair of items) {
            domNode[method](...pair);
        }
    });
    const removeEventListeners = updateDomNodeFactory(EventSubscriptionMethod.removeEventListener);
    const addEventListeners = updateDomNodeFactory(EventSubscriptionMethod.addEventListener);
    const setAttributes = (attributePairs) => tap((dom) => {
        const attributes = attributePairs.filter(([key, value]) => typeof value !== 'function');
        for (const [key, value] of attributes) {
            if (value === false) {
                dom.removeAttribute(key);
            }
            else {
                dom.setAttribute(key, value);
            }
        }
    });
    const removeAttributes = (attributes) => tap((dom) => {
        for (const attr of attributes) {
            dom.removeAttribute(attr);
        }
    });
    const setTextNode = (val) => (node) => {
        node.textContent = val;
    };
    const createDomNode = (vnode, parent) => {
        if (vnode.nodeType === 'svg') {
            return document.createElementNS(SVG_NP, vnode.nodeType);
        }
        else if (vnode.nodeType === 'Text') {
            return document.createTextNode(vnode.nodeType);
        }
        return parent.namespaceURI === SVG_NP ?
            document.createElementNS(SVG_NP, vnode.nodeType) :
            document.createElement(vnode.nodeType);
    };
    // @ts-ignore
    const getEventListeners = (props) => Object.keys(props)
        .filter(k => k.substr(0, 2) === 'on')
        .map(k => [k.substr(2).toLowerCase(), props[k]]);

    function* traverse(vnode) {
        yield vnode;
        if (vnode.children.length > 0) {
            for (const child of vnode.children) {
                yield* traverse(child);
            }
        }
    }

    var LifeCycles;
    (function (LifeCycles) {
        LifeCycles["onMount"] = "onMount";
        LifeCycles["onUnMount"] = "onUnMount";
        LifeCycles["onUpdate"] = "onUpdate";
    })(LifeCycles || (LifeCycles = {}));
    const lifeCycleFactory = (method) => curry((fn, comp) => (props, ...args) => {
        const n = comp(props, ...args);
        const applyFn = () => fn(n, ...args);
        const current = n[method];
        n[method] = current ? compose(current, applyFn) : applyFn; // allow multiple hooks;
        return n;
    });
    const onMount = lifeCycleFactory(LifeCycles.onMount);
    const onUnMount = lifeCycleFactory(LifeCycles.onUnMount);
    const onUpdate = lifeCycleFactory(LifeCycles.onUpdate);

    const updateEventListeners = (newNode, oldNode) => {
        const newNodeEvents = getEventListeners(newNode.props);
        const oldNodeEvents = getEventListeners(oldNode.props);
        return newNodeEvents.length || oldNodeEvents.length ?
            compose(removeEventListeners(oldNodeEvents), addEventListeners(newNodeEvents)) : noop;
    };
    const updateAttributes = (newVNode, oldVNode) => {
        const newVNodeProps = newVNode.props;
        const oldVNodeProps = oldVNode.props;
        if (isShallowEqual(newVNodeProps, oldVNodeProps)) {
            return noop;
        }
        if (isVTextNode(newVNode)) {
            return setTextNode(newVNode.props.value);
        }
        const newNodeKeys = Object.keys(newVNodeProps);
        const oldNodeKeys = Object.keys(oldVNodeProps);
        const attributesToRemove = oldNodeKeys.filter(k => !newNodeKeys.includes(k));
        return compose(removeAttributes(attributesToRemove), setAttributes(newNodeKeys.map(pairify(newVNodeProps))));
    };
    const domFactory = createDomNode;
    // Apply vnode diffing to actual dom node (if new node => it will be mounted into the parent)
    const domify = (oldVnode, newVnode, parentDomNode) => {
        if (oldVnode === null && newVnode) { // There is no previous vnode
            newVnode.dom = parentDomNode.appendChild(domFactory(newVnode, parentDomNode));
            newVnode.lifeCycle = 1;
            return { vnode: newVnode, garbage: null };
        }
        // There is a previous vnode
        if (newVnode === null) { // We must remove the related dom node
            parentDomNode.removeChild(oldVnode.dom);
            return ({ garbage: oldVnode, vnode: null });
        }
        else if (newVnode.nodeType !== oldVnode.nodeType) { // It must be replaced (todo check with keys)
            newVnode.dom = domFactory(newVnode, parentDomNode);
            newVnode.lifeCycle = 1;
            parentDomNode.replaceChild(newVnode.dom, oldVnode.dom);
            return { garbage: oldVnode, vnode: newVnode };
        }
        // Only update attributes
        newVnode.dom = oldVnode.dom;
        // Pass the unMountHook
        if (oldVnode.onUnMount) {
            newVnode.onUnMount = oldVnode.onUnMount;
        }
        newVnode.lifeCycle = oldVnode.lifeCycle + 1;
        return { garbage: null, vnode: newVnode };
    };
    const noNode = 'none';
    const falseNode = Object.freeze({
        nodeType: noNode,
        lifeCycle: -1,
        children: [],
        props: {}
    });
    const render = (oldVnode, newVnode, parentDomNode, nextBatchOperations = []) => {
        // 1. transform the new vnode to a vnode connected to an actual dom element based on vnode versions diffing
        // 	i. note at this step occur dom insertions/removals
        // 	ii. it may collect sub tree to be dropped (or "unmounted")
        const { vnode, garbage } = domify(oldVnode, newVnode, parentDomNode);
        if (garbage !== null) {
            // Defer unmount lifecycle as it is not "visual"
            for (const g of traverse(garbage)) {
                if (typeof g[LifeCycles.onUnMount] === 'function') {
                    nextBatchOperations.push(g.onUnMount);
                }
            }
        }
        // Normalisation of old node (in case of a replace we will consider old node as empty node (no children, no props))
        const tempOldNode = garbage !== null || !oldVnode ? falseNode : oldVnode;
        if (vnode !== null) {
            // 2. update dom attributes based on vnode prop diffing.
            // Sync
            if (typeof vnode[LifeCycles.onUpdate] === 'function' && vnode.lifeCycle > 1) {
                vnode.onUpdate();
            }
            updateAttributes(vnode, tempOldNode)(vnode.dom);
            // Fast path
            if (vnode.nodeType === 'Text') {
                return nextBatchOperations;
            }
            if (typeof vnode.onMount === 'function' && vnode.lifeCycle === 1) {
                nextBatchOperations.push(() => vnode.onMount());
            }
            const childrenCount = Math.max(tempOldNode.children.length, vnode.children.length);
            // Async will be deferred as it is not "visual"
            const setListeners = updateEventListeners(vnode, tempOldNode);
            if (setListeners !== noop) {
                nextBatchOperations.push(() => setListeners(vnode.dom));
            }
            // 3. recursively traverse children to update dom and collect functions to process on next tick
            if (childrenCount > 0) {
                for (let i = 0; i < childrenCount; i++) {
                    // We pass nextBatchOperations as reference (improve perf: memory + speed)
                    render(tempOldNode.children[i] || null, vnode.children[i] || null, vnode.dom, nextBatchOperations);
                }
            }
        }
        return nextBatchOperations;
    };
    // todo
    const hydrate = (vnode, dom) => {
        const hydrated = Object.assign({}, vnode);
        const domChildren = Array.from(dom.childNodes).filter((n) => n.nodeType !== 3 || n.nodeValue.trim() !== '');
        hydrated.dom = dom;
        hydrated.children = vnode.children.map((child, i) => hydrate(child, domChildren[i]));
        return hydrated;
    };
    const mount = curry((comp, initProp, root) => {
        const vnode = isVNode(comp) ? comp : comp(initProp || {});
        const oldVNode = root.children.length ? hydrate(vnode, root.children[0]) : null;
        const batch = render(oldVNode, vnode, root);
        onNextTick(() => {
            for (const op of batch) {
                op();
            }
        });
        return vnode;
    });

    const update = (comp, initialVNode) => {
        let oldNode = initialVNode;
        return (props, ...args) => {
            const mountNode = oldNode.dom.parentNode;
            const newNode = comp(Object.assign({}, oldNode.props, props), ...args);
            const nextBatch = render(oldNode, newNode, mountNode);
            // Danger zone !!!!
            // Change by keeping the same reference so the eventual parent node does not need to be "aware" tree may have changed downstream:
            // oldNode may be the child of someone ...(well that is a tree data structure after all :P )
            oldNode = Object.assign(oldNode || {}, newNode);
            // End danger zone
            onNextTick(() => {
                for (const op of nextBatch) {
                    op();
                }
            });
            return newNode;
        };
    };
    // Interactive elements
    // todo

    const filterOutFunction = (props) => Object
        .entries(props || {})
        .filter(([key, value]) => typeof value !== 'function');
    const escapeHTML = s => String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    const renderAsString = curry((comp, initProp) => {
        const vnode = isVNode(comp) ? comp : comp(initProp || {});
        const { nodeType, children, props } = vnode;
        const attributes = escapeHTML(filterOutFunction(props)
            .map(([key, value]) => typeof value === 'boolean' ? (value === true ? key : '') : `${key}="${value}"`)
            .join(' '));
        const childrenHtml = children !== void 0 && children.length > 0 ? children.map(ch => renderAsString(ch)()).join('') : '';
        return isVTextNode(vnode) ? escapeHTML(String(vnode.props.value)) : `<${nodeType}${attributes ? ` ${attributes}` : ''}>${childrenHtml}</${nodeType}>`;
    });

    const heroes = [
        { id: 11, name: 'Mr. Nice' },
        { id: 12, name: 'Narco' },
        { id: 13, name: 'Bombasto' },
        { id: 14, name: 'Celeritas' },
        { id: 15, name: 'Magneta' },
        { id: 16, name: 'RubberMan' },
        { id: 17, name: 'Dynama' },
        { id: 18, name: 'Dr IQ' },
        { id: 19, name: 'Magma' },
        { id: 20, name: 'Tornado' }
    ];

    const swap$1 = (f) => (a, b) => f(b, a);
    const compose$1 = (first, ...fns) => (...args) => fns.reduce((previous, current) => current(previous), first(...args));
    const curry$1 = (fn, arityLeft) => {
        const arity = arityLeft || fn.length;
        return (...args) => {
            const argLength = args.length || 1;
            if (arity === argLength) {
                return fn(...args);
            }
            const func = (...moreArgs) => fn(...args, ...moreArgs);
            return curry$1(func, arity - args.length);
        };
    };
    const tap$1 = (fn) => arg => {
        fn(arg);
        return arg;
    };

    const pointer = (path) => {
        const parts = path.split('.');
        const partial = (obj = {}, parts = []) => {
            const p = parts.shift();
            const current = obj[p];
            return (current === undefined || current === null || parts.length === 0) ?
                current : partial(current, parts);
        };
        const set = (target, newTree) => {
            let current = target;
            const [leaf, ...intermediate] = parts.reverse();
            for (const key of intermediate.reverse()) {
                if (current[key] === undefined) {
                    current[key] = {};
                    current = current[key];
                }
            }
            current[leaf] = Object.assign(current[leaf] || {}, newTree);
            return target;
        };
        return {
            get(target) {
                return partial(target, [...parts]);
            },
            set
        };
    };

    const emitter = () => {
        const listenersLists = {};
        const instance = {
            on(event, ...listeners) {
                listenersLists[event] = (listenersLists[event] || []).concat(listeners);
                return instance;
            },
            dispatch(event, ...args) {
                const listeners = listenersLists[event] || [];
                for (const listener of listeners) {
                    listener(...args);
                }
                return instance;
            },
            off(event, ...listeners) {
                if (event === undefined) {
                    Object.keys(listenersLists).forEach(ev => instance.off(ev));
                }
                else {
                    const list = listenersLists[event] || [];
                    listenersLists[event] = listeners.length ? list.filter(listener => !listeners.includes(listener)) : [];
                }
                return instance;
            }
        };
        return instance;
    };

    var Type;
    (function (Type) {
        Type["BOOLEAN"] = "boolean";
        Type["NUMBER"] = "number";
        Type["DATE"] = "date";
        Type["STRING"] = "string";
    })(Type || (Type = {}));
    const typeExpression = (type) => {
        switch (type) {
            case Type.BOOLEAN:
                return Boolean;
            case Type.NUMBER:
                return Number;
            case Type.DATE:
                return val => new Date(val);
            case Type.STRING:
                return compose$1(String, val => val.toLowerCase());
            default:
                return val => val;
        }
    };
    var FilterOperator;
    (function (FilterOperator) {
        FilterOperator["INCLUDES"] = "includes";
        FilterOperator["IS"] = "is";
        FilterOperator["IS_NOT"] = "isNot";
        FilterOperator["LOWER_THAN"] = "lt";
        FilterOperator["GREATER_THAN"] = "gt";
        FilterOperator["GREATER_THAN_OR_EQUAL"] = "gte";
        FilterOperator["LOWER_THAN_OR_EQUAL"] = "lte";
        FilterOperator["EQUALS"] = "equals";
        FilterOperator["NOT_EQUALS"] = "notEquals";
        FilterOperator["ANY_OF"] = "anyOf";
    })(FilterOperator || (FilterOperator = {}));
    const not = fn => input => !fn(input);
    const is = value => input => Object.is(value, input);
    const lt = value => input => input < value;
    const gt = value => input => input > value;
    const equals = value => input => value === input;
    const includes = value => input => input.includes(value);
    const anyOf = value => input => value.includes(input);
    const operators = {
        ["includes" /* INCLUDES */]: includes,
        ["is" /* IS */]: is,
        ["isNot" /* IS_NOT */]: compose$1(is, not),
        ["lt" /* LOWER_THAN */]: lt,
        ["gte" /* GREATER_THAN_OR_EQUAL */]: compose$1(lt, not),
        ["gt" /* GREATER_THAN */]: gt,
        ["lte" /* LOWER_THAN_OR_EQUAL */]: compose$1(gt, not),
        ["equals" /* EQUALS */]: equals,
        ["notEquals" /* NOT_EQUALS */]: compose$1(equals, not),
        ["anyOf" /* ANY_OF */]: anyOf
    };
    const every = fns => (...args) => fns.every(fn => fn(...args));
    const predicate = ({ value = '', operator = "includes" /* INCLUDES */, type }) => {
        const typeIt = typeExpression(type);
        const operateOnTyped = compose$1(typeIt, operators[operator]);
        const predicateFunc = operateOnTyped(value);
        return compose$1(typeIt, predicateFunc);
    };
    // Avoid useless filter lookup (improve perf)
    const normalizeClauses = (conf) => {
        const output = {};
        const validPath = Object.keys(conf).filter(path => Array.isArray(conf[path]));
        validPath.forEach(path => {
            const validClauses = conf[path].filter(c => c.value !== '');
            if (validClauses.length > 0) {
                output[path] = validClauses;
            }
        });
        return output;
    };
    const filter = (filter) => {
        const normalizedClauses = normalizeClauses(filter);
        const funcList = Object.keys(normalizedClauses).map(path => {
            const getter = pointer(path).get;
            const clauses = normalizedClauses[path].map(predicate);
            return compose$1(getter, every(clauses));
        });
        const filterPredicate = every(funcList);
        return array => array.filter(filterPredicate);
    };

    const defaultComparator = (a, b) => {
        if (a === b) {
            return 0;
        }
        if (a === undefined) {
            return 1;
        }
        if (b === undefined) {
            return -1;
        }
        return a < b ? -1 : 1;
    };
    var SortDirection;
    (function (SortDirection) {
        SortDirection["ASC"] = "asc";
        SortDirection["DESC"] = "desc";
        SortDirection["NONE"] = "none";
    })(SortDirection || (SortDirection = {}));
    const sortByProperty = (prop, comparator) => {
        const propGetter = pointer(prop).get;
        return (a, b) => comparator(propGetter(a), propGetter(b));
    };
    const defaultSortFactory = (conf) => {
        const { pointer: pointer$$1, direction = "asc" /* ASC */, comparator = defaultComparator } = conf;
        if (!pointer$$1 || direction === "none" /* NONE */) {
            return (array) => [...array];
        }
        const orderFunc = sortByProperty(pointer$$1, comparator);
        const compareFunc = direction === "desc" /* DESC */ ? swap$1(orderFunc) : orderFunc;
        return (array) => [...array].sort(compareFunc);
    };

    function re(strs, ...substs) {
        let reStr = transformRaw(strs.raw[0]);
        for (const [i, subst] of substs.entries()) {
            if (subst instanceof RegExp) {
                reStr += subst.source;
            } else if (typeof subst === 'string') {
                reStr += quoteText(subst);
            } else {
                throw new Error('Illegal substitution: '+subst);
            }
            reStr += transformRaw(strs.raw[i+1]);
        }
        let flags = '';
        if (reStr.startsWith('/')) {
            const lastSlashIndex = reStr.lastIndexOf('/');
            if (lastSlashIndex === 0) {
                throw new Error('If the `re` string starts with a slash, it must end with a second slash and zero or more flags: '+reStr);
            }
            flags = reStr.slice(lastSlashIndex+1);
            reStr = reStr.slice(1, lastSlashIndex);
        }
        return new RegExp(reStr, flags);
    }

    function transformRaw(str) {
        return str.replace(/\\`/g, '`');
    }

    /**
     * All special characters are escaped, because you may want to quote several characters inside parentheses or square brackets.
     */
    function quoteText(text) {
        return text.replace(/[\\^$.*+?()[\]{}|=!<>:-]/g, '\\$&');
    }

    const regexp = (input) => {
        const { value, scope = [], escape = false, flags = '' } = input;
        const searchPointers = scope.map(field => pointer(field).get);
        if (scope.length === 0 || !value) {
            return (array) => array;
        }
        const regex = escape === true ? re `/${value}/${flags}` : new RegExp(value, flags);
        return (array) => array.filter(item => searchPointers.some(p => regex.test(String(p(item)))));
    };

    const sliceFactory = ({ page = 1, size } = { page: 1 }) => (array = []) => {
        const actualSize = size || array.length;
        const offset = (page - 1) * actualSize;
        return array.slice(offset, offset + actualSize);
    };

    var SmartTableEvents;
    (function (SmartTableEvents) {
        SmartTableEvents["TOGGLE_SORT"] = "TOGGLE_SORT";
        SmartTableEvents["DISPLAY_CHANGED"] = "DISPLAY_CHANGED";
        SmartTableEvents["PAGE_CHANGED"] = "CHANGE_PAGE";
        SmartTableEvents["EXEC_CHANGED"] = "EXEC_CHANGED";
        SmartTableEvents["FILTER_CHANGED"] = "FILTER_CHANGED";
        SmartTableEvents["SUMMARY_CHANGED"] = "SUMMARY_CHANGED";
        SmartTableEvents["SEARCH_CHANGED"] = "SEARCH_CHANGED";
        SmartTableEvents["EXEC_ERROR"] = "EXEC_ERROR";
    })(SmartTableEvents || (SmartTableEvents = {}));
    const curriedPointer = (path) => {
        const { get, set } = pointer(path);
        return { get, set: curry$1(set) };
    };
    const tableDirective = ({ sortFactory, tableState, data, filterFactory, searchFactory }) => {
        let filteredCount = data.length;
        let matchingItems = data;
        const table = emitter();
        const sortPointer = curriedPointer('sort');
        const slicePointer = curriedPointer('slice');
        const filterPointer = curriedPointer('filter');
        const searchPointer = curriedPointer('search');
        // We need to register in case the summary comes from outside (like server data)
        table.on("SUMMARY_CHANGED" /* SUMMARY_CHANGED */, ({ filteredCount: count }) => {
            filteredCount = count;
        });
        const safeAssign = curry$1((base, extension) => Object.assign({}, base, extension));
        const dispatch = curry$1(table.dispatch, 2);
        const dispatchSummary = (filtered) => {
            matchingItems = filtered;
            return dispatch("SUMMARY_CHANGED" /* SUMMARY_CHANGED */, {
                page: tableState.slice.page,
                size: tableState.slice.size,
                filteredCount: filtered.length
            });
        };
        const exec = ({ processingDelay = 20 } = { processingDelay: 20 }) => {
            table.dispatch("EXEC_CHANGED" /* EXEC_CHANGED */, { working: true });
            setTimeout(() => {
                try {
                    const filterFunc = filterFactory(filterPointer.get(tableState));
                    const searchFunc = searchFactory(searchPointer.get(tableState));
                    const sortFunc = sortFactory(sortPointer.get(tableState));
                    const sliceFunc = sliceFactory(slicePointer.get(tableState));
                    const execFunc = compose$1(filterFunc, searchFunc, tap$1(dispatchSummary), sortFunc, sliceFunc);
                    const displayed = execFunc(data);
                    table.dispatch("DISPLAY_CHANGED" /* DISPLAY_CHANGED */, displayed.map(d => ({
                        index: data.indexOf(d),
                        value: d
                    })));
                }
                catch (err) {
                    table.dispatch("EXEC_ERROR" /* EXEC_ERROR */, err);
                }
                finally {
                    table.dispatch("EXEC_CHANGED" /* EXEC_CHANGED */, { working: false });
                }
            }, processingDelay);
        };
        const updateTableState = curry$1((pter, ev, newPartialState) => compose$1(safeAssign(pter.get(tableState)), tap$1(dispatch(ev)), pter.set(tableState))(newPartialState));
        const resetToFirstPage = () => updateTableState(slicePointer, "CHANGE_PAGE" /* PAGE_CHANGED */, { page: 1 });
        const tableOperation = (pter, ev) => compose$1(updateTableState(pter, ev), resetToFirstPage, () => table.exec() // We wrap within a function so table.exec can be overwritten (when using with a server for example)
        );
        const api = {
            sort: tableOperation(sortPointer, "TOGGLE_SORT" /* TOGGLE_SORT */),
            filter: tableOperation(filterPointer, "FILTER_CHANGED" /* FILTER_CHANGED */),
            search: tableOperation(searchPointer, "SEARCH_CHANGED" /* SEARCH_CHANGED */),
            slice: compose$1(updateTableState(slicePointer, "CHANGE_PAGE" /* PAGE_CHANGED */), () => table.exec()),
            exec,
            async eval(state = tableState) {
                const sortFunc = sortFactory(sortPointer.get(state));
                const searchFunc = searchFactory(searchPointer.get(state));
                const filterFunc = filterFactory(filterPointer.get(state));
                const sliceFunc = sliceFactory(slicePointer.get(state));
                const execFunc = compose$1(filterFunc, searchFunc, sortFunc, sliceFunc);
                return execFunc(data).map(d => ({ index: data.indexOf(d), value: d }));
            },
            onDisplayChange(fn) {
                table.on("DISPLAY_CHANGED" /* DISPLAY_CHANGED */, fn);
            },
            getTableState() {
                const sort = Object.assign({}, tableState.sort);
                const search = Object.assign({}, tableState.search);
                const slice = Object.assign({}, tableState.slice);
                const filter$$1 = {};
                for (const prop of Object.getOwnPropertyNames(tableState.filter)) {
                    filter$$1[prop] = tableState.filter[prop].map(v => Object.assign({}, v));
                }
                return { sort, search, slice, filter: filter$$1 };
            },
            getMatchingItems() {
                return [...matchingItems];
            }
        };
        const instance = Object.assign(table, api);
        Object.defineProperties(instance, {
            filteredCount: {
                get() {
                    return filteredCount;
                }
            },
            length: {
                get() {
                    return data.length;
                }
            }
        });
        return instance;
    };
    // todo expose and re-export from smart-table-filter
    var FilterType;
    (function (FilterType) {
        FilterType["BOOLEAN"] = "boolean";
        FilterType["NUMBER"] = "number";
        FilterType["DATE"] = "date";
        FilterType["STRING"] = "string";
    })(FilterType || (FilterType = {}));

    const defaultTableState = () => ({ sort: {}, slice: { page: 1 }, filter: {}, search: {} });
    const smartTable = ({ sortFactory = defaultSortFactory, filterFactory = filter, searchFactory = regexp, tableState = defaultTableState(), data = [] } = {
        sortFactory: defaultSortFactory,
        filterFactory: filter,
        searchFactory: regexp,
        tableState: defaultTableState(),
        data: []
    }, ...tableExtensions) => {
        const coreTable = tableDirective({ sortFactory, filterFactory, tableState, data, searchFactory });
        return tableExtensions.reduce((accumulator, newdir) => Object.assign(accumulator, newdir({
            sortFactory,
            filterFactory,
            searchFactory,
            tableState,
            data,
            table: coreTable
        })), coreTable);
    };

    var __rest = (undefined && undefined.__rest) || function (s$$1, e) {
        var t = {};
        for (var p$$1 in s$$1) if (Object.prototype.hasOwnProperty.call(s$$1, p$$1) && e.indexOf(p$$1) < 0)
            t[p$$1] = s$$1[p$$1];
        if (s$$1 != null && typeof Object.getOwnPropertySymbols === "function")
            for (var i$$1 = 0, p$$1 = Object.getOwnPropertySymbols(s$$1); i$$1 < p$$1.length; i$$1++) if (e.indexOf(p$$1[i$$1]) < 0)
                t[p$$1[i$$1]] = s$$1[p$$1[i$$1]];
        return t;
    };
    const withListChange = (comp) => (conf) => {
        let updateFunc;
        // @ts-ignore
        const normalizedConf = Object.assign({}, conf.stConfig || conf);
        const table$$1 = normalizedConf.stTable;
        const listener = (items) => {
            updateFunc({ items });
        };
        table$$1.onDisplayChange(listener);
        const WrappingComponent = props => {
            const { stTable } = normalizedConf, left = __rest(normalizedConf, ["stTable"]);
            const { items, stTable: whatever } = props, otherProps = __rest(props, ["items", "stTable"]);
            const stConfig = { stTable };
            const stState = items || [];
            const fullProps = Object.assign({}, left, otherProps);
            return comp(fullProps, { state: stState, config: stConfig });
        };
        const subsribe = onMount((vnode) => {
            updateFunc = update(WrappingComponent, vnode);
            table$$1.exec();
        });
        const unsubscribe = onUnMount(() => {
            table$$1.off("DISPLAY_CHANGED" /* DISPLAY_CHANGED */, listener);
        });
        return unsubscribe(subsribe(WrappingComponent));
    };

    const table$1 = smartTable({ data: heroes });
    const Hero = (heroItem) => h("tr", null,
        h("td", null, heroItem.value.id),
        h("td", null, heroItem.value.name));
    const HeroList = withListChange((props, stProps) => {
        const { state, config } = stProps;
        console.log(props);
        console.log(stProps);
        return h("tbody", { id: props.id }, state.map(Hero));
    });
    const App = ({ table: table$$1 }) => h("table", null,
        h("thead", null,
            h("tr", null,
                h("th", null, "ID"),
                h("th", null, "Name"))),
        h(HeroList, { id: "Hello", stTable: table$$1 }, "bim"));
    const container = document.getElementById('app-container');
    mount(h(App, { table: table$1 }), {}, container);

}());
//# sourceMappingURL=app.js.map
