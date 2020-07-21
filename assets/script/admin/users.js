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
                $.createUserTable();
                $.loadTranslations();

                clearInterval(isReadyStats);
            }
        }, 10);
    });

    $.parseUsers = function (wallets) {
        let totalUsers = 0;
        let walletsArray = [];
        let properObject = {};

        for (let wallet in wallets) {
            if (wallets.hasOwnProperty(wallet)) {
                let userData = wallets[wallet];
                walletsArray.push({
                    coin: lastStats.config.coin,
                    miner: wallet,
                    minerLabel: $.truncate(wallet, 40),
                    wallet: userData,
                    timeago: $.timeago(new Date(userData.lastShare * 1000).toISOString()),
                    readablePending: $.getReadableCoin(lastStats, userData.pending, null, true),
                    readablePaid: $.getReadableCoin(lastStats, userData.paid, null, true),
                    readableHashrate: $.getReadableHashRateString(userData.hashrate) + '/s',
                    readableHashes: $.getReadableHashRateString(userData.hashes)
                });
                totalUsers++;
            }
        }
        $('#totalUsers').html(totalUsers);

        properObject['users'] = walletsArray.sort(function (a, b) {
            return a.wallet.hashrate - b.wallet.hashrate
        }).reverse();

        return properObject;
    };


    $.createUserTable = function (promptPassword) {
        let password = docCookies.getItem('password');

        if (!password || promptPassword) {
            password = prompt('Enter admin password');
        }

        $.ajax({
            url: api + '/admin_users',
            data: {password: password},
            dataType: 'json',
            cache: false,
            success: function (data) {
                docCookies.setItem('password', password, Infinity);
                $.renderAdminTemplate($.parseUsers(data), '#usersListTable', '#template');
            },
            error: function (e) {
                docCookies.removeItem('password');
            }
        });
    };
})(jQuery);
