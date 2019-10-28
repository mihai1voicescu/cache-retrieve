import NodeCache from "node-cache";

const NO_CACHE = process.env.NO_CACHE;
if (NO_CACHE)
    console.warn(`
            
            
            
            ===========================
            WARNING NO CACHE MODE USED!
            ===========================
            
            
            `);


export class Retriever<T> {
    private readonly retrieverFn: (...args: string[]) => Promise<T>;
    private readonly keyCalculator: (...args: string[]) => string;
    private readonly internalCache: NodeCache;
    private readonly inProgress: Map<string, { resolve: (value?: unknown) => void, reject: (value?: unknown) => void }[]>;

    /**
     * Due to the limitations of the internal cache only string and number keys are supported
     * @param {async function(string|number)} retrieverFn
     * @param {Options} nodeCacheOptions
     * @param {function} keyCalculator
     */
    constructor(retrieverFn: (...args: string[]) => Promise<T>, nodeCacheOptions: {}, keyCalculator: (obj: any) => string) {
        const options = {stdTTL: 60000, useClones: false, checkperiod: 60000};
        if (NO_CACHE) {
            options.stdTTL = 1;
            options.checkperiod = 1000;
        }
        Object.assign(options, nodeCacheOptions);
        this.retrieverFn = retrieverFn;
        this.keyCalculator = keyCalculator;

        this.internalCache = new NodeCache(options);
        this.inProgress = new Map();
    }

    get(key?: string, obj?: any) {
        if (!key)
            key = this.keyCalculator(key);
        else if (!obj) {
            obj = key;
        }


        return new Promise((resolve, reject) => {
            let value = this.internalCache.get(key);

            if (value === undefined) {
                let container = this.inProgress.get(key);

                if (container) {
                    container.push({resolve, reject});
                    return;
                }

                container = [];
                this.inProgress.set(key, container);

                this.retrieverFn(obj).then(value => {
                    this.inProgress.delete(key);

                    if (value !== undefined)
                        this.internalCache.set(key, value);

                    // check if someone else ordered
                    if (container.length) {
                        for (let p of container)
                            p.resolve(value);
                    }

                    resolve(value);
                }).catch(e => {
                    this.inProgress.delete(key);

                    // check if someone else ordered
                    if (container.length) {
                        this.inProgress.delete(key);
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
