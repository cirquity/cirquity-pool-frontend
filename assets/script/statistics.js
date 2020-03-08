(function ($) {
    let isRunOnce = false;
    let isStatisticsPageInit = false;
    let xhrGetPayments = {};
    let xhrAddressPoll = {};
    let addressTimeout = {};

    let graphSettings = {
        type: 'line',
        width: '100%',
        height: '140',
        lineColor: '#03a9f4',
        fillColor: 'rgba(3, 169, 244, .4)',
        spotColor: null,
        minSpotColor: null,
        maxSpotColor: null,
        highlightLineColor: '#236d26',
        spotRadius: 3,
        chartRangeMin: 0,
        drawNormalOnTop: false,
        tooltipFormat: '<b>{{y}}</b> &ndash; {{offset:names}}'
    };

    $(function () {
        currentPage = {
            destroy: function () {
            },
            update: function (updateKey) {
                if (isStatisticsPageInit) {
                    $.updateStats(updateKey);
                }
            }
        };

        let isReadyStats = setInterval(function () {
            if (lastStats) {
                $.statsInitTemplate(isRunOnce, addressTimeout, xhrAddressPoll);
                $.loadTranslations();

                clearInterval(isReadyStats);
            }
        }, 10);
    });

    $.updateStats = function (updateKey) {};


    $.statsInitTemplate = function(runOnce, addressTimeout, xhrAddressPoll, xhrGetPayments) {
        let coin = lastStats.config.coin;
        if ($(`#blocksTabs li:contains(${coin})`).length === 0) {
            let template = $('#siblingTabTemplate').html();
            Mustache.parse(template);
            let rendered = Mustache.render(template, {
                coin: lastStats.config.coin,
                symbol: `(${lastStats.config.symbol})`,
                active: 'active'
            });
            $('#blocksTabs').append(rendered);

            template = $('#siblingTemplate').html();
            Mustache.parse(template);
            rendered = Mustache.render(template, {
                coin: coin,
                active: 'active'
            });
            $('#blocksContent').append(rendered);
            $.statsSetup(lastStats, api, addressTimeout, xhrAddressPoll, xhrGetPayments)
        }

        Object.keys(mergedStats).forEach(key => {
            if ($(`#blocksTabs li:contains(${key})`).length === 0) {
                coin = key;
                let template = $('#siblingTabTemplate').html();
                Mustache.parse(template);
                let rendered = Mustache.render(template, {
                    coin: mergedStats[key].config.coin,
                    symbol: `(${mergedStats[key].config.symbol})`
                });
                $('#blocksTabs').append(rendered);

                template = $('#siblingTemplate').html();
                Mustache.parse(template);
                rendered = Mustache.render(template, {
                    coin: coin
                });
                $('#blocksContent').append(rendered);
                $.statsSetup(mergedStats[key], mergedApis[key].api, addressTimeout, xhrAddressPoll, xhrGetPayments)
            }
        });

        $.sortElementList($(`#blocksTabs`), $(`#blocksTabs > li`), mergedStats);

        if (!runOnce) {
            isRunOnce = $.statsRunOnce();
        }

        isStatisticsPageInit = true;
    };
    
    
    $.statsSetup = function(stats, api, addressTimeout, xhrAddressPoll, xhrGetPayments) {
        // Enable time ago on last submitted share
        $(`#yourLastShare${stats.config.coin}`).timeago();

        $(`#lookUp${stats.config.coin}`).click(function () {
            let address = $(`#yourStatsInput${stats.config.coin}`).val().trim();

            if ($.getCurrentAddress(stats.config.coin) !== address) {
                docCookies.setItem(`mining_address_${stats.config.coin}`, address, Infinity);

                let urlWalletAddress = location.search.split('wallet=')[1] || 0;
                if (urlWalletAddress) {
                    window.location.href = "/statistics.html";
                    return;
                } else {
                    docCookies.setItem(`mining_address_${stats.config.coin}`, address, Infinity);
                    $.loadLiveStats(true, mergedStats);
                }
            }

            $(`#addressError${stats.config.coin}, .yourStats${stats.config.coin}, .yourWorkers${stats.config.coin}, .userChart${stats.config.coin}`).hide();
            $(`#workersReport_rows_${stats.config.coin}`).empty();
            $(`#paymentsReport_rows_${stats.config.coin}`).empty();

            $(`#lookUp${stats.config.coin} > span:first-child`).hide();
            $(`#lookUp${stats.config.coin} > span:last-child`).show();

            if (addressTimeout[stats.config.coin]) clearTimeout(addressTimeout[stats.config.coin]);

            if (xhrAddressPoll[stats.config.coin])
                xhrAddressPoll[stats.config.coin].abort();

            $(`#lookUp${stats.config.coin} > span:last-child`).hide();
            $(`#lookUp${stats.config.coin} > span:first-child`).show();

            if (!address) {
                $(`#yourStatsInput${stats.config.coin}`).focus();
                return;
            }

            $.statsFetchAddressStats(false, stats, api, xhrAddressPoll);
        });

        let address = $.getCurrentAddress(stats.config.coin);
        if (address) {
            $(`#yourStatsInput${stats.config.coin}`).val(address);
            $(`#lookUp${stats.config.coin}`).click();
        } else {
            $(`#lookUp${stats.config.coin} > span:last-child`).hide();
            $(`#lookUp${stats.config.coin} > span:first-child`).show();
            $(`#addressError${stats.config.coin}, .yourStats${stats.config.coin}, .yourWorkers${stats.config.coin}, .userChart${stats.config.coin}`).hide();
        }

        $('#yourStatsInput' + stats.config.coin).keyup(function (e) {
            if (e.keyCode === 13)
                $(`#lookUp${stats.config.coin}`).click();
        });

        // Handle sort on workers table
        //$(`#workersReport${stats.config.coin} th.sort`).on('click', sortTable);
        /*
        $(`.workerStats th.sort`)
            .on('click', sortTable);
        */

        // Load more payments button
        $(`#loadMorePayments${stats.config.coin}`).click(function (xhrGetPayments) {
            if (xhrGetPayments[stats.config.coin])
                xhrGetPayments[stats.config.coin].abort();

            xhrGetPayments[stats.config.coin] = $.ajax({
                url: `${api}/get_payments`,
                data: {
                    time: $(`#paymentsReport_rows_${stats.config.coin}`).children().last().data('time'),
                    address: address
                },
                dataType: 'json',
                cache: 'false',
                success: function (data) {
                    $.statsRenderPayments(data, stats);
                }
            });
        });
    };
    
    
    $.statsRenderPayments = function (paymentsResults, stats) {
        let $paymentsRows = $(`#paymentsReport_rows_${stats.config.coin}`);
        let lastPaymentDate = null;
        let summaryData = {
            date: null,
            time: null,
            count: 0,
            amount: 0
        };

        for (let i = 0; i < paymentsResults.length; i += 2) {
            let payment = $.statsParsePayment(paymentsResults[i + 1], paymentsResults[i]);
            let paymentJson = JSON.stringify(payment);
            let paymentElement = $.statsGetPaymentRowElement(payment, paymentJson, stats);
            let paymentDate = new Date(parseInt(payment.time) * 1000).toLocaleDateString();
            if (!lastPaymentDate || lastPaymentDate && paymentDate !== lastPaymentDate) {
                summaryData = {
                    date: paymentDate,
                    time: payment.time,
                    count: 0,
                    amount: 0
                };
            }

            let existingRow = document.getElementById(`paymentRow${stats.config.coin}${payment.time}`);
            if (existingRow && existingRow.getAttribute('data-json') !== paymentJson) {
                $(existingRow).replaceWith($.statsGetPaymentRowElement(payment, paymentJson, stats));
            } else if (!existingRow) {
                let inserted = false;
                let rows = $paymentsRows.children().get();
                for (let f = 0; f < rows.length; f++) {
                    let pTime = parseInt(rows[f].getAttribute('data-time'));
                    if (pTime && pTime < payment.time) {
                        inserted = true;
                        $(rows[f]).before(paymentElement);
                        break;
                    }
                }
                if (!inserted) {
                    $paymentsRows.append(paymentElement);
                }
            }

            summaryData.count++;
            summaryData.amount += parseInt(payment.amount);

            let summaryJson = JSON.stringify(summaryData);
            let summaryElement = $.statsGetSummaryRowElement(summaryData, summaryJson, stats);
            let existingSummary = document.getElementById(`summaryRow${stats.config.coin}${summaryData.date}`);
            
            if (existingSummary && existingSummary.getAttribute('data-json') !== summaryJson) {
                $(existingSummary).replaceWith(summaryElement);
            } else if (!existingSummary) {
                let inserted = false;
                let rows = $paymentsRows.children().get();
                for (let f = 0; f < rows.length; f++) {
                    let pTime = parseInt(rows[f].getAttribute('data-time'));
                    if (pTime && pTime === summaryData.time) {
                        inserted = true;
                        $(rows[f]).before(summaryElement);
                        break;
                    }
                }
                if (!inserted) {
                    $paymentsRows.append(summaryElement);
                }
            }
            lastPaymentDate = paymentDate;
        }
    };


    $.statsFetchAddressStats = function (longPoll, stats, api, xhrAddressPoll) {
        let address = $.getCurrentAddress(stats.config.coin);
        xhrAddressPoll[stats.config.coin] = $.ajax({
            url: `${api}/stats_address`,
            data: {
                address: address,
                longpoll: longPoll
            },
            dataType: 'json',
            cache: 'false',
            success: function (data) {
                if (!data.stats) {
                    $(`.yourStats${stats.config.coin}, .yourWorkers${stats.config.coin}, .userChart${stats.config.coin}`)
                        .hide();
                    $(`#addressError${stats.config.coin}`)
                        .text(data.error)
                        .show();
                    docCookies.setItem(`mining_address_${stats.config.coin}`, '', Infinity);
                    loadLiveStats(true);
                    return;
                }
                
                $(`#addressError${stats.config.coin}`).hide();
                
                if (data.stats.lastShare) {
                    $(`#yourLastShare${stats.config.coin}`).timeago('update', new Date(parseInt(data.stats.lastShare) * 1000).toISOString());
                }
                else {
                    $.updateText(`yourLastShare${stats.config.coin}`, 'Never');
                }


                $.updateText(`yourHashrateHolder${stats.config.coin}`, ($.getReadableHashRateString(data.stats.hashrate) || '0 H') + '/sec');
                if ('hashrate_1h' in data.stats) {
                    $(`#minerAvgHR${stats.config.coin}`).show();
                    $.updateText(`yourHR1h${stats.config.coin}`, ($.getReadableHashRateString(data.stats.hashrate_1h) || '0 H') + '/s');
                    $.updateText(`yourHR6h${stats.config.coin}`, ($.getReadableHashRateString(data.stats.hashrate_6h) || '0 H') + '/s');
                    $.updateText(`yourHR24h${stats.config.coin}`, ($.getReadableHashRateString(data.stats.hashrate_24h) || '0 H') + '/s');
                } else {
                    $(`#minerAvgHR${stats.config.coin}`).hide();
                }

                let totalCoins = data.stats.paid;
                let last24hCoins = 0;
                let last7dCoins = 0;

                for (let i = 0; i < data.payments.length; i += 2) {
                    let payment = $.statsParsePayment(data.payments[i + 1], data.payments[i]);
                    let paymentDate = new Date(parseInt(payment.time) * 1000);
                    let daysDiff = moment().diff(moment(paymentDate), 'days');

                    if (daysDiff < 1) {
                        last24hCoins = last24hCoins + parseInt(payment.amount);
                    }

                    if (daysDiff < 7) {
                        last7dCoins = last7dCoins + parseInt(payment.amount);
                    }
                }


                // $.getJSON(`https://api.coingecko.com/api/v3/coins/${stats.config.coin.toLowerCase()}?sparkline=true`, function() {})
                //     .done(data => {
                //         let paidTotalUSD = getReadableCoin(stats, totalCoins, 2, true) * data.market_data.current_price.usd;
                //         let paid24hUSD = getReadableCoin(stats, last24hCoins, 2, true) * data.market_data.current_price.usd;
                //         let paid7dUSD = getReadableCoin(stats, last7dCoins, 2, true) * data.market_data.current_price.usd;

                //         $.updateText(`yourPaid${stats.config.coin}`, `${getReadableCoin(stats, totalCoins)} - $${paidTotalUSD.toFixed(2)}`);
                //         $.updateText(`paid24h${stats.config.coin}`, `${getReadableCoin(stats, last24hCoins)} - $${paid24hUSD.toFixed(2)}`);
                //         $.updateText(`paid7d${stats.config.coin}`, `${getReadableCoin(stats, last7dCoins)} - $${paid7dUSD.toFixed(2)}`);
                //     })
                //     .fail(() => {
                $.updateText(`yourPaid${stats.config.coin}`, $.getReadableCoin(stats, totalCoins));
                $.updateText(`paid24h${stats.config.coin}`, $.getReadableCoin(stats, last24hCoins));
                $.updateText(`paid7d${stats.config.coin}`, $.getReadableCoin(stats, last7dCoins));
                //     })

                $.updateText(`yourHashes${stats.config.coin}`, $.formatNumber((data.stats.hashes || 0).toString(), ','));
                //$.updateText(`yourPaid${stats.config.coin}`, getReadableCoin(stats, data.stats.paid));
                $.updateText(`yourPendingBalance${stats.config.coin}`, $.getReadableCoin(stats, data.stats.balance));

                let userRoundHashes = parseInt(data.stats.roundHashes || 0);
                let poolRoundHashes = parseInt(stats.pool.roundHashes || 0);
                let userRoundScore = parseFloat(data.stats.roundScore || 0);
                let poolRoundScore = parseFloat(stats.pool.roundScore || 0);
                let lastReward = parseFloat(stats.lastblock.reward || 0);
                let poolFee = stats.config.fee;

                if (Object.keys((stats.config.donation)).length) {
                    let totalDonation = 0;
                    let ldon = stats.config.donation;
                    for (let i in ldon) {
                        totalDonation += ldon[i];
                    }
                    poolFee += totalDonation;
                }

                let transferFee = stats.config.transferFee;
                let share_pct = userRoundHashes * 100 / poolRoundHashes;
                let score_pct = userRoundScore * 100 / poolRoundScore;
                $.updateText(`yourRoundShareProportion${stats.config.coin}`, isNaN(share_pct) ? 0.0 : Math.round(share_pct * 1000) / 1000);
                $.updateText(`yourRoundScoreProportion${stats.config.coin}`, isNaN(score_pct) ? 0.0 : Math.round(score_pct * 1000) / 1000);
                if (!lastStats.config.slushMiningEnabled) {
                    $(`#slush_round_info${stats.config.coin}`).hide();
                }

                let payoutEstimatePct = parseFloat(userRoundHashes * 100 / poolRoundHashes);
                let payoutEstimate = Math.round(lastReward * (payoutEstimatePct / 100));
                if (transferFee) payoutEstimate = payoutEstimate - transferFee;
                if (payoutEstimate < 0) {
                    payoutEstimate = 0;
                }

                $.updateText(`yourPayoutEstimate${stats.config.coin}`, $.getReadableCoin(stats, payoutEstimate));
                $.statsRenderPayments(data.payments, stats);

                if (data.workers && data.workers.length > 0) {
                    $.statsRenderWorkers(data.workers, stats);
                    $(`.yourWorkers${stats.config.coin}`).show();
                }

                $(`.yourStats${stats.config.coin}`).show();
                $.statsCreateCharts(data, stats);

            },
            error: function (e) {
                if (e.statusText === 'abort') return;
                $(`#addressError${stats.config.coin}`)
                    .text('Connection error')
                    .show();

                if (addressTimeout[stats.config.coin])
                    clearTimeout(addressTimeout[stats.config.coin]);

                addressTimeout[stats.config.coin] = setTimeout(function () {
                    $.statsFetchAddressStats(false, stats, mergedApis[stats.config.coin].api);
                }, 2000);
            }
        });
    };
    
    
    $.statsParsePayment = function(time, serializedPayment) {
        let parts = serializedPayment.split(':');
        return {
            time: parseInt(time),
            hash: parts[0],
            amount: parts[1],
            fee: parts[2],
            mixin: parts[3],
            recipients: parts[4]
        };
    };
    
    
    $.statsGetPaymentRowElement = function(payment, jsonString, stats) {
        let row = document.createElement('tr');
        row.setAttribute('data-json', jsonString);
        row.setAttribute('data-time', payment.time);
        row.setAttribute('id', 'paymentRow' + stats.config.coin + payment.time);

        row.innerHTML = $.statsGetPaymentCells(payment, stats);

        return row;
    };


    $.statsGetPaymentCells = function(payment, stats) {
        return '<td>' + $.formatDate(payment.time) + '</td>' +
            '<th>' + $.formatPaymentLink(payment.hash, stats) + '</th>' +
            '<td class="text-right">' + $.getReadableCoin(stats, payment.amount) + '</td>' +
            '<td class="text-center">' + payment.mixin + '</td>';
    };
    
    
    $.statsGetSummaryRowElement = function(summary, jsonString, stats) {
        let row = document.createElement('tr');
        row.setAttribute('data-json', jsonString);
        row.setAttribute('data-date', summary.date);
        row.setAttribute('id', 'summaryRow' + stats.config.coin + summary.date);
        row.setAttribute('class', 'summary');

        row.innerHTML = $.statsGetSummaryCells(summary, stats);

        return row;
    };
    
    
    $.statsGetSummaryCells = function(summary, stats) {
        let text = $.getTranslation('paymentSummaryMulti') ? $.getTranslation('paymentSummaryMulti') : 'On %DATE% you have received %AMOUNT% in %COUNT% payments';
        if (summary.count <= 1) text = $.getTranslation('paymentSummarySingle') ? $.getTranslation('paymentSummarySingle') : 'On %DATE% you have received %AMOUNT%';
        text = text.replace(/%DATE%/g, summary.date);
        text = text.replace(/%COUNT%/g, summary.count);
        text = text.replace(/%AMOUNT%/g, $.getReadableCoin(stats, summary.amount));
        return '<th colspan="4"><code>' + text + '</code></th>';
    };


    $.statsRenderWorkers = function(workersData, stats) {
        workersData = workersData.sort($.statsSortWorkers);

        let $workersRows = $(`#workersReport_rows_${stats.config.coin}`);

        for (let i = 0; i < workersData.length; i++) {
            let existingRow = document.getElementById(`workerRow${stats.config.coin}_${$.statsGetWorkerRowId(workersData[i].name)}`);
            if (!existingRow) {
                $workersRows.empty();
                break;
            }
        }

        let have_avg_hr = false;

        for (let i = 0; i < workersData.length; i++) {
            let worker = workersData[i];
            if (Date.now() / 1000 - parseInt(worker.lastShare) > 2 * 86400) continue;
            if (!have_avg_hr && 'hashrate_1h' in worker) have_avg_hr = true;
            let workerJson = JSON.stringify(worker);
            let existingRow = document.getElementById(`workerRow${stats.config.coin}_${$.statsGetWorkerRowId(worker.name)}`);
            if (existingRow && existingRow.getAttribute('data-json') !== workerJson) {
                $(existingRow).replaceWith($.statsGetWorkerRowElement(worker, workerJson, stats));
            } else if (!existingRow) {
                let workerElement = $.statsGetWorkerRowElement(worker, workerJson, stats);
                $workersRows.append(workerElement);
            }
        }
        if (!have_avg_hr) $(`#workersReport${stats.config.coin} .avghr`).hide();
        else $(`#workersReport${stats.config.coin} .avghr`).show();
    };
    
    
    $.statsGetWorkerRowElement = function(worker, jsonString, stats) {
        let row = document.createElement('tr');
        row.setAttribute('data-json', jsonString);
        row.setAttribute('data-name', worker.name);
        row.setAttribute('id', 'workerRow' + stats.config.coin + '_' + $.statsGetWorkerRowId(worker.name));

        row.innerHTML = $.statsGetWorkerCells(worker);

        return row;
    };


    $.statsGetWorkerCells = function(worker) {
        let hashrate = worker.hashrate ? worker.hashrate : 0;
        let hashrate1h = worker.hashrate_1h || 0;
        let hashrate6h = worker.hashrate_6h || 0;
        let hashrate24h = worker.hashrate_24h || 0;
        let lastShare = worker.lastShare ? worker.lastShare : 0;
        let hashes = (worker.hashes || 0).toString();
        let status = (hashrate <= 0) ? 'error' : 'ok';

        return '<td class="col1" data-sort="' + status + '"><i class="fa fa-' + (status === 'ok' ? 'check status-ok' : 'times status-error') + '"></i></td>' +
            '<td class="col2" data-sort="' + (worker.name !== 'undefined' ? worker.name : '') + '">' + (worker.name !== 'undefined' ? worker.name : '<em>Undefined</em>') + '</td>' +
            '<td class="col3" data-sort="' + hashrate + '">' + $.getReadableHashRateString(hashrate) + '/s</td>' +
            '<td class="col4 avghr" data-sort="' + hashrate1h + '">' + $.getReadableHashRateString(hashrate1h) + '/s</td>' +
            '<td class="col5 avghr" data-sort="' + hashrate6h + '">' + $.getReadableHashRateString(hashrate6h) + '/s</td>' +
            '<td class="col6 avghr" data-sort="' + hashrate24h + '">' + $.getReadableHashRateString(hashrate24h) + '/s</td>' +
            '<td class="col4" data-sort="' + lastShare + '">' + (lastShare ? $.timeago(new Date(parseInt(lastShare) * 1000).toISOString()) : 'Never') + '</td>' +
            '<td class="text-right" data-sort="' + hashes + '">' + $.formatNumber(hashes, ',') + '</td>';
    };


    $.statsSortWorkers = function(a, b) {
        let aName = a.name.toLowerCase();
        let bName = b.name.toLowerCase();
        return ((aName < bName) ? -1 : ((aName > bName) ? 1 : 0));
    };
    
    
    $.statsGetWorkerRowId = function(workerName) {
        let id = btoa(workerName);
        id = id.replace(/=/, '');
        return id;
    };
    
    
    $.statsCreateCharts = function(data, stats) {
        if (data.hasOwnProperty("charts")) {
            let graphData = {
                hashrate: $.statsGetGraphData(stats, data.charts.hashrate),
                payments: $.statsGetGraphData(stats, data.charts.payments, true)
            };

            for (let graphType in graphData) {
                if (graphData[graphType].values.length > 1) {
                    let settings = jQuery.extend({}, graphSettings);
                    settings.tooltipValueLookups = {
                        names: graphData[graphType].names
                    };
                    let $chart = $(`[data-chart=user_${graphType}_${stats.config.coin}]`).show().find('.chart');
                    $chart.sparkline(graphData[graphType].values, settings);
                }
            }
        }
    };
    
    
    $.statsGetGraphData = function(stats, rawData, fixValueToCoins) {
        let graphData = {
            names: [],
            values: []
        };

        if (rawData) {
            for (let i = 0, xy; xy = rawData[i]; i++) {
                graphData.names.push(new Date(xy[0] * 1000)
                    .toLocaleString());
                graphData.values.push(fixValueToCoins ? $.getReadableCoin(stats, xy[1], null, true, true) : xy[1]);
            }
        }

        return graphData;
    };


    $.statsRunOnce = function() {
        $('#blocksTabs a').click(function (e) {
            e.preventDefault();
            $(this).tab('show');
            let coin = $(this).data('coin');
            $(`#lookUp${coin}`).click();
        });
        return true;
    };
})(jQuery);