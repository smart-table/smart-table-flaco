(function () {
    'use strict';

    const swap = (f) => (a, b) => f(b, a);
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

    var Job;
    (function (Job) {
        Job["DEV"] = "dev";
        Job["QA"] = "qa";
        Job["MANAGER"] = "manager";
    })(Job || (Job = {}));
    const firstNames = ['Laurent', 'Charlie', 'Elsa', 'Bob', 'Blandine', 'Raymond', 'Jade', 'Athanase', 'Antoine', 'Benjamin', 'Solenne', 'Alice', 'Boris', 'Cedric', 'Camille', 'Isabelle', 'Olivier', 'Nicolas', 'Amaury', 'Odile'];
    const lastNames = ['Renard', 'Dupraz', 'Dupont', 'Leponge', 'Robin', 'Blasec', 'Verton', 'Albert', 'Vian', 'Bertin', 'Chevalier', 'Romus', 'Cassare', 'Jourdin', 'Lazarus', 'Blanc', 'Vacon', 'Boulus', 'Giroux', 'Marcelin'];
    const jobs = [Job.DEV, Job.QA, Job.MANAGER];
    const items = [];
    for (let i = 0; i < 100000; i++) {
        items.push({
            name: {
                first: firstNames[Math.floor(Math.random() * 20)],
                last: lastNames[Math.floor(Math.random() * 20)]
            },
            birthDate: new Date(Math.floor(Math.random() * 1000 * 3600 * 24 * 365 * 50)),
            balance: Math.floor(Math.random() * 5000),
            job: jobs[Math.floor(Math.random() * 3)]
        });
    }
    const users = items;

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
    const proxyListener = (eventMap) => ({ emitter }) => {
        const eventListeners = {};
        const proxy = {
            off(ev) {
                if (!ev) {
                    Object.keys(eventListeners).forEach(eventName => proxy.off(eventName));
                }
                if (eventListeners[ev]) {
                    emitter.off(ev, ...eventListeners[ev]);
                }
                return proxy;
            }
        };
        for (const ev of Object.keys(eventMap)) {
            const method = eventMap[ev];
            eventListeners[ev] = [];
            proxy[method] = function (...listeners) {
                eventListeners[ev] = eventListeners[ev].concat(listeners);
                emitter.on(ev, ...listeners);
                return proxy;
            };
        }
        return proxy;
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
                return compose(String, val => val.toLowerCase());
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
        ["isNot" /* IS_NOT */]: compose(is, not),
        ["lt" /* LOWER_THAN */]: lt,
        ["gte" /* GREATER_THAN_OR_EQUAL */]: compose(lt, not),
        ["gt" /* GREATER_THAN */]: gt,
        ["lte" /* LOWER_THAN_OR_EQUAL */]: compose(gt, not),
        ["equals" /* EQUALS */]: equals,
        ["notEquals" /* NOT_EQUALS */]: compose(equals, not),
        ["anyOf" /* ANY_OF */]: anyOf
    };
    const every = fns => (...args) => fns.every(fn => fn(...args));
    const predicate = ({ value = '', operator = "includes" /* INCLUDES */, type }) => {
        const typeIt = typeExpression(type);
        const operateOnTyped = compose(typeIt, operators[operator]);
        const predicateFunc = operateOnTyped(value);
        return compose(typeIt, predicateFunc);
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
            return compose(getter, every(clauses));
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
        const compareFunc = direction === "desc" /* DESC */ ? swap(orderFunc) : orderFunc;
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
        return { get, set: curry(set) };
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
        const safeAssign = curry((base, extension) => Object.assign({}, base, extension));
        const dispatch = curry(table.dispatch, 2);
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
                    const execFunc = compose(filterFunc, searchFunc, tap(dispatchSummary), sortFunc, sliceFunc);
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
        const updateTableState = curry((pter, ev, newPartialState) => compose(safeAssign(pter.get(tableState)), tap(dispatch(ev)), pter.set(tableState))(newPartialState));
        const resetToFirstPage = () => updateTableState(slicePointer, "CHANGE_PAGE" /* PAGE_CHANGED */, { page: 1 });
        const tableOperation = (pter, ev) => compose(updateTableState(pter, ev), resetToFirstPage, () => table.exec() // We wrap within a function so table.exec can be overwritten (when using with a server for example)
        );
        const api = {
            sort: tableOperation(sortPointer, "TOGGLE_SORT" /* TOGGLE_SORT */),
            filter: tableOperation(filterPointer, "FILTER_CHANGED" /* FILTER_CHANGED */),
            search: tableOperation(searchPointer, "SEARCH_CHANGED" /* SEARCH_CHANGED */),
            slice: compose(updateTableState(slicePointer, "CHANGE_PAGE" /* PAGE_CHANGED */), () => table.exec()),
            exec,
            async eval(state = tableState) {
                const sortFunc = sortFactory(sortPointer.get(state));
                const searchFunc = searchFactory(searchPointer.get(state));
                const filterFunc = filterFactory(filterPointer.get(state));
                const sliceFunc = sliceFactory(slicePointer.get(state));
                const execFunc = compose(filterFunc, searchFunc, sortFunc, sliceFunc);
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

    const filterListener = proxyListener({ ["FILTER_CHANGED" /* FILTER_CHANGED */]: 'onFilterChange' });
    // todo expose and re-export from smart-table-filter
    var FilterType;
    (function (FilterType) {
        FilterType["BOOLEAN"] = "boolean";
        FilterType["NUMBER"] = "number";
        FilterType["DATE"] = "date";
        FilterType["STRING"] = "string";
    })(FilterType || (FilterType = {}));
    const filterDirective = ({ table, pointer: pointer$$1, operator = "includes" /* INCLUDES */, type = "string" /* STRING */ }) => {
        const proxy = filterListener({ emitter: table });
        return Object.assign({
            filter(input) {
                const filterConf = {
                    [pointer$$1]: [
                        {
                            value: input,
                            operator,
                            type
                        }
                    ]
                };
                return table.filter(filterConf);
            },
            state() {
                return table.getTableState().filter;
            }
        }, proxy);
    };

    const searchListener = proxyListener({ ["SEARCH_CHANGED" /* SEARCH_CHANGED */]: 'onSearchChange' });
    const searchDirective = ({ table, scope = [] }) => {
        const proxy = searchListener({ emitter: table });
        return Object.assign(proxy, {
            search(input, opts = {}) {
                return table.search(Object.assign({}, { value: input, scope }, opts));
            },
            state() {
                return table.getTableState().search;
            }
        }, proxy);
    };

    const sliceListener = proxyListener({
        ["CHANGE_PAGE" /* PAGE_CHANGED */]: 'onPageChange',
        ["SUMMARY_CHANGED" /* SUMMARY_CHANGED */]: 'onSummaryChange'
    });
    const paginationDirective = ({ table }) => {
        let { slice: { page: currentPage, size: currentSize } } = table.getTableState();
        let itemListLength = table.filteredCount;
        const proxy = sliceListener({ emitter: table });
        const api = {
            selectPage(p) {
                return table.slice({ page: p, size: currentSize });
            },
            selectNextPage() {
                return api.selectPage(currentPage + 1);
            },
            selectPreviousPage() {
                return api.selectPage(currentPage - 1);
            },
            changePageSize(size) {
                return table.slice({ page: 1, size });
            },
            isPreviousPageEnabled() {
                return currentPage > 1;
            },
            isNextPageEnabled() {
                return Math.ceil(itemListLength / currentSize) > currentPage;
            },
            state() {
                return Object.assign(table.getTableState().slice, { filteredCount: itemListLength });
            }
        };
        const directive = Object.assign(api, proxy);
        directive.onSummaryChange(({ page: p, size: s, filteredCount }) => {
            currentPage = p;
            currentSize = s;
            itemListLength = filteredCount;
        });
        return directive;
    };

    const debounce = (fn, time) => {
        let timer = null;
        return (...args) => {
            if (timer !== null) {
                clearTimeout(timer);
            }
            timer = setTimeout(() => fn(...args), time);
        };
    };
    const sortListeners = proxyListener({ ["TOGGLE_SORT" /* TOGGLE_SORT */]: 'onSortToggle' });
    const directions = ["asc" /* ASC */, "desc" /* DESC */];
    const sortDirective = ({ pointer: pointer$$1, table, cycle = false, debounceTime = 0 }) => {
        const cycleDirections = cycle === true ? ["none" /* NONE */].concat(directions) : [...directions].reverse();
        const commit = debounce(table.sort, debounceTime);
        let hit = 0;
        const proxy = sortListeners({ emitter: table });
        const directive = Object.assign({
            toggle() {
                hit++;
                const direction = cycleDirections[hit % cycleDirections.length];
                return commit({ pointer: pointer$$1, direction });
            },
            state() {
                return table.getTableState().sort;
            }
        }, proxy);
        directive.onSortToggle(({ pointer: p }) => {
            hit = pointer$$1 !== p ? 0 : hit;
        });
        const { pointer: statePointer, direction = "asc" /* ASC */ } = directive.state();
        hit = statePointer === pointer$$1 ? (direction === "asc" /* ASC */ ? 1 : 2) : 0;
        return directive;
    };

    const executionListener = proxyListener({ ["EXEC_CHANGED" /* EXEC_CHANGED */]: 'onExecutionChange' });
    const workingIndicatorDirective = ({ table }) => executionListener({ emitter: table });

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
        const { stTable } = conf, otherConf = __rest(conf, ["stTable"]);
        const normalizedConf = { stTable };
        const table$$1 = normalizedConf.stTable;
        const listener = (items) => {
            updateFunc({ items });
        };
        table$$1.onDisplayChange(listener);
        const WrappingComponent = props => {
            const { items, stTable: whatever } = props, otherProps = __rest(props, ["items", "stTable"]);
            const stState = items || [];
            const fullProps = Object.assign({}, otherConf, otherProps);
            return comp(fullProps, { state: stState, config: normalizedConf });
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

    var __rest$1 = (undefined && undefined.__rest) || function (s$$1, e) {
        var t = {};
        for (var p$$1 in s$$1) if (Object.prototype.hasOwnProperty.call(s$$1, p$$1) && e.indexOf(p$$1) < 0)
            t[p$$1] = s$$1[p$$1];
        if (s$$1 != null && typeof Object.getOwnPropertySymbols === "function")
            for (var i$$1 = 0, p$$1 = Object.getOwnPropertySymbols(s$$1); i$$1 < p$$1.length; i$$1++) if (e.indexOf(p$$1[i$$1]) < 0)
                t[p$$1[i$$1]] = s$$1[p$$1[i$$1]];
        return t;
    };
    const withSearch = (comp) => (conf) => {
        let updateFunction;
        // @ts-ignore
        const { stTable, stScope } = conf, otherConfProps = __rest$1(conf, ["stTable", "stScope"]);
        const normalizedConf = {
            stTable,
            stScope
        };
        const { stTable: table$$1, stScope: scope } = normalizedConf;
        const directive = searchDirective({ table: table$$1, scope });
        const listener = (newState) => updateFunction({ stState: newState });
        directive.onSearchChange(listener);
        const WrappingComponent = props => {
            const { stState = directive.state(), stTable, stScope } = props, otherProps = __rest$1(props, ["stState", "stTable", "stScope"]);
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

    var __rest$2 = (undefined && undefined.__rest) || function (s$$1, e) {
        var t = {};
        for (var p$$1 in s$$1) if (Object.prototype.hasOwnProperty.call(s$$1, p$$1) && e.indexOf(p$$1) < 0)
            t[p$$1] = s$$1[p$$1];
        if (s$$1 != null && typeof Object.getOwnPropertySymbols === "function")
            for (var i$$1 = 0, p$$1 = Object.getOwnPropertySymbols(s$$1); i$$1 < p$$1.length; i$$1++) if (e.indexOf(p$$1[i$$1]) < 0)
                t[p$$1[i$$1]] = s$$1[p$$1[i$$1]];
        return t;
    };
    const withSort = (comp) => (conf) => {
        let updateFunction;
        // @ts-ignore
        const { stTable, stPointer, stCycle = false } = conf, otherConfProps = __rest$2(conf, ["stTable", "stPointer", "stCycle"]);
        const normalizedConf = {
            stPointer,
            stCycle,
            stTable
        };
        const { stPointer: pointer, stTable: table$$1, stCycle: cycle } = normalizedConf; //convenient aliases
        const directive = sortDirective({ table: table$$1, pointer, cycle });
        const listener = (newState) => updateFunction({ stState: newState });
        directive.onSortToggle(listener);
        const WrappingComponent = props => {
            const { stState = directive.state(), stTable, stCycle, stPointer } = props, otherProps = __rest$2(props, ["stState", "stTable", "stCycle", "stPointer"]);
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

    var __rest$3 = (undefined && undefined.__rest) || function (s$$1, e) {
        var t = {};
        for (var p$$1 in s$$1) if (Object.prototype.hasOwnProperty.call(s$$1, p$$1) && e.indexOf(p$$1) < 0)
            t[p$$1] = s$$1[p$$1];
        if (s$$1 != null && typeof Object.getOwnPropertySymbols === "function")
            for (var i$$1 = 0, p$$1 = Object.getOwnPropertySymbols(s$$1); i$$1 < p$$1.length; i$$1++) if (e.indexOf(p$$1[i$$1]) < 0)
                t[p$$1[i$$1]] = s$$1[p$$1[i$$1]];
        return t;
    };
    const withFilter = (comp) => (conf) => {
        let updateFunction;
        // @ts-ignore
        const { stTable, stType = "string" /* STRING */, stOperator = "includes" /* INCLUDES */, stPointer } = conf, otherConfProps = __rest$3(conf, ["stTable", "stType", "stOperator", "stPointer"]);
        const normalizedConf = {
            stTable, stType, stOperator, stPointer
        };
        const { stTable: table$$1, stOperator: operator, stType: type, stPointer: pointer } = normalizedConf;
        const directive = filterDirective({
            table: table$$1, operator, pointer, type
        });
        const listener = newState => updateFunction({ stState: newState });
        directive.onFilterChange(listener);
        const WrappingComponent = props => {
            const { stState = directive.state(), stTable, stType, stOperator, stPointer } = props, otherProps = __rest$3(props, ["stState", "stTable", "stType", "stOperator", "stPointer"]);
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

    var __rest$4 = (undefined && undefined.__rest) || function (s$$1, e) {
        var t = {};
        for (var p$$1 in s$$1) if (Object.prototype.hasOwnProperty.call(s$$1, p$$1) && e.indexOf(p$$1) < 0)
            t[p$$1] = s$$1[p$$1];
        if (s$$1 != null && typeof Object.getOwnPropertySymbols === "function")
            for (var i$$1 = 0, p$$1 = Object.getOwnPropertySymbols(s$$1); i$$1 < p$$1.length; i$$1++) if (e.indexOf(p$$1[i$$1]) < 0)
                t[p$$1[i$$1]] = s$$1[p$$1[i$$1]];
        return t;
    };
    const withIndicator = (comp) => (conf) => {
        let updateFunction;
        // @ts-ignore
        const { stTable } = conf, otherConfProps = __rest$4(conf, ["stTable"]);
        const normalizedConf = {
            stTable
        };
        const { stTable: table$$1 } = normalizedConf;
        const directive = workingIndicatorDirective({ table: table$$1 });
        const listener = (newState) => updateFunction({ stState: newState });
        directive.onExecutionChange(listener);
        const WrappingComponent = props => {
            const { stState = { working: false }, stTable } = props, otherProps = __rest$4(props, ["stState", "stTable"]);
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

    var __rest$5 = (undefined && undefined.__rest) || function (s$$1, e) {
        var t = {};
        for (var p$$1 in s$$1) if (Object.prototype.hasOwnProperty.call(s$$1, p$$1) && e.indexOf(p$$1) < 0)
            t[p$$1] = s$$1[p$$1];
        if (s$$1 != null && typeof Object.getOwnPropertySymbols === "function")
            for (var i$$1 = 0, p$$1 = Object.getOwnPropertySymbols(s$$1); i$$1 < p$$1.length; i$$1++) if (e.indexOf(p$$1[i$$1]) < 0)
                t[p$$1[i$$1]] = s$$1[p$$1[i$$1]];
        return t;
    };
    const withPagination = (comp) => (conf) => {
        let updateFunc;
        // @ts-ignore
        const { stTable } = conf, otherConfProps = __rest$5(conf, ["stTable"]);
        const directive = paginationDirective({ table: stTable });
        const listener = (newSummary) => {
            const { page, size, filteredCount } = newSummary;
            updateFunc({
                stState: Object.assign({ lowerBoundIndex: (page - 1) * size, higherBoundIndex: Math.min(page * size - 1, filteredCount - 1) }, newSummary)
            });
        };
        directive.onSummaryChange(listener);
        const WrappingComponent = props => {
            const { stState = directive.state(), stTable } = props, otherProps = __rest$5(props, ["stState", "stTable"]);
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

    const withTable = (table) => (comp) => (props, ...rest) => comp(Object.assign({ stTable: table }, props), ...rest);

    var __rest$6 = (undefined && undefined.__rest) || function (s$$1, e) {
        var t = {};
        for (var p$$1 in s$$1) if (Object.prototype.hasOwnProperty.call(s$$1, p$$1) && e.indexOf(p$$1) < 0)
            t[p$$1] = s$$1[p$$1];
        if (s$$1 != null && typeof Object.getOwnPropertySymbols === "function")
            for (var i$$1 = 0, p$$1 = Object.getOwnPropertySymbols(s$$1); i$$1 < p$$1.length; i$$1++) if (e.indexOf(p$$1[i$$1]) < 0)
                t[p$$1[i$$1]] = s$$1[p$$1[i$$1]];
        return t;
    };
    const compose$1 = (a$$1, b$$1) => (...args) => b$$1(a$$1(...args));
    const table$1 = smartTable({
        data: users, tableState: {
            sort: {},
            filter: {},
            search: {},
            slice: { page: 1, size: 25 }
        }
    });
    const withUserTable = withTable(table$1);
    const sortable = compose$1(withSort, withUserTable);
    const searchable = compose$1(withSearch, withUserTable);
    const listable = compose$1(withListChange, withUserTable);
    const filterable = compose$1(withFilter, withUserTable);
    const paginable = compose$1(withPagination, withUserTable);
    const indicable = compose$1(withIndicator, withUserTable);
    const debounce$1 = (fn, time$$1 = 300) => {
        let timer;
        return (...args) => {
            if (timer) {
                clearTimeout(timer);
            }
            timer = setTimeout(() => fn(...args), time$$1);
        };
    };
    const UserRow = (UserItem) => h("tr", null,
        h("td", null, UserItem.value.name.first),
        h("td", null, UserItem.value.name.last),
        h("td", null, UserItem.value.job),
        h("td", null, new Date(UserItem.value.birthDate).toLocaleDateString()),
        h("td", null, UserItem.value.balance));
    const UserList = listable((props, stProps) => {
        const { state } = stProps;
        return h("tbody", { id: props.id }, state.length ? state.map(UserRow) : h("tr", null,
            h("td", { colspan: "5" }, "No matching item found")));
    });
    const Header = sortable((props, stProps) => {
        const { state, directive, config } = stProps;
        const className = state.pointer !== config.stPointer || state.direction === "none" /* NONE */ ?
            '' : (state.direction === "desc" /* DESC */ ?
            'st-sort-desc' : 'st-sort-asc');
        const onclick = () => directive.toggle('whatever');
        return h("th", { onclick: onclick, class: className }, props.children);
    });
    const SearchBar = searchable((props, stProps) => {
        const { state, directive } = stProps;
        const onInput = debounce$1(ev => directive.search(ev.target.value, { flags: 'i' }));
        return h("input", { placeholder: "Search...", type: "search", value: state.value || '', oninput: onInput });
    });
    const JobFilter = filterable((props, stProps) => {
        const { directive } = stProps;
        const onChange = (ev) => directive.filter(ev.target.value);
        return h("select", { onchange: onChange },
            h("option", { value: "" }, "-"),
            h("option", { value: Job.DEV }, Job.DEV),
            h("option", { value: Job.MANAGER }, Job.MANAGER),
            h("option", { value: Job.QA }, Job.QA));
    });
    const LoadingIndicator = indicable((props, stProps) => {
        const { state: { working } } = stProps;
        let classNames = (props['class'] || '').split(' ');
        if (working === false) {
            classNames.push('hidden');
        }
        else {
            const index = classNames.findIndex(x => x === 'hidden');
            if (index >= 0) {
                classNames.splice(index, 1);
            }
        }
        return h("div", { class: classNames.join(' ') }, "Loading ...");
    });
    const BalanceFilter = filterable((props, stProps) => {
        // go directly with table instance
        const { config: { stTable: table$$1 }, state } = stProps;
        const clause = state.balance || [];
        const lowerBoundValue = (clause.find(c => c.operator === "gte" /* GREATER_THAN_OR_EQUAL */) || { value: 0 }).value;
        const higherBoundValue = (clause.find(c => c.operator === "lte" /* LOWER_THAN_OR_EQUAL */) || { value: 5000 }).value;
        const changePartialClause = (operator) => debounce$1(ev => {
            const { value } = ev.target;
            const partialClauseIndex = clause.findIndex(c => c.operator === operator);
            if (partialClauseIndex >= 0) {
                clause.splice(partialClauseIndex, 1);
            }
            clause.push({ operator, type: "number" /* NUMBER */, value: Number(value) });
            table$$1.filter(Object.assign(state, { balance: clause }));
        });
        return h("div", null,
            h("label", null,
                h("span", null, "Balance lower bound:"),
                h("input", { value: lowerBoundValue, onchange: changePartialClause("gte" /* GREATER_THAN_OR_EQUAL */), type: "range", min: "0", max: "5000", step: "100" })),
            h("label", null,
                h("span", null, "Balance higher bound:"),
                h("input", { onChange: changePartialClause("lte" /* LOWER_THAN_OR_EQUAL */), type: "range", min: "0", max: "5000", step: "100", value: higherBoundValue })));
    });
    const InputFilter = filterable((props, stProps) => {
        const others = __rest$6(props, ["children"]);
        const onInput = debounce$1((ev) => {
            stProps.directive.filter(ev.target.value);
        });
        return h("input", Object.assign({}, others, { oninput: onInput }));
    });
    const Pagination = paginable((props, stProps) => {
        const { state, directive } = stProps;
        return h("div", { class: "pagination" },
            h("p", { class: "summary" },
                "Showing items ",
                h("em", null, state.lowerBoundIndex + 1),
                " - ",
                h("em", null, state.higherBoundIndex + 1),
                " of ",
                h("em", null, state.filteredCount),
                " matching items"),
            h("div", null,
                h("button", { disabled: !directive.isPreviousPageEnabled(), onclick: () => directive.selectPreviousPage() }, "Previous"),
                h("button", { disabled: !directive.isNextPageEnabled(), onclick: () => directive.selectNextPage() }, "Next")));
    });
    const App = ({ table: table$$1 }) => h("div", null,
        h("div", { id: "filter-container" },
            h("h2", null, "Filter options"),
            h("label", null,
                h("span", null, "First name:"),
                h(InputFilter, { placeholder: "Search for first name", stPointer: "name.first" })),
            h("label", null,
                h("span", null, "Last name:"),
                h(InputFilter, { placeholder: "Search for last name", stPointer: "name.last" })),
            h("label", null,
                h("span", null, "Filter by job type:"),
                h(JobFilter, { stPointer: "job" })),
            h("label", null,
                h("span", null, "Born after:"),
                h(InputFilter, { autocomplete: "birthdate", type: "date", stPointer: "birthDate", stType: "date" /* DATE */, stOperator: "gt" /* GREATER_THAN */ })),
            h(BalanceFilter, { stPointer: "balance" })),
        h(Pagination, null),
        h("div", { id: "table-container" },
            h(LoadingIndicator, { class: "loader" }),
            h("table", null,
                h("thead", null,
                    h("tr", null,
                        h(Header, { stPointer: "name.first", stCycle: true }, "First Name"),
                        h(Header, { stPointer: "name.last" }, "Last Name"),
                        h(Header, { stPointer: "job" }, "Job"),
                        h(Header, { stPointer: "birthDate" }, "Birth Date"),
                        h(Header, { stPointer: "balance" }, "Balance")),
                    h("tr", null,
                        h("td", { colspan: "5" },
                            h(SearchBar, { stScope: ['name.first', 'name.last'] })))),
                h(UserList, { id: "Hello" })),
            h(Pagination, null)));
    const container = document.getElementById('app-container');
    mount(h(App, { table: table$1 }), {}, container);

}());
//# sourceMappingURL=app.js.map
