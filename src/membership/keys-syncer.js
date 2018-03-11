const {Cache} = require("../Cache");
const {AcceptorClient} = require("../AcceptorClient");
const {Proposer, ProposerError} = require("../Proposer");
const {redisAsyncClient} = require("../utils/redisAsyncClient");

const fs = require("fs");
const readline = require("readline");

class Syncer {
    start(settings) {
        const cache = new Cache(settings.id);
        this.acceptors = settings.acceptors.map(x => new AcceptorClient(x));
        this.acceptors.forEach(x => x.start());

        this.proposer = new Proposer(cache, this.acceptors, settings.quorum);

        return this;
    }

    async sync(key) {
        return await this.proposer.change(key, state => [state, null]);
    }

    close() {
        this.acceptors.forEach(x => x.close());
    }
}

const settings = JSON.parse(fs.readFileSync(process.argv[2]));
console.info(settings);

var keys = fs.readFileSync(process.argv[3]).toString().split("\n").filter(x => x != "");

(async function() {
    var syncer = null;
    try {
        syncer = new Syncer().start(settings);
        for (const key of keys) {
            while (true) {
                try {
                    await syncer.sync(key);
                    break;
                } catch (e) {
                    if (e instanceof ProposerError) {
                        continue;
                    } else {
                        throw e;
                    }
                }
            }
        }
        syncer.close();
        console.info("Done");
    } catch (error) {
        console.info(error);
        if (syncer != null) {
            syncer.close();
        }
    }
})();
