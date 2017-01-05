import seedrandom from "seedrandom"
import {Random} from "../consistency/lib/Random"
import {IncClient} from "./IncClient"
import {IncConsistencyChecker} from "../consistency/lib/clients/IncConsistencyChecker"
import {isProposeNoError, isAcceptUnknownError, isConcurrentNoError, getErrorChecker} from "../consistency/lib/clients/exceptions"

const isVersionConflict = getErrorChecker("NO", ["ERRNO011", "ERRNO005"])

class Timer {
    yield() {
        return new Promise((reply, reject) => {
            setTimeout(() => reply(null), 0);
        })
    }
}

(async function() {
    try {
        const seed = "42";

        const ctx = {
            timer: new Timer(),
            random: new Random(seedrandom(seed))
        };

        const proposerUrls = [
            "http://127.0.0.1:8079/change",
            "http://127.0.0.1:8080/change"
        ];

        const checker = new IncConsistencyChecker();

        const c1 = IncClient.spawn({
            ctx: ctx, proposerUrls: proposerUrls, keys: ["key1", "key2"], 
            consistencyChecker: checker, recoverableErrors: [isProposeNoError, isAcceptUnknownError, isConcurrentNoError, isVersionConflict]
        });

        const c2 = IncClient.spawn({
            ctx: ctx, proposerUrls: proposerUrls, keys: ["key1", "key2"], 
            consistencyChecker: checker, recoverableErrors: [isProposeNoError, isAcceptUnknownError, isConcurrentNoError, isVersionConflict]
        });

        await c1.wait(x => x.stat.writes >= 10);
        await c2.wait(x => x.stat.writes >= 10);

        await c1.stop();
        await c2.stop();

        console.info(":)");
    } catch (e) {
        console.info("¯\\_(ツ)_/¯: SORRY")
        console.info(e);
        throw e;
    }
})();
