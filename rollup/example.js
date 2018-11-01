import resolve from 'rollup-plugin-node-resolve';

export default {
    input: './example/index.js',
    output: [{
        format: 'iife',
        name: 'app',
        file: './example/dist/app.js',
        sourcemap: true
    }],
    plugins: [resolve()]
};
