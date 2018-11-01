import resolve from 'rollup-plugin-node-resolve';

export default {
    input: './dist/src/index.js',
    output: [{
        format: 'iife',
        name: 'SmartTableFlaco',
        file: './dist/bundle/smart-table-flaco.js',
        sourcemap: true
    }, {
        format: 'es',
        file: './dist/bundle/smart-table-flaco.es.js',
        sourcemap: true
    }],
    plugins: [resolve()]
};
