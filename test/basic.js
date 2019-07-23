'use strict';

const {Retriever} = require("../index");
const assert = require('assert');

function sleep(ms, obj) {
    return new Promise(resolve => {
        setTimeout(() => {
            resolve(obj);
        }, ms);
    })
}

async function counterFn(obj, ms, ret) {
    obj.start++;
    await sleep(ms);
    obj.end++;

    return ret;
}

describe('Retriever', function () {
    const retriever = new Retriever(sleep.bind(null, 50));
    const counter = {start: 0, end: 0};
    const retrieverCounter = new Retriever(counterFn.bind(null, counter, 50));

    describe('#get()', function () {
        it('should match', async function () {
            let res = await retriever.get("asd");
            assert.deepStrictEqual(res, "asd");
            assert.deepStrictEqual(await retriever.get("abc"), "abc");
            assert.deepStrictEqual(await retriever.get("abc"), "abc");
        });

        it('should match', async function () {
            const start = counter.start;
            retrieverCounter.get("abc");
            retrieverCounter.get("abc");
            retrieverCounter.get("abc");

            assert.deepStrictEqual(await retrieverCounter.get("abc"), "abc");

            assert.deepStrictEqual(counter.start, start + 1);
            assert.deepStrictEqual(counter.end, start + 1);
        });

    });
});
