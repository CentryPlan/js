const {Context} = require("../../lib/Context")

const {createProposer, createAcceptors} = require("../../lib/Mocks")
const {IncClient} = require("../../lib/clients/IncClient")
const {IncConsistencyChecker} = require("../../lib/clients/IncConsistencyChecker")
const {isProposeNoError, isAcceptUnknownError} = require("../../lib/clients/exceptions")

const {Proxy} = require("../../lib/proxies/Proxy")
const {ShufflingProxy} = require("../../lib/proxies/ShufflingProxy")
const {LosingProxy} = require("../../lib/proxies/LosingProxy")
const {LoggingProxy} = require("../../lib/proxies/LoggingProxy")

const MAX_TIME_DELAY = 1000;

exports.test =  async function({seed, logger, intensity=null}) {
    intensity = intensity || 200;
    const ctx = new Context(MAX_TIME_DELAY, seed);

    const network = Proxy.chain(
        ShufflingProxy.w({ctx: ctx, base: 3, variance: 10}), 
        LoggingProxy.w({ctx: ctx, logger: logger})
    );

    let acceptors = createAcceptors(ctx, ["a0", "a1", "a2"]);

    const ps = [];

    for (let i=1;i<3;i++) {
        ps.push(createProposer({
            pidtime: i, pid: "p"+i, quorum: { read: 2, write: 2 },
            acceptorClients: {
                acceptors: acceptors,
                network: network,
                transient: new Set([])
            }
        }));
    } 

    const c1 = IncClient.spawn({
        ctx: ctx, id: "c1", proposers: ps, keys: ["key1", "key2"],
        consistencyChecker: new IncConsistencyChecker(), 
        recoverableErrors: [isProposeNoError, isAcceptUnknownError]
    });

    ctx.timer.start();

    logger.onError(x => c1.raise(x));

    await c1.wait(x => x.stat.writes >= intensity);
    await c1.stop();
    await ctx.timer.thread;
}