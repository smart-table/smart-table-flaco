import {h, li, mount} from 'flaco';
import {Hero, heroes} from './fixture';
import {DisplayedItem, smartTable} from 'smart-table-core';
import {withListChange} from '../dist/src';

const table = smartTable<Hero>({data: heroes});

const Hero = (heroItem: DisplayedItem<Hero>) => <tr>
    <td>{heroItem.value.id}</td>
    <td>{heroItem.value.name}</td>
</tr>;

const HeroList = withListChange<Hero, { id: string }>((props, stProps) => {
    const {state, config} = stProps;
    console.log(props);
    console.log(stProps);
    return <tbody id={props.id}>
    {state.map(Hero)}
    </tbody>;
});

const App = ({table}) => <table>
    <thead>
    <tr>
        <th>ID</th>
        <th>Name</th>
    </tr>
    </thead>
    <HeroList id="Hello" stTable={table} />
</table>;

const container = document.getElementById('app-container');


mount(<App table={table}/>, {}, container);

