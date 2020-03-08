(function ($) {
    let isRunOnce = false;
    let isTopPageInit = false;
    let xhrGetMiners = {};

    $(function () {
        currentPage = {
            destroy: function () {},
            update: function (updateKey) {
                if (isTopPageInit) {
                    $.updateTop(updateKey);
                }
            }
        };

        let isReadyStats = setInterval(function () {
            if (lastStats) {
                $.topInitTemplate(xhrGetMiners, isRunOnce);
                $.loadTranslations();

                clearInterval(isReadyStats);
            }
        }, 10);
    });


    $.updateTop = function (updateKey) {
        let endPoint = updateKey === parentCoin ? api : mergedApis[updateKey] ? mergedApis[updateKey].api : null;
        if (endPoint) {
            $.topUpdateTop10(xhrGetMiners, endPoint, updateKey);
        }
    };


    $.topInitTemplate = function(xhrGetMiners, runOnce) {
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
            $.topUpdateTop10(xhrGetMiners, api, coin);
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
                $.topUpdateTop10(xhrGetMiners, mergedApis[key].api, key);
            }
        });

        $.sortElementList($(`#blocksTabs`), $(`#blocksTabs > li`), mergedStats);
        if (!runOnce) {
            isRunOnce = $.topRunOnce();
        }

        isTopPageInit = true;
    };


    $.topUpdateTop10 = function(xhrGetMiners, endPoint, key) {
        if (xhrGetMiners[key])
            xhrGetMiners[key].abort();

        xhrGetMiners[key] = $.ajax({
            url: `${endPoint}/get_top10miners`,
            data: {
                time: $(`#top10_rows${key}`).children().last().data('time')
            },
            dataType: 'json',
            cache: 'false',
            success: function (data) {
                if (!data) return;

                let topRow = $(`#top10miners_rows${key}`);

                topRow.empty();
                for (let i = 0; i < data.length; ++i) {
                    topRow.append('<tr>' + $.topGetMinerCells(i + 1, data[i]) + '</tr>');
                }
            }
        });
    };
    
    
    $.topGetMinerCells = function(position, data) {
        let miner = data.miner;
        let hashrate = data.hashrate ? data.hashrate : 0;
        let lastShare = data.lastShare ? data.lastShare : 0;
        let hashes = (data.hashes || 0).toString();

        return '<td data-sort="' + position + '">' + position + '</td>' +
            '<th data-sort="' + miner + '">' + miner + '</th>' +
            '<td class="text-right" data-sort="' + hashrate + '">' + $.getReadableHashRateString(hashrate) + '/sec</td>' +
            '<td class="text-right" data-sort="' + lastShare + '">' + (lastShare ? $.timeago(new Date(parseInt(lastShare) * 1000).toISOString()) : 'Never') + '</td>' +
            '<td class="text-right" data-sort="' + hashes + '">' + $.formatNumber(hashes, ',') + '</td>';
    };


    $.topRunOnce = function () {
        $('#blocksTabs a').click(function (e) {
            e.preventDefault();
            $(this).tab('show');
        });
        return true;
    };
})(jQuery);