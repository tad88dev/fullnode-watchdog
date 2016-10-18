var coind = require('coind-client');
var async = require('async');
var cluster = require('cluster');
var Web3 = require('web3');
var config = require('./config.js');
const exec = require('child_process').exec;

var data = [];



function getTimeout(coinCode) {
    try {
        return config.timeout[coinCode];
    } catch (e) {
        return config.timeout['BTC'];
    }
}

function getIndex(clusterId) {
    return (clusterId < 0) ? 0 : clusterId - 1;
}

function getDaemon(index) {
    try {
        return config.daemonList[index];
    } catch (e) {
        return null;
    }
}

var childProcess = function () {
    var index = getIndex(cluster.worker.id);
    var daemonInfo = getDaemon(index);
    
    var executor = function (e, r, callback) {
        if (e) {
            console.log(e, daemonInfo);
            data[index].fail++;
            if (data[index].fail > config.failedTimes) {
                data[index].fail = -1;
                console.log(daemonInfo.code, daemonInfo.host, 'failed', data[index].lastBlock, data[index].timeout, data[index].fail);
                exec(daemonInfo.start, (error, stdout, stderr) => {
                    setTimeout(childProcess, config.recheckTime);
                });
            }
        } else {
            if (data[index].lastBlock < r) {
                console.log(daemonInfo.code, daemonInfo.host, 'found', data[index].lastBlock, data[index].timeout, data[index].fail);
                data[index].lastBlock = r;
                data[index].timeout = 0;
            } else {
                data[index].timeout += config.recheckTime;
                if (data[index].timeout > config.timeout[daemonInfo.code]) {
                    console.log(daemonInfo.code, daemonInfo.host, 'timeout', data[index].lastBlock, data[index].timeout, data[index].fail);
                    exec(daemonInfo.stop, (error, stdout, stderr) => {
                        if (error) {
                            console.log(error);
                        } else {
                            console.log(stdout, stderr);
                        }
                    });
                }
            }
        }
        callback();
    }

    if (daemonInfo.code == 'ETH') {
        var web3 = new Web3(new Web3.providers.HttpProvider(daemonInfo.host));
        web3.eth.getBlockNumber((e, r) => {
            executor(e, r, () => {
                setTimeout(childProcess, config.recheckTime);
            });
        });
    } else {
        var myClient = new coind.Client(daemonInfo);
        myClient.cmd('getblockcount', (e, r) => {
            executor(e, r, () => {
                setTimeout(childProcess, config.recheckTime);
            });
        });
    }
}

if (cluster.isMaster) {

    // Fork workers.
    for (var i = 0; i < config.daemonList.length; i++) {
        cluster.fork();
    }

    cluster.on('exit', (worker, code, signal) => {
        console.log(`worker ${worker.process.pid} died`);
    });

} else {
    var index = getIndex(cluster.worker.id);
    data[index] = {};
    data[index].lastBlock = 0;
    data[index].timeout = 0;
    data[index].fail = 0;
    childProcess();
}


/*
async.eachSeries(geths, function (element, callback) {
    var web3 = new Web3(new Web3.providers.HttpProvider(element));
    web3.eth.getBlockNumber((e, r) => { console.log(element, e, r); });
    callback();
}, function () {
    async.eachSeries(config, function (element, callback) {
        var myClient = new coind.Client(element);
        myClient.cmd('getblockcount', function (e, r) {
            console.log("Server:", element.host, "Port:", element.port, "User:", element.user, "--------------");
            if (!e) {
                console.log("Block number", r);
            } else {
                console.log("Error", e);
            }
            callback();
        });
    });
});



var myClient = new coind.Client(config[0]);

myClient.cmd('getrawtransaction', 'f661368054502b90d1187548dbd6853a32aa6d3ac27d57e2d48fa8fd469d23f9',1 , (e, r) => {
    console.log(0);
    console.log(r);
});

var myClient = new coind.Client(config[3]);

myClient.cmd('getrawtransaction', 'f661368054502b90d1187548dbd6853a32aa6d3ac27d57e2d48fa8fd469d23f9',1 , (e, r) => {
    console.log(3);
    console.log(r);
});


var myClient = new coind.Client(config[6]);

myClient.cmd('getrawtransaction', 'b52ff514410ec005a077f68dbf52883a3de1951320176d5f0fa8fa15a2575785',1 , (e, r) => {
    console.log(r);
    if (!e) {
        console.log(r.tx);
        for(var i = 0; i < r.tx.length; i ++){
            console.log(r.tx[i]);
        }
        var txs = r.tx;
        async.eachSeries(txs, function (tx, callback) {
            
            myClient.cmd('getrawtransaction', tx, 1, (e, r) => {
                if (!e) {
                    console.log(r);
                }else{
                    console.log(e);
                }
                callback();
            });
        });
    }
});*/