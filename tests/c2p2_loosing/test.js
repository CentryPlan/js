import {ShufflingBus, LoosingBus} from "../../src/tests/SimulationCore"
import {isConcurrentNoError, isProposeNoError, isAcceptUnknownError, isLeadershipNoError, isLeadershipUnknownError} from "../../src/tests/exceptions"
import {SimulatedCluster} from "../../src/tests/SimulatedCluster"
import {InitInLoopIncKeysClient, waitAllClientsAsync, ClusterDriver, curry} from "../../src/tests/InitInLoopIncKeysClient"

export function test(seed, logger) {
    const keys = ["key1", "key2"];
    
    const system = new SimulatedCluster(seed);
    system.initTopology(tx => {
        const quorum = {
            "read": 2,
            "write": 2
        };
        var [a1, a2, a3] = ["a1", "a2", "a3"].map(id => tx.addAcceptor(id));
        tx.addProposer("p1", quorum, [a1, a2, a3], true);
        tx.addProposer("p2", quorum, [a1, a2, a3], true);
    });
    system.transformBus((bus, timer, random) => new ShufflingBus(bus, timer, random));
    system.transformBus((bus, timer, random) => new LoosingBus(bus, random, .9));
    const shared = InitInLoopIncKeysClient.createSharedMemory();
    const onStep = ClusterDriver({cluster: system, shared: shared, timeVariance: 10}).exitOnAllClientsIteratedAtLeast(200);

    const client = curry(InitInLoopIncKeysClient.asRunnable)({
        cluster: system, keys: keys, onStep: onStep, shared: shared,
        initExpectedErrors: [isConcurrentNoError, isLeadershipNoError, isLeadershipUnknownError, isAcceptUnknownError, isProposeNoError], 
        readUpdateExpectedErrors: [isConcurrentNoError, isLeadershipNoError, isLeadershipUnknownError, isAcceptUnknownError, isProposeNoError]
    })
    
    const c1 = system.spawnOnStart(client({clientId: "c1"}));
    const c2 = system.spawnOnStart(client({clientId: "c2"}));
    waitAllClientsAsync([c1, c2]);
    system.start(logger);
}