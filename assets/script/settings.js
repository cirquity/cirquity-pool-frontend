(function ($) {
    let isRunOnce = false;

    $(function () {
        currentPage = {
            destroy: function () {},
            update: function (updateKey) {
                $.updateSettings(updateKey);
            }
        };

        let isReadyStats = setInterval(function () {
            if (lastStats) {
                $.settingsInitTemplate(isRunOnce);
                $.loadTranslations();

                clearInterval(isReadyStats);
            }
        }, 10);
    });


    $.updateSettings = function (updateKey) {};


    $.settingsInitTemplate = function(runOnce) {
        if (!lastStats.config.sendEmails) {
            $(`#emailNotifications${lastStats.config.coin}`).hide();
        }

        let coin = lastStats.config.coin;
        let template = $('#siblingTemplate').html();
        if ($(`#blocksTabs li:contains(${coin})`).length === 0) {
            Mustache.parse(template);
            let rendered = Mustache.render(template, {
                coin: coin,
                active: 'active'
            });
            $('#blocksContent').append(rendered);

            template = $('#siblingTabTemplate').html();
            Mustache.parse(template);
            rendered = Mustache.render(template, {
                coin: lastStats.config.coin,
                symbol: `(${lastStats.config.symbol})`,
                active: 'active'
            });
            $('#blocksTabs').append(rendered);
            $.settingsSetup(api, lastStats);
        }

        Object.keys(mergedStats).forEach(key => {
            if ($(`#blocksTabs li:contains(${key})`).length === 0) {
                if (!mergedStats[key].config.sendEmails)
                    $(`#emailNotifications${mergedStats[key].config.coin}`).hide();
                template = $('#siblingTemplate').html();
                Mustache.parse(template);
                let rendered = Mustache.render(template, {
                    coin: key
                });
                $('#blocksContent').append(rendered);

                template = $('#siblingTabTemplate').html();
                Mustache.parse(template);
                rendered = Mustache.render(template, {
                    coin: key,
                    symbol: `(${mergedStats[key].config.symbol})`
                });
                $('#blocksTabs').append(rendered);

                $.settingsSetup(mergedApis[key].api, mergedStats[key])
            }
        });
        $.sortElementList($(`#blocksTabs`), $(`#blocksTabs > li`), mergedStats);
        if (!runOnce) {
            isRunOnce = $.settingsRunOnce();
        }
    };
    
    
    $.settingsSetup = function(api, stats) {
        let address = $.getCurrentAddress(stats.config.coin);
        if (address) {
            $(`#yourAddress${stats.config.coin}`).val(address);
            $.settingsGetPayoutLevel(api, address, stats);
            $.settingsGetEmailAddress(api, address, stats);
        }

        // Handle click on Set button
        $(`#payoutSetButton${stats.config.coin}`).click(function () {
            let address = $(`#yourAddress${stats.config.coin}`).val().trim();
            if (!address || address === '') {
                $.settingsShowError('noMinerAddress', 'No miner address specified', '', stats);
                return;
            }

            let ip = $(`#yourIP${stats.config.coin}`).val().trim();
            if (!ip || ip === '') {
                $.settingsShowError('noMinerIP', 'No miner IP address specified', '', stats);
                return;
            }

            let level = $(`#yourPayoutRate${stats.config.coin}`).val().trim();
            if (!level || level < 0) {
                $.settingsShowError('noPayoutLevel', 'No payout level specified', '', stats);
                return;
            }

            $.settingsGetPayoutLevel(api, address, ip, level, stats);
        });

        // Handle click on Enable button
        $(`#enableButton${stats.config.coin}`).click(function () {
            let address = $(`#yourAddress${stats.config.coin}`).val().trim();
            let ip = $(`#yourIP${stats.config.coin}`).val().trim();
            let email = $(`#yourEmail${stats.config.coin}`).val();
            $.settingsSetEmailNotifications(stats, api, email, address, ip, true);
        });

        // Handle click on Disable button
        $(`#disableButton${stats.config.coin}`).click(function () {
            let address = $(`#yourAddress${stats.config.coin}`).val().trim();
            let ip = $(`#yourIP${stats.config.coin}`).val().trim();
            let email = $(`#yourEmail${stats.config.coin}`).val();
            $.settingsSetEmailNotifications(stats, api, email, address, ip, false);
        });
    };


    $.settingsGetPayoutLevel = function(api, address, stats) {
        if (!address || address === '')
            return;

        $.ajax({
            url: `${api}/get_miner_payout_level`,
            data: {
                address: address
            },
            dataType: 'json',
            cache: 'false'
        }).done(function (data) {
            if (data.level !== undefined) {
                $(`#yourPayoutRate${stats.config.coin}`).val(data.level);
            }
        });
    };


    $.settingsGetEmailAddress = function(endPoint, address, stats) {
        if (!address || address === '') return;

        $.ajax({
            url: `${endPoint}/get_email_notifications`,
            data: {
                address: address
            },
            dataType: 'json',
            cache: 'false'
        }).done(function (data) {
            if (data.email !== undefined) {
                $(`#yourEmail${stats.config.coin}`).val(data.email);
            }
        });
    };
    
    
    $.settingsSetEmailNotifications = function (stats, endPoint, email, address, ip, enable) {
        if (!address || address === '') {
            $.settingsShowError('noMinerAddress', 'No miner address specified', null, stats);
            return;
        }

        if (!ip || ip === '') {
            $.settingsShowError('noMinerIP', 'No miner IP address specified', null, stats);
            return;
        }

        if (enable && !email) {
            $.settingsShowError('noEmail', 'No email address specified', null, stats);
            return;
        }
        if (enable && !$.isEmail(email)) {
            $.settingsShowError('invalidEmail', 'Invalid email address specified', null, stats);
            return;
        }

        $.ajax({
            url: `${endPoint}/set_email_notifications`,
            data: {
                address: address,
                ip: ip,
                email: email,
                action: enable ? 'enable' : 'disable'
            },
            dataType: 'json',
            cache: 'false'
        }).done(function (data) {
            if (data.status === "done") {
                if (enable) {
                    $.settingsShowSuccess('notificationEnabled', 'Done! Email notifications have been enabled', stats);
                } else {
                    $.settingsShowSuccess('notificationDisabled', 'Done! Email notifications have been disabled', stats);
                }
            } else {
                $.settingsShowError('error', 'Error:', data.status, stats);
            }
        });
    };


    $.settingsShowSuccess = function(id, message, stats) {
        if ($.getTranslation(id)) {
            message = $.getTranslation(id);
        }

        $(`#action_update_message${stats.config.coin}`).text(message).removeClass().addClass('alert alert-success');
    };
    
    
    $.settingsShowError = function(id, message, extra, stats) {
        if ($.getTranslation(id)) {
            message = $.getTranslation(id);
        }
        
        message = message.trim();
        
        if (extra) {
            message += ' ' + extra;
        }
        
        $(`#action_update_message${stats.config.coin}`).text(message).removeClass().addClass('alert alert-danger');
    };


    $.settingsRunOnce = function () {
        $('#blocksTabs a').click(function (e) {
            e.preventDefault();
            $(this).tab('show');
        });
        return true;
    };
})(jQuery);