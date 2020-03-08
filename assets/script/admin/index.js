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
                $.getStats();
                $.createPortsTable();
                $.loadTranslations();

                clearInterval(isReadyStats);
            }
        }, 10);

        $('#testEmailButton').click(function () {
            let password = docCookies.getItem('password');

            if (!password) {
                password = prompt('Enter admin password');
            }

            let email = $('#emailAddress').val().trim();
            if (!email) {
                $.showErrorTest('email', 'No email address specified');
                return;
            }
            if (!$.isEmailTest(email)) {
                $.showErrorTest('invalidEmail', 'Invalid email address specified');
                return;
            }

            $.ajax({
                url: api + '/test_email_notification',
                data: {
                    password: password,
                    email: email
                },
                dataType: 'json',
                cache: 'false'
            }).done(function (data) {
                docCookies.setItem('password', password, Infinity);
                if (data.status === "done") {
                    $.showSuccessTest('email', 'Done! Test is successful.');
                } else {
                    $.showErrorTest('email', 'Error: ' + data.status);
                }
            });
        });

        $('#testTelegramButton').click(function () {
            let password = docCookies.getItem('password');

            if (!password) {
                password = prompt('Enter admin password');
            }

            $.ajax({
                url: api + '/test_telegram_notification',
                data: {
                    password: password,
                },
                dataType: 'json',
                cache: 'false'
            }).done(function (data) {
                docCookies.setItem('password', password, Infinity);
                if (data.status === "done") {
                    $.showSuccessTest('telegram', 'Test done! Check pool logs for more debugging information.');
                } else {
                    $.showErrorTest('telegram', 'Error: ' + data.status);
                }
            });
        });

    });

    $.formatLuckStats = function (difficulty, shares) {
        let percent = Math.round(shares / difficulty * 100);
        if (!percent) {
            return '<span class="text-success">?</span>';
        } else if (percent <= 100) {
            return '<span class="text-success">' + percent + '%</span>';
        } else if (percent >= 101 && percent <= 150) {
            return '<span class="text-info">' + percent + '%</span>';
        } else {
            return '<span class="text-danger">' + percent + '%</span>';
        }
    };

    $.getStats = function (promptPassword) {
        let password = docCookies.getItem('password');

        if (!password || promptPassword) {
            password = prompt('Enter admin password');
        }

        $('#loading').show();
        $.ajax({
            url: api + '/admin_stats',
            data: {password: password},
            dataType: 'json',
            cache: 'false',
            success: function (data) {
                docCookies.setItem('password', password, Infinity);
                $('#loading').hide();
                $.renderData(data);
            },
            error: function (e) {
                docCookies.removeItem('password');
                $.getStats(true);
            }
        });
    };

    $.renderData = function (data) {
        $('#totalOwed').text($.getReadableCoin(lastStats, data.totalOwed));
        $('#totalPaid').text($.getReadableCoin(lastStats, data.totalPaid));
        $('#totalMined').text($.getReadableCoin(lastStats, (data.totalRevenue + data.totalRevenueSolo)));
        $('#profit').text($.getReadableCoin(lastStats, (data.totalRevenue + data.totalRevenueSolo) - data.totalOwed - data.totalPaid));
        $('#blocksUnlocked').text(data.blocksUnlocked);
        $('#averageLuck').html($.formatLuckStats(data.totalDiff, data.totalShares));
        $('#blocksOrphaned').text(data.blocksOrphaned);
        $('#orphanPercent').text((data.blocksOrphaned / data.blocksUnlocked * 100).toFixed(2) + '%');
        $('#registeredAddresses').text(data.totalWorkers);
    };


    $.parsePorts = function (ports) {
        let totalUsers = 0;
        let portsArray = [];
        let properObject = {};
        for (let port in ports) {
            if (ports.hasOwnProperty(port)) {
                let portsData = ports[port];
                let usersCount = portsData.users ? parseInt(portsData.users) : 0;
                if (usersCount > 0) {
                    portsArray.push({
                        port: portsData.port,
                        users: usersCount
                    });
                    totalUsers += usersCount;
                }
            }
        }
        $('#totalUsers').html(totalUsers);

        properObject['ports'] = portsArray.sort(function (a, b) {
            return a.port.port - b.port.port
        }).reverse();

        return properObject;
    };

    $.createPortsTable = function (promptPassword) {
        let password = docCookies.getItem('password');

        if (!password || promptPassword) {
            password = prompt('Enter admin password');
        }

        $.ajax({
            url: api + '/admin_ports',
            data: {password: password},
            cache: false,
            dataType: 'json',
            success: function (data) {
                docCookies.setItem('password', password, Infinity);
                $.renderAdminTemplate($.parsePorts(data), '#portsListTable', '#template');
            },
            error: function (e) {
                docCookies.removeItem('password');
            }
        });
    };


    $.showErrorTest = function (testId, message) {
        $('#test_' + testId + '_message').text(message).removeClass().addClass('alert alert-danger mt-5');
    };


    $.showSuccessTest = function (testId, message) {
        $('#test_' + testId + '_message').text(message).removeClass().addClass('alert alert-success mt-5');
    };


    $.isEmailTest = function (email) {
        let regex = /^([a-zA-Z0-9_.+-])+\@(([a-zA-Z0-9-])+\.)+([a-zA-Z0-9]{2,4})+$/;
        return regex.test(email);
    };
})(jQuery);