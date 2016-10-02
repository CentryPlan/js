
const CMDS = ["record", "replay"];
const TESTS = ["c1p1_shuffling", "c1p1_loosing", "c1p1_partitioning", "c1p2_shuffling", "c2p1_shuffling"];

if (process.argv.length != 5) {
    console.info(process.argv);
    help();
    process.exit(1);
}

assertContains({element: process.argv[2], set: CMDS});
assertContains({element: process.argv[3], set: TESTS});

if (process.argv[2]=="record") {
    const record = require(`./${process.argv[3]}/test`).record;
    record(process.argv[4], `./tests/${process.argv[3]}/network.log`);
}

if (process.argv[2]=="replay") {
    const replay = require(`./${process.argv[3]}/test`).replay;
    replay(process.argv[4], `./tests/${process.argv[3]}/network.log`);
}

function assertContains({element, set} = {}) {
    if (set.indexOf(element)==-1) {
        console.info("Got \"" + element + "\". Expected: " + set);
        console.info();
        help();
        process.exit(1);
    }
}

function help() {
    console.info("  node.js cpunit.js [record|replay] test seed");
    console.info();
    console.info("  Supported tests:");
    for (const test of TESTS) {
        console.info(`   * ${test}`);
    }
    
    console.info();
    console.info("  See tests folder for logs");
}