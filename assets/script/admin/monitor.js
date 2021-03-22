(function ($) {
    $(function () {
        currentPage = {
            destroy: function () {
            },
            update: function (updateKey) {
            }
        };

        let isReadyStats = setInterval(function () {
            if (lastStats) {
                $.renderLogInfo();
                $.loadTranslations();

                clearInterval(isReadyStats);
            }
        }, 10);
    });

    $.getCheckTime = function (timestamp) {
        return timestamp ? $.timeago(new Date(timestamp * 1000).toISOString()) : null;
    };

    $.monitoringInfoParse = function (data) {
        console.log(data);
        let monitoringDaemon = {
            lastCheck: $.getCheckTime(data['monitoring'].daemon.lastCheck) || 'never',
            lastStatus: data['monitoring'].daemon.lastStatus || '',
            lastFail: $.getCheckTime(data['monitoring'].daemon.lastFail) || 'never',
            lastFailResponse: (data['monitoring'].daemon.lastFailResponse ? JSON.stringify(JSON.parse(data['monitoring'].daemon.lastFailResponse),null,4) || ' ' : ''),
            lastResponse: JSON.stringify(JSON.parse(data['monitoring'].daemon.lastResponse),null,4) || ' '
        };

        let monitoringWallet = {
            lastCheck: $.getCheckTime(data['monitoring'].wallet.lastCheck) || 'never',
            lastStatus: data['monitoring'].wallet.lastStatus || '',
            lastFail: $.getCheckTime(data['monitoring'].wallet.lastFail) || 'never',
            lastFailResponse: (data['monitoring'].daemon.lastFailResponse ? JSON.stringify(JSON.parse(data['monitoring'].wallet.lastFailResponse),null,4) || ' ' : ''),
            lastResponse: JSON.stringify(JSON.parse(data['monitoring'].wallet.lastResponse),null,4) || ' '
        };

        let properData = {};

        if (data.hasOwnProperty('logs')) {
            const regCamelCase = /([A-Z])([A-Z])([a-z])|([a-z])([A-Z])/g;
            const regSpecialCh = /[^a-zA-Z0-9]/g;
            properData['logs'] = data['logs'];
            for (let log in data['logs']) {
                data['logs'][log].name = $.titleCase(log.replace('.log', '').replace(regSpecialCh, ' ').replace(regCamelCase, '$1$4 $2$3$5'));
                data['logs'][log].changed = $.formatDate(data['logs'][log].changed);
                data['logs'][log].link = api + '/admin_log?file=' + log + '&password=' + docCookies.getItem('password');
            }
        }
        properData['monitoringDaemon'] = monitoringDaemon;
        properData['monitoringWallet'] = monitoringWallet;

        return properData;
    };

    $.renderLogInfo = function (promptPassword) {
        let password = docCookies.getItem('password');

        if (!password || promptPassword) {
            password = prompt('Enter admin password');
        }

        $.ajax({
            url: api + '/admin_monitoring',
            data: {password: password},
            dataType: 'json',
            cache: false,
            success: function (data) {
                docCookies.setItem('password', password, Infinity);
                $.renderAdminTemplate($.monitoringInfoParse(data), '#monitoringInfo', '#monitoringInfoView');

                $('#daemonStatus').addClass(data['monitoring'].daemon.lastStatus === 'ok' ? 'text-success' : 'text-danger');
                $('#walletStatus').addClass(data['monitoring'].wallet.lastStatus === 'ok' ? 'text-success' : 'text-danger');

                $('#logTable th.sort').on('click', $.sortTable);
            },
            error: function (e) {
                docCookies.removeItem('password');
            }
        });
    };
})(jQuery);
