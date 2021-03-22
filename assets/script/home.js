(function ($) {
    let isHomePageInit = false;
    let lastBlockFound = null;
    let xhrRenderCharts;
    let graphSettings = {
        type: 'line',
        width: '100%',
        height: '190',
        lineColor: '#335eea',
        fillColor: 'rgba(51,94,234,0.3)',
        spotColor: null,
        minSpotColor: null,
        maxSpotColor: null,
        highlightLineColor: '#42ba96',
        spotRadius: 3,
        chartRangeMin: 0,
        drawNormalOnTop: false,
        tooltipFormat: '<b>{{y}}</b> &ndash; {{offset:names}}'
    };

    $(function () {
        currentPage = {
            destroy: function () {
                $('#networkLastBlockFound, #poolLastBlockFound').timeago('dispose');
            },
            update: function (updateKey) {
                if (isHomePageInit) {
                    $.updateHome(updateKey);
                }
            }
        };

        let isReadyHome = setInterval(function () {
            if (lastStats) {
                $('#networkLastBlockFound, #poolLastBlockFound').timeago();
                $.initTemplate(lastStats, mergedStats);
                $.loadTranslations();

                xhrRenderCharts = $.ajax({
                    url: api + '/stats',
                    cache: false,
                    success: $.homeCreateCharts
                });

                clearInterval(isReadyHome);
            }
        }, 10);
    });

    $.updateHome = function (updateKey) {
        let stats = updateKey === parentCoin ? lastStats : mergedStats[updateKey];

        if (stats) {
            $.generateNetworkStats(updateKey, stats.config.symbol);

            if (!lastBlockFound) {
                $('#poolLastBlockFound').removeAttr('title').data('ts', '').update('Never');
            }

            if (stats.pool.lastBlockFound) {
                let lastChildBlockFound = parseInt(stats.pool.lastBlockFound);
                if (lastChildBlockFound > lastBlockFound) {
                    lastBlockFound = lastChildBlockFound;
                    $('#poolLastBlockFound').timeago('update', new Date(lastBlockFound).toISOString());
                }
            }

            if (stats.pool.lastBlockFoundSolo) {
                let lastChildBlockFound = parseInt(stats.pool.lastBlockFoundSolo);
                if (lastChildBlockFound > lastBlockFound) {
                    lastBlockFound = lastChildBlockFound;
                    $('#poolLastBlockFound').timeago('update', new Date(lastBlockFound).toISOString());
                }
            }

            let rewardMinusNetworkFee = stats.lastblock.reward - (stats.lastblock.reward * (stats.config.networkFee ? stats.config.networkFee / 100 : 0));
            let hashPowerSolo = lastStats.pool.hashrateSolo / (lastStats.network.difficulty / lastStats.config.coinDifficultyTarget) * 100;
            let hashPower = lastStats.pool.hashrate / (lastStats.network.difficulty / lastStats.config.coinDifficultyTarget) * 100;
            let el = $.updateText('lastHash', lastStats.lastblock.hash);
            if (el) {
                el.setAttribute('href', $.getBlockchainUrl(lastStats.lastblock.hash, lastStats));
            }

            $.updateText(`networkHashrate${updateKey}`, $.getReadableHashRateString(stats.network.difficulty / stats.config.coinDifficultyTarget) + '/sec');
            $.updateText(`networkDifficulty${updateKey}`, $.formatNumber(stats.network.difficulty.toString(), ','));
            $.updateText(`blockchainHeight${updateKey}`, $.formatNumber(stats.network.height.toString(), ','));
            $.updateText(`networkLastReward${updateKey}`, $.getReadableCoin(stats, rewardMinusNetworkFee));
            $.updateText(`poolMiners${updateKey}`, `Prop: ${stats.pool.miners} — Solo: ${stats.pool.minersSolo}`);
            $.updateText(`blocksTotal${updateKey}`, `Prop: ${stats.pool.totalBlocks} — Solo: ${stats.pool.totalBlocksSolo}`);
            $.updateText(`currentEffort${updateKey}`, (stats.pool.roundHashes / stats.network.difficulty * 100).toFixed(1) + '%');
            $.updateText('poolHashrate', $.getReadableHashRateString(lastStats.pool.hashrate) + '/sec');
            $.updateText('poolHashrateSolo', $.getReadableHashRateString(lastStats.pool.hashrateSolo) + '/sec');
            $.updateText('hashPowerSolo', hashPowerSolo.toFixed(2) + '%');
            $.updateText('hashPower', hashPower.toFixed(2) + '%');
            $.updateText('blockSolvedTime', $.getReadableTime(lastStats.network.difficulty / (lastStats.pool.hashrate + lastStats.pool.hashrateSolo)));
        }
    };


    $.generateNetworkStats = function (key, symbol) {
        if ($(`#networkStats${key}`).length === 0) {
            let template = $('#siblingTemplate').html();
            if (template) {
                Mustache.parse(template);
                let rendered = Mustache.render(template, {
                    coin: key,
                    symbol: symbol
                });
                $(`#networkStats`).append(rendered);
            }
        }
    };


    $.initTemplate = function (parentStats, siblingStats) {
        $('#networkLastBlockFound').timeago('update', new Date(parentStats.lastblock.timestamp * 1000).toISOString());

        let coin = parentStats.config.coin;
        let minerInfo = [];
        let efforts = [];

        if ($(`#networkStats${coin}`).length === 0) {
            minerInfo.push({
                blocks: parentStats.pool.totalBlocks.toString(),
                blocksSolo: parentStats.pool.totalBlocksSolo.toString(),
                coin: coin,
                symbol: parentStats.config.symbol,
                miners: parentStats.pool.miners.toString(),
                minersSolo: parentStats.pool.minersSolo.toString()
            });

            efforts.push({
                coin: coin,
                effort: `${(parentStats.pool.roundHashes / parentStats.network.difficulty * 100).toFixed(1)}%`,
                symbol: parentStats.config.symbol
            });

            let template = $('#siblingTemplate').html();
            Mustache.parse(template);
            let rendered = Mustache.render(template, {
                coin: coin,
                symbol: parentStats.config.symbol
            });
            $(`#networkStats`).append(rendered);
        }

        let lastBlockFound = null;
        if (parentStats.pool.lastBlockFound) {
            lastBlockFound = parseInt(parentStats.pool.lastBlockFound);
        }


        $.updateText(`networkHashrate${coin}`, $.getReadableHashRateString(parentStats.network.difficulty / parentStats.config.coinDifficultyTarget) + '/sec');
        $.updateText(`networkDifficulty${coin}`, $.formatNumber(parentStats.network.difficulty.toString(), ','));
        $.updateText(`blockchainHeight${coin}`, $.formatNumber(parentStats.network.height.toString(), ','));
        let rewardMinusNetworkFee = parentStats.lastblock.reward - (parentStats.lastblock.reward * (parentStats.config.networkFee ? parentStats.config.networkFee / 100 : 0));
        $.updateText(`networkLastReward${coin}`, $.getReadableCoin(parentStats, rewardMinusNetworkFee));

        Object.keys(siblingStats)
            .forEach(key => {
                $.generateNetworkStats(key, siblingStats[key].config.symbol);

                minerInfo.push({
                    blocks: siblingStats[key].pool.totalBlocks.toString(),
                    blocksSolo: siblingStats[key].pool.totalBlocksSolo.toString(),
                    coin: key,
                    symbol: siblingStats[key].config.symbol,
                    miners: siblingStats[key].pool.miners.toString(),
                    minersSolo: siblingStats[key].pool.minersSolo.toString()
                });

                efforts.push({
                    coin: key,
                    effort: `${(siblingStats[key].pool.roundHashes / siblingStats[key].network.difficulty * 100).toFixed(1)}%`,
                    symbol: siblingStats[key].config.symbol
                });

                if (siblingStats[key].pool.lastBlockFound) {
                    let lastChildBlockFound = parseInt(siblingStats[key].pool.lastBlockFound);
                    if (lastChildBlockFound > lastBlockFound)
                        lastBlockFound = lastChildBlockFound
                }

                $.updateText(`networkHashrate${key}`, $.getReadableHashRateString(siblingStats[key].network.difficulty / siblingStats[key].config.coinDifficultyTarget) + '/sec');
                $.updateText(`networkDifficulty${key}`, $.formatNumber(siblingStats[key].network.difficulty.toString(), ','));
                $.updateText(`blockchainHeight${key}`, $.formatNumber(siblingStats[key].network.height.toString(), ','));
                //        $.updateText(`networkLastReward${key}`, getReadableCoin(siblingStats[key], siblingStats[key].lastblock.reward));
                $.updateText(`poolMiners${key}`, `Prop: ${siblingStats[key].pool.miners} — Solo: ${siblingStats[key].pool.minersSolo}`);
                $.updateText(`blocksTotal${key}`, `Prop: ${siblingStats[key].pool.totalBlocks} — Solo: ${siblingStats[key].pool.totalBlocksSolo}`);
                $.updateText(`currentEffort${key}`, (siblingStats[key].pool.roundHashes / siblingStats[key].network.difficulty * 100)
                    .toFixed(1) + '%');
            });

        $.sortElementList($(`#networkStats`), $(`#networkStats > div`), siblingStats);

        if ($('#poolDetails > div').length === 0) {
            let template = $('#poolDetailTemplate').html();
            Mustache.parse(template);
            let rendered = Mustache.render(template, {
                coin: parentStats.config.coin,
                symbol: parentStats.config.symbol,
                blocks: minerInfo
            });
            $('#poolDetails').append(rendered);
        }

        if ($(`#mainPoolStats > div`).length === 0) {
            let template = $('#mainPoolTemplate').html();
            Mustache.parse(template);
            let rendered = Mustache.render(template, {
                coin: parentStats.config.coin,
                blocks: minerInfo,
                efforts: efforts
            });
            $(`#mainPoolStats`).append(rendered);
        }

        if (lastBlockFound) {
            $('#poolLastBlockFound').timeago('update', new Date(lastBlockFound).toISOString());
        } else {
            $('#poolLastBlockFound').removeAttr('title').data('ts', '').update('Never');
        }

        let lastHash = $.updateText('lastHash', parentStats.lastblock.hash);
        if (lastHash)
            lastHash.setAttribute('href', $.getBlockchainUrl(parentStats.lastblock.hash, parentStats));

        $.updateText('poolHashrate', `${$.getReadableHashRateString(parentStats.pool.hashrate)}/sec`);
        $.updateText('poolHashrateSolo', `${$.getReadableHashRateString(parentStats.pool.hashrateSolo)}/sec`);

        let hashPowerSolo = parentStats.pool.hashrateSolo / (parentStats.network.difficulty / parentStats.config.coinDifficultyTarget) * 100;
        $.updateText('hashPowerSolo', hashPowerSolo.toFixed(2) + '%');

        let hashPower = parentStats.pool.hashrate / (parentStats.network.difficulty / parentStats.config.coinDifficultyTarget) * 100;
        $.updateText('hashPower', hashPower.toFixed(2) + '%');
        $.updateText(`poolMiners${coin}`, `Prop: ${parentStats.pool.miners} — Solo: ${parentStats.pool.minersSolo}`);
        $.updateText(`blocksTotal${coin}`, `Prop: ${parentStats.pool.totalBlocks} — Solo: ${parentStats.pool.totalBlocksSolo}`);

        let totalFee = parentStats.config.fee;
        if (Object.keys(parentStats.config.donation).length) {
            let totalDonation = 0;
            for (let i in parentStats.config.donation) {
                totalDonation += parentStats.config.donation[i];
            }
            totalFee += totalDonation;
        }

        $.updateText('poolFee', (totalFee > 0 && totalFee !== 100 ? $.floatToString(totalFee) : (totalFee === 100 ? '100' : '0')) + '%');
        $.updateText('paymentsInterval', $.getReadableTime(parentStats.config.paymentsInterval));
        $.updateText('paymentsMinimum', $.getReadableCoin(parentStats, parentStats.config.minPaymentThreshold));
        $.updateText('blockSolvedTime', $.getReadableTime(parentStats.network.difficulty / (parentStats.pool.hashrate + parentStats.pool.hashrateSolo)));
        $.updateText(`currentEffort${coin}`, (parentStats.pool.roundHashes / parentStats.network.difficulty * 100).toFixed(1) + '%');

        isHomePageInit = true;
    };


    $.generateNetworkStats = function (key, symbol) {
        if ($(`#networkStats${key}`).length === 0) {
            let template = $('#siblingTemplate').html();
            if (template) {
                Mustache.parse(template);
                let rendered = Mustache.render(template, {
                    coin: key,
                    symbol: symbol
                });
                $(`#networkStats`).append(rendered);
            }
        }
    };


    $.homeCreateCharts = function (data) {
        if (data.hasOwnProperty("charts")) {
            let graphData = {
                hashrate: {
                    data: [$.homeGetGraphData(data.charts.hashrate), $.homeGetGraphData(data.charts.hashrateSolo)],
                    options: {
                        lineColor: '#fad776',
                        fillColor: 'rgba(250,215,118,0.5)'
                    }
                },
                diff: {
                    data: [$.homeGetGraphData(data.charts.difficulty)]
                },
                miners: {
                    data: [$.homeGetGraphData(data.charts.miners), $.homeGetGraphData(data.charts.minersSolo)],
                    options: {
                        lineColor: '#fad776',
                        fillColor: 'rgba(250,215,118,0.5)'
                    }
                },
                workers: {
                    data: [$.homeGetGraphData(data.charts.workers), $.homeGetGraphData(data.charts.workersSolo)],
                    options: {
                        lineColor: '#fad776',
                        fillColor: 'rgba(250,215,118,0.5)'
                    }
                },
            };

            for (let graphType in graphData) {
                if (graphData[graphType].data[0].values.length > 1) {
                    let settings = jQuery.extend({}, graphSettings);
                    settings.tooltipValueLookups = {
                        names: graphData[graphType].data[0].names
                    };
                    let $chart = $('[data-chart=' + graphType + '] .chart');
                    $chart.closest('.poolChart').show();
                    settings.tooltipFormat = graphData[graphType].data[1] ? '<span style="color: rgb(51,94,234);">PROP: {{y}}</span> &ndash; {{offset:names}}' : '<span>{{y}}</span> &ndash; {{offset:names}}';
                    $chart.sparkline(graphData[graphType].data[0].values, settings);
                    if (graphData[graphType].data[1]) {
                        settings.composite = true;
                        settings.lineColor = graphData[graphType].options.lineColor;
                        settings.fillColor = graphData[graphType].options.fillColor;
                        settings.tooltipFormat = '<span style="color: #fad776;">SOLO: {{y}}</span> &ndash; {{offset:names}}';
                        $chart.sparkline(graphData[graphType].data[1].values, settings);
                    }
                }
            }
        }
    };


    $.homeGetGraphData = function (rawData, fixValueToCoins) {
        let graphData = {
            names: [],
            values: []
        };
        if (rawData) {
            for (let i = 0, xy; xy = rawData[i]; i++) {
                graphData.names.push(new Date(xy[0] * 1000).toLocaleString());
                graphData.values.push(fixValueToCoins ? $.getReadableCoin(lastStats, xy[1], null, true) : xy[1]);
            }
        }
        return graphData;
    };
})(jQuery);
