importScripts('idb.js');
var cacheID = "mws-001";


var dbPromise = idb.open('restaurants-db', 1, function (upgradeDb) {
    console.log('making a new object store');
    if (!upgradeDb.objectStoreNames.contains('restaurants')) {
        upgradeDb.createObjectStore('restaurants', { keyPath: 'id' });
    }
});



self.addEventListener("install", event => {
    event.waitUntil(
        caches.open(cacheID)
            .then(cache => {
                return cache.addAll([
                    `/`,
                    `/index.html`,
                    `/restaurant.html`,
                    `/css/styles.css`,
                    `/js/main.js`,
                    `/js/restaurant_info.js`,
                    `/js/dbhelper.js`,
                    `/js/register.js`,
                    `/sw.js`,
                    `/idb.js`
                ])
                    .then(() => self.skipWaiting());
            })
    );
});



self.addEventListener('activate', event => {
    event.waitUntil(self.clients.claim());
});



self.addEventListener('fetch', event => {
    let requestURL = event.request.url;
    if (requestURL.includes('1337')) {
        //console.log('AJAX data requested');
        HandleAJAXEvent(event);
    }
    else {
        //console.log('Cache data requested');
        HandleCacheEvent(event);
    }
});



const HandleAJAXEvent = (event) => {
    event.respondWith(
        dbPromise
            .then(db => {
                return db.transaction('restaurants').objectStore('restaurants').get(1).value;
            })
            .then(data => {
                if (data) {
                    return data;
                }
                else {
                    return (fetch(event.request))
                        .then(fetchResponse => fetchResponse.json())
                        .then(json => {
                            return dbPromise.then(db => {
                                var tx = db.transaction('restaurants', 'readwrite');
                                tx.objectStore('restaurants').put({id: 1, value: json});
                                return json;
                            })
                        })
                }
            })
            .then(finalResponse => {
                return new Response(JSON.stringify(finalResponse));
            })
            .catch(error => {
                return new Response('Error Bringing AJAX data', {status: 500});
            })
    );
};



const HandleCacheEvent = (event) => {
    event.respondWith(
        caches.open(cacheID).then(cache => {
            return cache.match(event.request)
                .then(response => {
                    return response || fetch(event.request)
                        .then(response => {
                            let requestURL = event.request.url;
                            if (requestURL.includes('.jpg') || requestURL.includes('.html')) {
                                cache.put(event.request, response.clone());
                            }
                            return response;
                        })
                        .catch(error => {
                            return new Response('No internet and item not cached',
                                { status: 404, statusText: 'No internet and item not cached' });
                        })
                });
        })
    );
};