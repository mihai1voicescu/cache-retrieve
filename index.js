'use strict';

const NodeCache = require("node-cache");

class Retriever {

    /**
     * Due to the limitations of the internal cache only string and number keys are supported
     * @param {async function(string|number)} retrieverFn
     * @param {Options} nodeCacheOptions
     * @param {function} keyCalculator
     */
    constructor(retrieverFn, nodeCacheOptions, keyCalculator) {
        this._retrieverFn = retrieverFn;
        this._keyCalculator = keyCalculator;

        /**
         * Use with caution
         * @type {NodeCache}
         */
        this.internalCache = new NodeCache(nodeCacheOptions);
        this._inProgress = new Map();
    }

    get(key, obj) {
        if (!key)
            key = this._keyCalculator(key);
        else if (!obj) {
            obj = key;
        }


        return new Promise((resolve, reject) => {
            let value = this.internalCache.get(key);

            if (value === undefined) {
                let container = this._inProgress.get(key);

                if (container) {
                    container.push({resolve, reject});
                    return;
                }

                container = [];
                this._inProgress.set(key, container);

                this._retrieverFn(obj).then(value => {
                    this._inProgress.delete(key);

                    if (value !== undefined)
                        this.internalCache.set(key, value);

                    // check if someone else ordered
                    if (container.length) {
                        for (let p of container)
                            p.resolve(value);
                    }

                    resolve(value);
                }).catch(e => {
                    this._inProgress.delete(key);

                    // check if someone else ordered
                    if (container.length) {
                        this._inProgress.delete(key);
                        for (let p of container)
                            p.reject(e);
                    }

                    reject(e);
                });
            } else {
                resolve(value);
            }
        });
    }
}

module.exports = {
    Retriever,
    RetrieverFromCB
};
