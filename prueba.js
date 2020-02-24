var urls = ['https://cruises.bookits.club/web/cruises/results.aspx'];

page.onConsoleMessage = function (msg) {
    if(msg.indexOf('SCRAPE-RESULT:') >= 0) {

        var fn = 'file_name_to_write_to.txt';
        console.log('writing file', fn)
        fs.write(fn, msg.replace('SCRAPE-RESULT:', ''), 'w');

    }
    else if(msg.indexOf('SCRAPE-INFO:') >= 0)
        console.log(msg)
};

function do_page(url, callback) {

    console.log('starting', url)

    page.open(url, function (status) {

        if (status === 'fail') {

            console.log('failed, thats all i know');
            page.close();
            phantom.exit();

        } else {

            console.log('got page')

            var result =  page.evaluate(function () {

                (function(open) {
                    XMLHttpRequest.prototype.open = function(method, url, async, user, pass) {
                        this.addEventListener("readystatechange", function() {
                            if (this.readyState === 4) {
                                console.log('SCRAPE-INFO: Successful ajax: '+url)
                                console.log('SCRAPE-RESULT: ' + this.responseText)
                            }
                        }, false);
                        open.call(this, method, url, async, user, pass);
                    };
                })(XMLHttpRequest.prototype.open);

                // do your page stuff here that makes ajax requests
                // $('div#team-squad-stats-summary-filter-field a[data-source=0]').click();

                return true;

            });

            setTimeout(function() {
                fs.write('complete_page_filename.html', page.content, 'w');
                console.log('done')
                callback.apply();
            }, 4000);

        }

    });

}

function process() {

    if (urls.length > 0) {

        var u = urls[0];
        urls.splice(0, 1);
        do_page(u, process);

    } else {

        console.log('all done');
        page.close();
        phantom.exit();

    }
}

process();
