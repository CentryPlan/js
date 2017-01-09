> THE SYSTEM IS UNDER CONSTRUCTION

Gryadka is a minimalistic layer on top of multiple instances of Redis working as a distributed consistent 
key/value storage (CP). Its core has less than 500 lines of code but provides full featured 
Paxos implementation supporting such advance features as cluster membership change and 
distinguished proposer optimization.

# FAQ

#### Is it a production ready?

No, it's an educational project and was never intended to be in production. It was created:

  * to practice and hone skills in distributed systems
  * to demonstrate that Paxos isn't as complex as it is known to be  

Nevertheless Gryadka supports cluster membership change and distinguished proposer optimization so it has all
the necessary production features.

#### Does it support other than Redis storages?

No, the size of a pluggable storage system would have been of the same magnitude as the Gryadka's current
Paxos implementation so only Redis is supported.

The good news is that the size of the code is tiny so it should be easy to read it, to understand and to rewrite
it with any storage of your choice.

#### I heard that Raft is simpler than Paxos, why don't you use it?

Raft is a protocol for building replicated consistent persistent append-only log. Paxos has several flavors. 
Multi-decree Paxos does the same as Raft (log), but Single-decree Paxos replicates atomic variable.

Yes, Raft looks simpler than Multi-decree Paxos, but Single-decree Paxos is simpler than Raft because
with Paxos all the updates happen inplace and you don't need to implement log truncation and snapshotting.

Of course replicated log is a more powerful data structure than replicated variable, but for a lot of cases it's 
enough the latter. For example, a key-value storage can be build just with a set of replicated variables.

# Goal

