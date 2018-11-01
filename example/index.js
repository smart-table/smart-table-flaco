import { h, mount } from 'flaco';
import { heroes } from './fixture';
import { smartTable } from 'smart-table-core';
import { withListChange } from '../dist/src';
const table = smartTable({ data: heroes });
const Hero = (heroItem) => h("tr", null,
    h("td", null, heroItem.value.id),
    h("td", null, heroItem.value.name));
const HeroList = withListChange((props, stProps) => {
    const { state, config } = stProps;
    console.log(props);
    console.log(stProps);
    return h("tbody", { id: props.id }, state.map(Hero));
});
const App = ({ table }) => h("table", null,
    h("thead", null,
        h("tr", null,
            h("th", null, "ID"),
            h("th", null, "Name"))),
    h(HeroList, { id: "Hello", stTable: table }, "bim"));
const container = document.getElementById('app-container');
mount(h(App, { table: table }), {}, container);
