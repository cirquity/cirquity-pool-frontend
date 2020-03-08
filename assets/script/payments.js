(function ($) {
    let isRunOnce = false;
    let isPaymentsPageInit = false;
    let xhrGetPayments = {};

    $(function () {
        currentPage = {
            destroy: function () {},
            update: function (updateKey) {
                if (isPaymentsPageInit) {
                    $.updatePayments(updateKey);
                }
            }
        };

        let isReadyStats = setInterval(function () {
            if (lastStats) {
                $.paymentsInitTemplate(xhrGetPayments, isRunOnce);
                $.loadTranslations();

                clearInterval(isReadyStats);
            }
        }, 10);
    });


    $.updatePayments = function (updateKey) {
        let stats = updateKey === parentCoin ? lastStats : mergedStats[updateKey];
        if (stats) {
            $.updateText(`paymentsTotal${updateKey}`, stats.pool.totalPayments.toString());
            $.updateText(`paymentsTotalPaid${updateKey}`, stats.pool.totalMinersPaid.toString());
            $.updateText(`paymentsInterval${updateKey}`, $.getReadableTime(stats.config.paymentsInterval));
            $.updateText(`paymentsMinimum${updateKey}`, $.getReadableCoin(stats, stats.config.minPaymentThreshold));
            $.updateText(`paymentsDenomination${updateKey}`, $.getReadableCoin(stats, stats.config.denominationUnit, 3));
            $.paymentsRenderPayments(stats.pool.payments, stats);
        }
    };


    $.paymentsInitTemplate = function(xhrGetPayments, runOnce) {
        let coin = lastStats.config.coin;
        if ($(`#blocksTabs li:contains(${coin})`).length === 0) {
            let template1 = $('#siblingTemplate').html();
            Mustache.parse(template1);
            let rendered1 = Mustache.render(template1, {
                coin: coin,
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

            $.paymentsSetup(xhrGetPayments, api, lastStats);
        }
        $.updateText(`paymentsTotal${coin}`, lastStats.pool.totalPayments.toString());
        $.updateText(`paymentsTotalPaid${coin}`, lastStats.pool.totalMinersPaid.toString());
        $.updateText(`paymentsInterval${coin}`, $.getReadableTime(lastStats.config.paymentsInterval));
        $.updateText(`paymentsMinimum${coin}`, $.getReadableCoin(lastStats, lastStats.config.minPaymentThreshold));
        $.updateText(`paymentsDenomination${coin}`, $.getReadableCoin(lastStats, lastStats.config.denominationUnit, 3));
        $.paymentsRenderPayments(lastStats.pool.payments, lastStats);

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

                $.paymentsSetup(xhrGetPayments, mergedApis[key].api, mergedStats[key])
            }

            $.updateText(`paymentsTotal${key}`, mergedStats[key].pool.totalPayments.toString());
            $.updateText(`paymentsTotalPaid${key}`, mergedStats[key].pool.totalMinersPaid.toString());
            $.updateText(`paymentsInterval${key}`, $.getReadableTime(mergedStats[key].config.paymentsInterval));
            $.updateText(`paymentsMinimum${key}`, $.getReadableCoin(mergedStats[key], mergedStats[key].config.minPaymentThreshold));
            $.updateText(`paymentsDenomination${key}`, $.getReadableCoin(mergedStats[key], mergedStats[key].config.denominationUnit, 3));
            $.paymentsRenderPayments(mergedStats[key].pool.payments, mergedStats[key]);
        });
        $.sortElementList($(`#blocksTabs`), $(`#blocksTabs > li`), mergedStats);
        if (!runOnce) {
            isRunOnce = $.paymentRunOnce();
        }

        isPaymentsPageInit = true;
    };
    
    
    $.paymentsRenderPayments = function(paymentsResults, stats) {
        let $paymentsRows = $(`#paymentsReport${stats.config.coin}_rows`);
        for (let i = 0; i < paymentsResults.length; i += 2) {
            let payment = $.paymentsParsePayment(paymentsResults[i + 1], paymentsResults[i]);
            let paymentJson = JSON.stringify(payment);
            let existingRow = document.getElementById(`paymentRow${stats.config.coin}${payment.time}`);

            if (existingRow && existingRow.getAttribute(`data-json`) !== paymentJson) {
                $(existingRow).replaceWith($.paymentsGetPaymentRowElement(payment, paymentJson, stats));
            } else if (!existingRow) {
                let paymentElement = $.paymentsGetPaymentRowElement(payment, paymentJson, stats);
                let inserted = false;
                let rows = $paymentsRows.children().get();
                for (let f = 0; f < rows.length; f++) {
                    let pTime = parseInt(rows[f].getAttribute(`data-time`));
                    if (pTime < payment.time) {
                        inserted = true;
                        $(rows[f]).before(paymentElement);
                        break;
                    }
                }
                if (!inserted) {
                    $paymentsRows.append(paymentElement);
                }
            }
        }
    };
    
    
    $.paymentsParsePayment = function(time, serializedPayment) {
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


    $.paymentsGetPaymentRowElement = function(payment, jsonString, stats) {
        let row = document.createElement('tr');
        row.setAttribute(`data-json`, jsonString);
        row.setAttribute(`data-time`, payment.time);
        row.setAttribute('id', `paymentRow${stats.config.coin}${payment.time}`);

        row.innerHTML = $.paymentsGetPaymentCells(payment, stats);

        return row;
    };


    $.paymentsGetPaymentCells = function(payment, stats) {
        return '<td class="col1">' + $.timeago(new Date(parseInt(payment.time) * 1000).toISOString()) + '</td>' +
            '<th class="col2">' + $.formatPaymentLink(payment.hash, stats) + '</th>' +
            '<td class="col3">' + ($.getReadableCoin(stats, payment.amount)) + '</td>' +
            '<td class="col4">' + ($.getReadableCoin(stats, payment.fee)) + '</td>' +
            '<td class="col5">' + payment.mixin + '</td>' +
            '<td class="col6">' + payment.recipients + '</td>';
    };


    $.paymentsSetup = function(xhrGetPayments, api, stats) {
        $(`#loadMorePayments${stats.config.coin}`).click(function () {
            if (xhrGetPayments[stats.config.coin]) xhrGetPayments[stats.config.coin].abort();
            xhrGetPayments[stats.config.coin] = $.ajax({
                url: api + '/get_payments',
                data: {
                    time: $(`#paymentsReport${stats.config.coin}_rows`).children().last().data(`time`)
                },
                dataType: 'json',
                cache: 'false',
                success: function (data) {
                    $.paymentsRenderPayments(data, stats);
                }
            });
        });
    };


    $.paymentRunOnce = function () {
        $('#blocksTabs a').click(function (e) {
            e.preventDefault();
            $(this).tab('show');
        });
        return true;
    };
})(jQuery);