Paxos is a master-master replication protocol. Its inventor, Leslie Lamport wrote that 
["it is among the simplest and most obvious of distributed algorithms"](http://research.microsoft.com/en-us/um/people/lamport/pubs/paxos-simple.pdf)
but many who tried to implement it run into troubles:

  * ["building a production system turned out to be a non-trivial task for a variety of reasons"](https://www.cs.utexas.edu/users/lorenzo/corsi/cs380d/papers/paper2-1.pdf)
  * ["Paxos is by no means a simple protocol, even though it is based on relatively simple invariants"](http://www.cs.cornell.edu/courses/cs7412/2011sp/paxos.pdf)
  * ["we found few people who were comfortable with Paxos, even among seasoned researchers"](https://raft.github.io/raft.pdf)

This dissonance made me wonder so I challenged myself to write a simple Paxos implementation. I took lines of code as
a measure of simplicity and set a limit of 500 lines of code.

# Principles

The main principle of Gryadka is to get rid of everything if it isn't essential to replication and can be implemented 
on the client side. A lot of things which look essential to replication actually can be implemented as an above layer,
among them are transactions, sharding, consistent backup and leader election.  

#### Transactions

There are a lot of papers, articles and libraries covering or building client-side transactions supporting isolation 
levels from Read Committed to Serializable. Among them are:

 * ["Large-scale Incremental Processing Using Distributed Transactions and Notifications"](https://research.google.com/pubs/pub36726.html) by Google
 * ["Scalable Atomic Visibility with RAMP Transactions"](http://www.bailis.org/papers/ramp-sigmod2014.pdf) by UC Berkeley and University of Sydney
 * ["Transactions for Amazon DynamoDB"](https://github.com/awslabs/dynamodb-transactions) by Amazon
 * ["Omid: Transactional Support for HBase"](https://github.com/yahoo/omid) by Yahoo/Apache
 * ["How CockroachDB Does Distributed, Atomic Transactions"](https://www.cockroachlabs.com/blog/how-cockroachdb-distributes-atomic-transactions/) by CockroachLabs
 * ["Perform Two Phase Commit"](https://docs.mongodb.com/manual/tutorial/perform-two-phase-commits/) by MongoDB

It might be useful to take a look on ["Visualization of RAMP transactions"](http://rystsov.info/2016/04/07/ramp.html) and
["Visualization of serializable cross shard client-side transactions"](http://rystsov.info/2016/03/02/cross-shard-txs.html). 

#### Consistent backups

An ability to make consistent backups (aka point-in-time backup, consistent cut/snapshots) looks like an essential 
feature for a consistent storage but many major storages don't support it.

["MongoDB's docs"](https://docs.mongodb.com/manual/tutorial/backup-sharded-cluster-with-filesystem-snapshots/): "On a running production system, you can only capture an approximation of point-in-time snapshot."

["Cassandra's docs"](http://docs.datastax.com/en/archived/cassandra/3.x/cassandra/operations/opsAboutSnapshots.html): "To take a global snapshot, run the nodetool snapshot command using a parallel ssh utility ... This provides an eventually consistent backup. Although no one node is guaranteed to be consistent with its replica nodes at the time a snapshot is taken"

["Riak's docs"](http://docs.basho.com/riak/kv/2.2.0/using/cluster-operations/backing-up/): "backups can become slightly inconsistent from node to node"

Hopefully consistent backups can be implemented on the client side. If a system is based on the actor model and a key/value 
storage is only used to keep actor's state then it's possible to use [Lai–Yang's algorithm](https://www.cs.uic.edu/~ajayk/DCS-Book)
and [Mattern's algorithm](https://www.cs.uic.edu/~ajayk/DCS-Book).  

Alternatively if the system isn't based on the actor model then it's possible to integrate snapshotting with
transactions by denying transactions if its keys were backuped in different snapshots.  

#### Leader election

Naive Paxos implementation uses two round trips between acceptors and proposers to commit a value.
Of course a proposer can piggy back the next 'prepare' message on the current 'accept' message.
It effectively reduces the number of round trips from two to one if the next update will be issued
from the same proposer (otherwise nothing bad happens because Paxos holds consistency in the presence
of concurrent proposers).  

So the problem of leader election reduces to the problem how to land most of the user updates to the same
node. It can be solved on the above layer with [Microsoft Orleans](https://github.com/dotnet/orleans), 
[Uber RingPop](https://github.com/uber/ringpop-node) or other consistent hashing routing approach.

#### Sharding

Sharding is a way to split big key space into disjoint smaller key spaces and host each of them on each own
instance of the system in order to overcome the size limitations. The procedure of splitting and joining
key spaces should not affect correctness of the concurrent key updates operations.

The straightforward approach is to use transactions to simultaneously put a tombstone to the big key space instance of
the system and to init smaller key space with the tombed value. Once all the key are migrated and all the clients
switch to the new key/space topology then it's safe to drop the tombstoned key/values from the original key space.

So sharding can be also pushed to the client side.

# API

# Consistency

## Simulated network testing

Testing is done by mocking the network layer and checking consistency invariants during various 
network invasions like message dropping and reordering.

Each test scenario uses seed-able randomization. It means that all test's random decisions are determined by 
its initial value (seed) so user can replay any test in order to debug an issue. 

#### How to run consistency tests:

Prerequisites: nodejs

1. Clone this repo
2. cd gryadka
3. npm install
4. ./run-consistenty-check.sh partitioning/c2p2k2 record seed1
5. ./run-consistenty-check.sh partitioning/c2p2k2 replay seed1

The 4th command (record) runs the partitioning/c2p2k2 test using seed1 as a seed and records 
all messages between mocked acceptors and proposers to the tests/consistency/scenarios/partitioning/c2p2k2.log log.

The 5th command (replay) also runs the same test and 
validates that the observed messages match the recorded history.
It is usefull to check if a test's behavior depends only on a seed parameter.

Use 'all' instead of 'partitioning/c2p2k2' to run all tests. You can use 'void' instead of 'record' or 'replay'
if you don't want to log the messages.

Run ./run-consistenty-check.sh without arguments to see which tests are supported.

## End-to-end testing

Prerequisites: redis, nodejs

#### Staring a system and using curl to put a value

1. Clone this repo
2. cd gryadka
3. npm install
4. ./bin/pseudo-distribute.sh etc/p2a3.json
5. redis-server deployment/a0/redis.conf &
6. redis-server deployment/a1/redis.conf &
7. redis-server deployment/a2/redis.conf &
8. ./bin/gryadka.sh deployment/proposers/p0.json &
9. Test a sample key/value storage
    * curl -w "\n" -H "Content-Type: application/json" -X POST -d '{"key": "answer", "change": {"name": "kv-init","args": "unknown"},"query": {"name": "kv-read","args": null}}' http://localhost:8079/change
    * curl -w "\n" -H "Content-Type: application/json" -X POST -d '{"key": "answer", "change": {"name": "kv-update","args": {"version":0, "value": 42}},"query": {"name": "kv-read","args": null}}' http://localhost:8079/change
    * curl -w "\n" -H "Content-Type: application/json" -X POST -d '{"key": "answer", "change": {"name": "kv-id","args": null},"query": {"name": "kv-read","args": null}}' http://localhost:8079/change
    * curl -w "\n" -H "Content-Type: application/json" -X POST -d '{"key": "answer", "change": {"name": "kv-reset","args": "to pass butter"},"query": {"name": "kv-read","args": null}}' http://localhost:8079/change

#### Membership change

1. ./bin/pseudo-distribute.sh etc/a3a4.json
2. redis-server deployment/a0/redis.conf &
3. redis-server deployment/a1/redis.conf &
4. redis-server deployment/a2/redis.conf &
5. ./bin/gryadka.sh deployment/proposers/p0.json &
6. ./bin/gryadka.sh deployment/proposers/p1.json &
7. [dashboard] open a new tab and run: ./run-system-check.sh etc/a3a4.json
8. [dashboard]: "clients: c0,c1"
9. [dashboard]: "make c0,c1 use p0,p1"
10. [dashboard]: "start c0,c1"
11. redis-server deployment/a3/redis.conf &
12. ./bin/gryadka.sh deployment/proposers/p2.json &
13. ./bin/gryadka.sh deployment/proposers/p3.json &
14. [dashboard]: "clients: c2,c3"
15. [dashboard]: "make c2,c3 use p2,p3"
16. [dashboard]: "start c2,c3"
17. [dashboard]: "stop c0,c1"
18. kill p0 & p1 proposers
19. ./bin/keys-dumper.sh etc/a3a4.json a0 >> keys1
20. ./bin/keys-dumper.sh etc/a3a4.json a1 >> keys1
21. ./bin/keys-dumper.sh etc/a3a4.json a2 >> keys1
22. cat keys1 | sort | uniq > keys2
23. ./bin/keys-syncer.sh deployment/proposers/s0.json keys2
24. ./bin/gryadka.sh deployment/proposers/p4.json &
25. ./bin/gryadka.sh deployment/proposers/p5.json &
26. [dashboard]: "clients: c4,c5"
27. [dashboard]: "make c4,c5 use p4,p5"
28. [dashboard]: "start c4,c5"
29. [dashboard]: "stop c2,c3"
30. kill p2 & p3 proposers