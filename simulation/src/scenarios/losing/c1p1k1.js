const {Context} = require("../../lib/Context");

const {createProposer, createAcceptors} = require("../../lib/Mocks");
const {IncClient} = require("../../lib/clients/IncClient");
const {IncConsistencyChecker} = require("../../lib/clients/IncConsistencyChecker");

const {Proxy} = require("../../lib/proxies/Proxy");
const {ShufflingProxy} = require("../../lib/proxies/ShufflingProxy");
const {LosingProxy} = require("../../lib/proxies/LosingProxy");
const {LoggingProxy} = require("../../lib/proxies/LoggingProxy");

const MAX_TIME_DELAY = 1000;

exports.test = async function({seed, logger, intensity=null}) {
    intensity = intensity || 200;
    const ctx = new Context(MAX_TIME_DELAY, seed);

    const network = Proxy.chain(
        LosingProxy.w({ctx: ctx, stability: .8}), 
        ShufflingProxy.w({ctx: ctx, base: 3, variance: 10}), 
        LoggingProxy.w({ctx: ctx, logger: logger})
    );

    const acceptors = createAcceptors(ctx, ["a0", "a1", "a2"]);

    const p1 = createProposer({
        network: network,
        pidtime: 1, pid: "p1",
        prepare: {nodes: acceptors, quorum: 2},
        accept: {nodes: acceptors, quorum: 2}
    });

    const checker = new IncConsistencyChecker();

    const c1 = IncClient.spawn({
        ctx: ctx, id: "c1", proposers: [p1], keys: ["key1"],
        consistencyChecker: checker
    });

    checker.onConsistencyViolation(e => {
        c1.raise(e);
    });

    logger.onError(x => c1.raise(x));

    ctx.timer.start();

    await c1.wait(x => x.stat.writes >= intensity);
    await c1.stop();
    await ctx.timer.thread;
}