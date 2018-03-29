const {AcceptorMock} = require("./Acceptor");
const {BallotNumber, Proposer} = require("gryadka-core");

function createProposer({pid, network, prepare, accept}) {
    const ballot = new BallotNumber(0, pid);

    prepare = {
        nodes: prepare.nodes.map(x => x.createClient(pid, network)),
        quorum: prepare.quorum
    };
    accept = {
        nodes: accept.nodes.map(x => x.createClient(pid, network)),
        quorum: accept.quorum
    };

    const proposer = new Proposer(ballot, prepare, accept);
    
    return proposer;
}

function createAcceptors(ctx, ids) {
    return ids.map(aid => new AcceptorMock(ctx, aid));
}

exports.createAcceptors = createAcceptors;
exports.createProposer = createProposer;