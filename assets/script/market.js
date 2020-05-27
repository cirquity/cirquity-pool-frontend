(function ($) {
    let isRunOnce = false;
    let chartsInitialized = {};
    let loadedData = {};
    let intervalChartsUpdate = {};
    let xhrMarketGets = {};
    let marketPrices = {};
    let currencyPairs = {};
    let priceSource = 'cryptonator';
    let priceCurrency = 'USD';

    $(function () {
        currentPage = {
            destroy: function () {},
            update: function (updateKey) {
                $.updateSettings(updateKey);
            }
        };

        let isReadyStats = setInterval(function () {
            if (lastStats) {
                $.marketInitTemplate(isRunOnce, chartsInitialized, loadedData, marketPrices, intervalChartsUpdate, currencyPairs, xhrMarketGets);
                $.loadTranslations();

                clearInterval(isReadyStats);
            }
        }, 10);

        if (typeof cryptonatorWidget !== 'undefined' && typeof marketCurrencies === 'undefined') {
            let marketCurrencies = cryptonatorWidget;
        }
    });


    $.updateSettings = function (updateKey) {};


    $.marketInitTemplate = function(runOnce, chartsInitialized, loadedData, marketPrices, intervalChartsUpdate, currencyPairs, xhrMarketGets) {
        priceSource = lastStats.config.priceSource || priceSource;
        priceCurrency = lastStats.config.priceCurrency || priceCurrency;

        let coin = lastStats.config.coin;
        if ($(`#blocksTabs li:contains(${coin})`).length === 0) {
            chartsInitialized[coin] = false;
            loadedData[coin] = false;
            marketPrices[coin] = {};
            let template = $('#siblingTabTemplate').html();
            Mustache.parse(template);
            let rendered = Mustache.render(template, {
                coin: lastStats.config.coin,
                symbol: `(${lastStats.config.symbol})`,
                active: 'active'
            });
            $('#blocksTabs').append(rendered);

            let template1 = $('#siblingMarketTemplate').html();
            Mustache.parse(template1);
            let rendered1 = Mustache.render(template1, {
                coin: coin,
                active: 'active'
            });
            $(`#blocksContent`).append(rendered1);

            let template2 = $('#siblingCalculatorTemplate').html();
            Mustache.parse(template2);
            let rendered2 = Mustache.render(template2, {
                coin: coin
            });
            $(`#calculatorInner`).append(rendered2);

            $.updateText(`priceChartCurrency${lastStats.config.coin}`, priceCurrency);
            $.updateText(`profitChartProfit${lastStats.config.coin}`, priceCurrency);

            if (lastStats.charts && !chartsInitialized[coin]) {
                intervalChartsUpdate[coin] = setInterval($.marketCreateCharts(lastStats), 60 * 1000);
                $.marketCreateCharts(lastStats);
                chartsInitialized[coin] = true;
            }
        }

        $.marketLoadData(api, lastStats, loadedData, currencyPairs, xhrMarketGets, marketPrices);


        Object.keys(mergedStats).forEach(key => {
            if ($(`#blocksTabs li:contains(${key})`).length === 0) {
                chartsInitialized[key] = false;
                loadedData[key] = false;
                marketPrices[key] = {};
                let template1 = $('#siblingMarketTemplate').html();
                Mustache.parse(template1);
                let rendered1 = Mustache.render(template1, {
                    coin: key
                });
                $('#blocksContent').append(rendered1);

                let template = $('#siblingTabTemplate').html();
                Mustache.parse(template);
                let rendered = Mustache.render(template, {
                    coin: key,
                    symbol: `(${mergedStats[key].config.symbol})`
                });
                $('#blocksTabs').append(rendered);
            }

            $.updateText(`priceChartCurrency${mergedStats[key].config.coin}`, priceCurrency);
            $.updateText(`profitChartProfit${mergedStats[key].config.coin}`, priceCurrency);

            $.marketLoadData(mergedApis[key].api, mergedStats[key], loadedData, currencyPairs, xhrMarketGets, marketPrices);

            if (mergedStats[key].charts && !chartsInitialized[key]) {
                intervalChartsUpdate[key] = setInterval($.marketCreateCharts(mergedStats[key]), 60 * 1000);
                $.marketCreateCharts(mergedStats[key]);
                chartsInitialized[key] = true;
            }
        });

        $.marketCalcEstimateProfit(marketPrices);

        $.sortElementList($(`#blocksTabs`), $(`#blocksTabs > li`), mergedStats);

        if (!runOnce) {
            isRunOnce = $.marketRunOnce();
        }
    };


    $.marketCalcEstimateProfit = function(marketPrices) {
        let rateUnit = Math.pow(1000, parseInt($('#calcHashUnit').data('mul')));
        let hashRate = parseFloat($('#calcHashRate').val()) * rateUnit;
        let coin = lastStats.config.coin;
        try {
            if ($(`#calcHashAmount${coin}`).length === 0) {
                let template = $(`#calcHashResultTemplate`).html();
                Mustache.parse(template);
                let rendered = Mustache.render(template, {
                    coin: coin
                });

                $(rendered).insertAfter(`#calcHashHolder`);
            }
            let profit = (hashRate * 86400 / lastStats.network.difficulty) * lastStats.lastblock.reward;
            if (profit) {
                $.updateText(`calcHashAmount${coin}1`, $.getReadableCoin(lastStats, profit));
                $.updateText(`calcHashAmount${coin}2`, $.marketGetCurrencyPriceText(lastStats, profit, marketPrices));
                //return;
            } else {
                $.updateText(`calcHashAmount${coin}1`, '');
                $.updateText(`calcHashAmount${coin}2`, '');
            }
        } catch (e) {
            $.updateText(`calcHashAmount${coin}1`, '');
            $.updateText(`calcHashAmount${coin}2`, '');
        }


        Object.keys(mergedStats).forEach(key => {
            try {
                if ($(`#calcHashAmount${key}`).length === 0) {
                    let template = $(`#calcHashResultTemplate`).html();
                    Mustache.parse(template);
                    let rendered = Mustache.render(template, {
                        coin: key
                    });
                    $(rendered).insertAfter(`#calcHashHolder`);
                }

                let profit = (hashRate * 86400 / mergedStats[key].network.difficulty) * mergedStats[key].lastblock.reward;
                if (profit) {
                    $.updateText(`calcHashAmount${key}1`, $.getReadableCoin(mergedStats[key], profit));
                    $.updateText(`calcHashAmount${key}2`, $.marketGetCurrencyPriceText(mergedStats[key], profit, marketPrices));
                } else {
                    $.updateText(`calcHashAmount${key}1`, '');
                    $.updateText(`calcHashAmount${key}2`, '');
                }
            } catch (e) {
                $.updateText(`calcHashAmount${key}1`, '');
                $.updateText(`calcHashAmount${key}2`, '');
            }
        });
    };


    $.marketGetCurrencyPriceText = function(stats, coinsRaw, marketPrices) {
        if (!priceCurrency || !marketPrices[stats.config.coin] || !marketPrices[stats.config.coin][priceCurrency]) return;
        let priceInCurrency = (Math.trunc($.getReadableCoin(stats, coinsRaw, 2, true, true) * marketPrices[stats.config.coin][priceCurrency] * 100) / 100);
        return priceInCurrency + ' ' + priceCurrency;
    };


    $.marketLoadData = function(api, stats, loadedData, currencyPairs, xhrMarketGets, marketPrices) {
        if (loadedData[stats.config.coin]) return;

        if (typeof marketCurrencies !== 'undefined' && marketCurrencies.length > 0) {
            setInterval($.marketUpdate(api, stats, currencyPairs, xhrMarketGets, marketPrices), 300000);
        } else {
            $(`#marketInfos${stats.config.coin}`).hide();
        }

        loadedData[stats.config.coin] = true;
    };


    $.marketUpdate = function(api, stats, currencyPairs, xhrMarketGets, marketPrices) {
        let marketInfo = $(`#marketInfos${stats.config.coin}`);

        if (typeof marketCurrencies === 'undefined' || marketCurrencies.length === 0) return;

        currencyPairs[stats.config.coin] = [];

        for (let i = 0; i < marketCurrencies.length; i++) {
            currencyPairs[stats.config.coin].push(marketCurrencies[i].replace('{symbol}', stats.config.symbol).toUpperCase());
        }

        if (xhrMarketGets[stats.config.coin]) xhrMarketGets[stats.config.coin].abort();

        xhrMarketGets[stats.config.coin] = $.ajax({
            url: api + '/get_market',
            data: {
                tickers: currencyPairs[stats.config.coin]
            },
            dataType: 'json',
            cache: 'false',
            success: function (data) {
                if (!data || data.length === 0) {
                    $(`#marketInfos${stats.config.coin}`).hide();
                    return;
                }

                marketInfo.empty();

                for (let i in data) {
                    if (!data[i] || !data[i].ticker) continue;
                    let ticker = data[i].ticker;
                    let tickerParts = ticker.split('-');
                    let tickerBase = tickerParts[0] || null;
                    let tickerTarget = tickerParts[1] || null;

                    let price = data[i].price;
                    if (!price || price === 0) continue;

                    let dataSource = data[i].source;

                    $.marketRenderPrice(tickerBase, tickerTarget, price, dataSource, stats, marketPrices);
                }

                marketInfo.show();
            },
            error: function () {
                marketInfo.hide();
            }
        });
    };


    $.marketRenderPrice = function(base, target, price, source, stats, marketPrices) {
        let icon = '<i class="far fa-money-bill-alt"></i>';

        if (target === 'BTC') icon = '<i class="fab fa-btc"></i>';
        if (target === 'BCH') icon = '<i class="fab fa-btc"></i>';
        if (target === 'USD') icon = '<i class="fas fa-dollar-sign"></i>';
        if (target === 'CAD') icon = '<i class="fas fa-dollar-sign"></i>';
        if (target === 'EUR') icon = '<i class="fas fa-euro-sign"></i>';

        if (base === stats.config.symbol.toUpperCase()) {
            marketPrices[stats.config.coin][target] = price;
        }

        if (target === 'USD' || target === 'CAD' || target === 'EUR' || target === 'GBP' || target === 'JPY') {
            price = price.toFixed(4);
        } else {
            price = price.toFixed(8);
        }

        let sourceURL = null;
        if (source === 'cryptonator') sourceURL = 'https://www.cryptonator.com/';
        else if (source === 'altex') sourceURL = 'https://altex.exchange/';
        else if (source === 'crex24') sourceURL = 'https://crex24.com/';
        else if (source === 'cryptopia') sourceURL = 'https://www.cryptopia.co.nz/';
        else if (source === 'stocks.exchange') sourceURL = 'https://stocks.exchange/';
        else if (source === 'tradeogre') sourceURL = 'https://tradeogre.com/';
        else if (source === 'coingecko') sourceURL = 'https://coingecko.com/';

        source = source.charAt(0).toUpperCase() + source.slice(1);
        if (sourceURL) source = '<a href="' + sourceURL + '" target="_blank" rel="nofollow">' + source + '</a>';

        $(`#marketInfos${stats.config.coin}`).append(
            '<div class="col-4 mb-4">' +
            '    <div class="card shadow-light">' +
            '        <div class="card-body">' +
            '            <div class="list-group list-group-flush">' +
            '                <div class="list-group-item d-flex align-items-center">' +
            '                    <div class="mr-auto">' +
            '                        <span class="icon">' + icon + '</span>' +
            '                        <h5 class="font-weight-bold mb-1">' + base + ' to ' + target + '</h5>' +
            '                        <p class="font-size-sm text-muted mb-0">' + price + '</p>' +
            '                        <small class="font-size-sm text-muted mb-0">Source: ' + source + '</small>' +
            '                    </div>' +
            '                </div>' +
            '            </div>' +
            '        </div>' +
            '    </div>'+
            '</div>'
        );
    };


    $.marketCreateCharts = function(stats) {
        if (!stats || !stats.charts) return;
        let data = stats.charts;
        let graphData = {
            price: $.marketGetGraphData(data.price),
            profit: $.marketGetGraphData(data.profit)
        };

        for (let graphType in graphData) {
            if (graphData[graphType].values.length > 1) {
                let $chart = $(`#chart${stats.config.coin}_${graphType}`);
                let bgcolor = null,
                    bordercolor = null,
                    borderwidth = null;
                let colorelem = $chart.siblings('a.chart-style');

                if (colorelem.length === 1) {
                    bgcolor = colorelem.css('background-color');
                    bordercolor = colorelem.css('border-left-color');
                    borderwidth = parseFloat(colorelem.css('width'));
                }

                let chartObj = new Chart(document.getElementById(`chart${stats.config.coin}_${graphType}`), {
                    type: 'line',
                    data: {
                        labels: graphData[graphType].names,
                        datasets: [{
                            data: graphData[graphType].values,
                            dataType: graphType,
                            fill: true,
                            backgroundColor: 'rgba(3, 169, 244, .4)',
                            borderColor: '#03a9f4',
                            borderWidth: 2
                        }]
                    },
                    options: {
                        animation: false,
                        responsive: true,
                        maintainAspectRatio: false,
                        legend: {
                            display: false
                        },
                        elements: {
                            point: {
                                radius: 0,
                                hitRadius: 10,
                                hoverRadius: 5
                            }
                        },
                        scales: {
                            xAxes: [{
                                display: false,
                                ticks: {
                                    display: false
                                },
                                gridLines: {
                                    display: false
                                }
                            }],
                            yAxes: [{
                                display: false,
                                ticks: {
                                    display: false,
                                    beginAtZero: true,
                                    userCallback: function (label, index, labels) {
                                        if (Math.floor(label) === label) return label;
                                    }
                                },
                                gridLines: {
                                    display: false
                                }
                            }]
                        },
                        layout: {
                            padding: {
                                top: 5,
                                left: 10,
                                right: 10,
                                bottom: 10
                            }
                        },
                        tooltips: {
                            callbacks: {
                                label: function (tooltipItem, data) {
                                    let dataType = data.datasets[tooltipItem.datasetIndex].dataType || '';
                                    let label = tooltipItem.yLabel;
                                    if (dataType === 'price') label = parseFloat(tooltipItem.yLabel).toFixed(4);
                                    else if (dataType === 'profit') label = parseFloat(tooltipItem.yLabel).toFixed(10);
                                    return ' ' + label;
                                }
                            }
                        }
                    }
                });
                $chart.closest('.marketChart').show();
            }
        }
    };


    $.marketGetGraphData = function(rawData) {
        let graphData = {
            names: [],
            values: []
        };
        if (rawData) {
            for (let i = 0, xy; xy = rawData[i]; i++) {
                graphData.names.push(new Date(xy[0] * 1000).toLocaleString());
                graphData.values.push(xy[1]);
            }
        }
        return graphData;
    };


    $.marketRunOnce = function() {
        /**
         * Hash Profitability Calculator
         **/

        // Automatically update profit calculation on key press
        $('#calcHashRate').keyup((e) => {
            $.marketCalcEstimateProfit(marketPrices)
        }).change((e) => {
            $.marketCalcEstimateProfit(marketPrices)
        });


        // Click on button
        $('#calcHashUnits > a').click(function (e) {
            e.preventDefault();
            $('#calcHashUnit').text($(this).text()).data('mul', $(this).data('mul'));
            $.marketCalcEstimateProfit(marketPrices);
        });

        $('#blocksTabs a').click(function (e) {
            e.preventDefault();
            $(this).tab('show');
        });

        return true;
    };
})(jQuery);
