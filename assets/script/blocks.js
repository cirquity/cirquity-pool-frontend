(function ($) {
    let isRunOnce = false;
    let isBlockPageInit = false;
    let displayedChart = {};
    let xhrGetBlocks = {};

    $(function () {
        currentPage = {
            destroy: function () {},
            update: function (updateKey) {
                if (isBlockPageInit) {
                    $.updateBlocks(updateKey);
                }
            }
        };

        let isReadyStats = setInterval(function () {
            if (lastStats) {
                $.blocksInitTemplate(isRunOnce, displayedChart, xhrGetBlocks);
                $.loadTranslations();

                clearInterval(isReadyStats);
            }
        }, 10);
    });


    $.updateBlocks = function (updateKey) {
        let stats = updateKey === parentCoin ? lastStats : mergedStats[updateKey];
        if (stats) {
            displayedChart[updateKey] = false;
            if (stats.charts.blocks) {
                $.blocksGenerateChart(stats, displayedChart);
            }
            $.blocksRenderBlocks(stats.pool.blocks, stats);
        }
    };


    $.blocksInitTemplate = function (runOnce, displayedChart, xhrGetBlocks) {
        let coin = lastStats.config.coin;
        if ($(`#blocksTabs li:contains(${coin})`).length === 0) {
            let template1 = $('#siblingTemplate').html();
            Mustache.parse(template1);
            let rendered1 = Mustache.render(template1, {
                coin: lastStats.config.coin,
                active: 'active'
            });
            $('#blocksContent').append(rendered1);

            let template = $('#siblingTabTemplate').html();
            Mustache.parse(template);
            let rendered = Mustache.render(template, {
                coin: lastStats.config.coin,
                symbol: `(${lastStats.config.symbol})`,
                active: 'active'
            });
            $('#blocksTabs').append(rendered);

            $.blocksSetup(api, lastStats, xhrGetBlocks);
        }

        $.updateText(`blocksTotal${coin}`, lastStats.pool.totalBlocks.toString());
        if (lastStats.pool.lastBlockFound) {
            const d = new Date(parseInt(lastStats.pool.lastBlockFound)).toISOString();
            $(`#lastBlockFound${coin}`).timeago('update', d);
        } else {
            $(`#lastBlockFound${coin}`).removeAttr('title').data('ts', '').update('Never');
        }

        $.updateText(`blocksTotalSolo${coin}`, lastStats.pool.totalBlocksSolo.toString());
        if (lastStats.pool.lastBlockFoundSolo) {
            const d = new Date(parseInt(lastStats.pool.lastBlockFoundSolo)).toISOString();
            $(`#lastBlockFoundSolo${coin}`).timeago('update', d);
        } else {
            $(`#lastBlockFoundSolo${coin}`).removeAttr('title').data('ts', '').update('Never');
        }

        $.updateText(`blocksMaturityCount${coin}`, lastStats.config.depth.toString());

        let avg = $.formatLuck(lastStats.pool.totalDiff, lastStats.pool.totalShares) + '<small class="text-success">PROP</small> / ' + $.formatLuck(lastStats.pool.totalDiffSolo, lastStats.pool.totalSharesSolo) + '<small class="text-success">SOLO</small>';
        $(`#averageLuck${coin}`).html(avg);

        displayedChart[lastStats.config.coin] = false;
        if (lastStats.charts.blocks) {
            $.blocksGenerateChart(lastStats, displayedChart);
        }

        $.blocksRenderBlocks(lastStats.pool.blocks, lastStats);

        Object.keys(mergedStats).forEach(key => {
            if ($(`#blocksTabs li:contains(${key})`).length === 0) {
                let template1 = $('#siblingTemplate').html();
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

                $.blocksSetup(mergedApis[key].api, mergedStats[key]);
            }

            $.updateText(`blocksTotal${key}`, mergedStats[key].pool.totalBlocks.toString());
            if (mergedStats[key].pool.lastBlockFound) {
                const d = new Date(parseInt(mergedStats[key].pool.lastBlockFound)).toISOString();
                $(`#lastBlockFound${key}`).timeago('update', d);
            } else {
                $(`#lastBlockFound${key}`).removeAttr('title').data('ts', '').update('Never');
            }

            $.updateText(`blocksTotalSolo${key}`, mergedStats[key].pool.totalBlocksSolo.toString());
            if (mergedStats[key].pool.lastBlockFoundSolo) {
                const d = new Date(parseInt(mergedStats[key].pool.lastBlockFoundSolo)).toISOString();
                $(`#lastBlockFoundSolo${key}`).timeago('update', d);
            } else {
                $(`#lastBlockFoundSolo${key}`).removeAttr('title').data('ts', '').update('Never');
            }

            $.updateText(`blocksMaturityCount${key}`, mergedStats[key].config.depth.toString());

            $(`#averageLuck${key}`).html($.formatLuck(mergedStats[key].pool.totalDiff, mergedStats[key].pool.totalShares));
            displayedChart[key] = false;
            if (mergedStats[key].charts.blocks) {
                $.blocksGenerateChart(mergedStats[key], displayedChart);
            }
            $.blocksRenderBlocks(mergedStats[key].pool.blocks, mergedStats[key]);
        });

        $.sortElementList($(`#blocksTabs`), $(`#blocksTabs > div`), mergedStats);
        if (!runOnce) {
            isRunOnce = $.blocksRunOnce();
        }

        isBlockPageInit = true;
    };


    $.blocksRenderBlocks = function(blocksResults, stats) {
        let $blocksRows = $(`#blocksReport${stats.config.coin}_rows`);

        for (let i = 0; i < blocksResults.length; i += 2) {
            let block = $.blocksParseBlock(blocksResults[i + 1], blocksResults[i], stats);
            let blockJson = JSON.stringify(block);

            let existingRow = document.getElementById(`blockRow${stats.config.coin}${block.height}`);
            if (existingRow && existingRow.getAttribute(`data-json`) !== blockJson) {
                $(existingRow).replaceWith($.blocksGetBlockRowElement(block, blockJson, stats));
            } else if (!existingRow) {
                let blockElement = $.blocksGetBlockRowElement(block, blockJson, stats);
                let inserted = false;
                let rows = $blocksRows.children().get();
                for (let f = 0; f < rows.length; f++) {
                    let bHeight = parseInt(rows[f].getAttribute(`data-height`));
                    if (bHeight < block.height) {
                        inserted = true;
                        $(rows[f]).before(blockElement);
                        break;
                    }
                }
                if (!inserted) {
                    $blocksRows.append(blockElement);
                }
            }
        }
    };


    $.blocksGetBlockRowElement = function(block, jsonString, stats) {
        let blockStatusClasses = {
            'pending': 'pending',
            'unlocked': 'unlocked',
            'orphaned': 'orphaned'
        };

        let row = document.createElement('tr');
        row.setAttribute(`data-json`, jsonString);
        row.setAttribute(`data-height`, block.height);
        row.setAttribute('id', `blockRow${stats.config.coin}${block.height}`);
        row.setAttribute('title', block.status);
        row.className = blockStatusClasses[block.status];

        let reward = "";
        let rowStatus = 'success';
        if (typeof block.reward == 'undefined') {
            reward = 'Waiting...';
            rowStatus = 'warning';
        } else {
            reward = $.getReadableCoin(stats, block.reward, null, true);

            if (reward === '0') {
                rowStatus = 'danger';
            }
        }

        row.innerHTML =
            '<td class="col1">' + $.timeago(new Date(parseInt(block.time) * 1000).toISOString()) + '</td>' +
            '<td class="col2">' + '<span class="badge badge-' + rowStatus + '">' + reward + '</span></td>' +
            '<td class="col3">' + block.height + '</td>' +
            '<td class="col4">' + block.difficulty + '</td>' +
            '<td class="col5">' + $.formatBlockLink(block.hash, stats) + '</td>' +
            '<td class="col5" title="Miners Address">' + block.address + '</td>' +
            '<td class="col6" title="' + block.shares + ' shares submitted">' + $.formatLuck(block.difficulty, block.shares, block.solo) + '</td>' +
            '<td class="col7">' + block.maturity + '</td>';

        return row;
    };


    $.blocksGenerateChart = function(data, displayedChart) {
        if (displayedChart[data.config.coin] || !data.charts.blocks || data.charts.blocks === "undefined" || !data.charts.blocksSolo || data.charts.blocksSolo === "undefined") return;
        let chartDays = data.config.blocksChartDays || null;
        let title = $.getTranslation('poolBlocks') ? $.getTranslation('poolBlocks') : 'Blocks found';
        if (chartDays) {
            if (chartDays === 1) title = $.getTranslation('blocksFoundLast24') ? $.getTranslation('blocksFoundLast24') : 'Blocks found in the last 24 hours';
            else title = $.getTranslation('blocksFoundLastDays') ? $.getTranslation('blocksFoundLastDays') : 'Blocks found in the last {DAYS} days';
            title = title.replace('{DAYS}', chartDays);
        }
        $.updateText(`blocksChartTitle${data.config.coin}`, title);
        let labels = [];
        let values = [];
        let valuesSolo = [];
        for (let key in data.charts.blocks) {
            let label = key;
            if (chartDays && chartDays === 1) {
                let keyParts = key.split(' ');
                label = keyParts[1].replace(':00', '');
            }
            labels.push(label);
            values.push(data.charts.blocks[key]);
        }
        for (let key in data.charts.blocksSolo) {
            valuesSolo.push(data.charts.blocksSolo[key]);
        }

        let $chart = $(`blocksChartObj${data.config.coin}`);
        let bgcolor = null,
            bordercolor = null,
            borderwidth = null;
        let colorelem = $chart.siblings('a.chart-style');
        if (colorelem.length === 1) {
            bgcolor = colorelem.css('background-color');
            bordercolor = colorelem.css('border-left-color');
            borderwidth = parseFloat(colorelem.css('width'));
        }
        if (bgcolor === null) bgcolor = 'rgba(3, 169, 244, .4)';
        if (bordercolor === null) bordercolor = '#03a9f4';
        if (borderwidth === null || isNaN(borderwidth)) borderwidth = 1;
        let chartElement = document.getElementById(`blocksChartObj${data.config.coin}`);
        if (!chartElement) return;
        let chart = new Chart(chartElement, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Prop Blocks',
                    data: values,
                    fill: false,
                    backgroundColor: bgcolor,
                    borderColor: bordercolor,
                    borderWidth: borderwidth
                },
                    {
                        label: 'Solo Blocks',
                        data: valuesSolo,
                        fill: false,
                        backgroundColor: 'rgba(0, 230, 64, 1)',
                        borderColor: bordercolor,
                        borderWidth: borderwidth
                    }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                legend: {
                    display: false
                },
                scales: {
                    yAxes: [{
                        ticks: {
                            beginAtZero: true,
                            userCallback: function (label, index, labels) {
                                if (Math.floor(label) === label) return label;
                            }
                        }
                    }],
                },
                layout: {
                    padding: {
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0
                    }
                }
            }
        });
        $(`#blocksChart${data.config.coin}`).show();
        displayedChart[data.config.coin] = true;
    };


    $.blocksParseBlock = function(height, serializedBlock, stats) {
        let parts = serializedBlock.split(':');
        let block = {};
        if (parts[0].includes('solo') || parts[0].includes('prop')) {
            block = {
                height: parseInt(height),
                solo: parts[0] === 'solo',
                address: parts[1],
                hash: parts[2],
                time: parts[3],
                difficulty: parseInt(parts[4]),
                shares: parseInt(parts[5]),
                orphaned: parts[6],
                reward: parts[7]
            };
        } else {
            block = {
                height: parseInt(height),
                solo: false,
                address: '',
                hash: parts[0],
                time: parts[1],
                difficulty: parseInt(parts[2]),
                shares: parseInt(parts[3]),
                orphaned: parts[4],
                reward: parts[5]
            };
        }

        let toGo = stats.config.depth - (stats.network.height - block.height - 1);
        if (toGo > 1) {
            block.maturity = toGo + ' to go';
        } else if (toGo === 1) {
            block.maturity = "<i class='fa fa-spinner fa-spin'></i>";
        } else if (toGo <= 0) {
            block.maturity = "<i class='fa fa-unlock-alt'></i>";
        }

        switch (block.orphaned) {
            case '0':
                block.status = 'unlocked';
                block.maturity = "<i class='fa fa-unlock-alt'></i>";
                break;
            case '1':
                block.status = 'orphaned';
                block.maturity = "<i class='fa fa-times'></i>";
                block.reward = 0;
                break;
            default:
                block.status = 'pending';
                break;
        }
        return block;
    };


    $.blocksSetup = function(api, stats, xhrGetBlocks) {
        $(`#loadMoreBlocks${stats.config.coin}`).click(function (xhrGetBlocks) {
            if (xhrGetBlocks[stats.config.coin]) xhrGetBlocks[stats.config.coin].abort();
            xhrGetBlocks[stats.config.coin] = $.ajax({
                url: api + '/get_blocks',
                data: {
                    height: $(`#blocksReport${stats.config.coin}_rows`).children().last().data(`height`)
                },
                dataType: 'json',
                cache: 'false',
                success: function (data) {
                    $.blocksRenderBlocks(data, stats);
                }
            });
        });
    };


    $.blocksRunOnce = function () {
        $('#blocksTabs a').click(function (e) {
            e.preventDefault();
            $(this).tab('show');
        });
        return true;
    };
})(jQuery);
